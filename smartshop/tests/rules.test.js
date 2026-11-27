const fs = require('fs');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const ADMIN = { uid: 'admin', email: 'alon.gadi@gmail.com' };
const MGR = { uid: 'mgr', email: 'Dani.Cohen@gmail.com' };   // mixed case + dots on purpose
const MGR2 = { uid: 'mgr2', email: 'other@x.com' };
const B = { uid: 'bob', email: 'bob@x.com' };
const C = { uid: 'carol', email: 'carol@x.com' };
const Z = { uid: 'zed', email: 'zed@x.com' };            // stranger
const O = { uid: 'olga', email: 'olga@x.com' };          // member of the other group
const key = e => e.toLowerCase().replace(/\./g, ',');

const G = 'g_aaaaaaaaaaaa';
const G2 = 'g_bbbbbbbbbbbb';
const TOK = 'a'.repeat(32);
const TOK2 = 'b'.repeat(32);
const L1 = 'sl_111111111111';
const L2 = 'sl_222222222222';
const L3 = 'sl_333333333333';

let env, pass = 0, fail = 0;
const results = [];
async function t(name, fn) {
  try { await fn(); pass++; results.push('  ok   ' + name); }
  catch (e) { fail++; results.push('  FAIL ' + name + ' :: ' + (e && e.message || e).toString().slice(0, 200)); }
}
const db = u => env.authenticatedContext(u.uid, { email: u.email, email_verified: true }).database();
const R = (u, p) => db(u).ref(p === undefined ? 'smartshop' : 'smartshop/' + p);
const prof = () => ({ name: 'x', email: 'x@x.com', ts: Date.now() });
const seed = async (data) => env.withSecurityRulesDisabled(async c => { await c.database().ref('smartshop').update(data); });
const get = async p => { let v; await env.withSecurityRulesDisabled(async c => { v = (await c.database().ref('smartshop/' + p).once('value')).val(); }); return v; };

function createListUpd(u, id, n, group) {
  const now = Date.now();
  return {
    [id + '/meta']: { owner: u.uid, group, name: 'רשימה', createdAt: now },
    [id + '/members/' + u.uid]: { ts: now },
    ['users/' + u.uid + '/owned/' + id]: true,
    ['users/' + u.uid + '/ownedCount']: n + 1,
    ['users/' + u.uid + '/ownedOp']: id,
    ['users/' + u.uid + '/lists/' + id]: { name: 'רשימה', last: now }
  };
}
function joinUpd(u, gid, token, cnt) {
  return {
    ['groups/' + gid + '/joins/' + u.uid]: token,
    ['groups/' + gid + '/members/' + u.uid]: prof(),
    ['groups/' + gid + '/memberCount']: cnt + 1,
    ['users/' + u.uid + '/group']: gid
  };
}
function newGroupUpd(u, gid) {
  return {
    ['groups/' + gid]: { owner: u.uid, ownerKey: key(u.email), name: 'קבוצה', inviteToken: TOK, memberCount: 1, members: { [u.uid]: prof() } },
    ['users/' + u.uid + '/group']: gid
  };
}

(async () => {
  env = await initializeTestEnvironment({
    projectId: 'smartshop-test',
    database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync('database.rules.json', 'utf8') }
  });

  // ---------- managers ----------
  await t('admin can appoint a manager', () => assertSucceeds(R(ADMIN, 'managers/' + key(MGR.email)).set({ email: MGR.email.toLowerCase(), ts: 1 })));
  await t('non-admin cannot appoint a manager', () => assertFails(R(B, 'managers/' + key(B.email)).set({ email: B.email, ts: 1 })));
  await t('manager can read own manager record', () => assertSucceeds(R(MGR, 'managers/' + key(MGR.email)).once('value')));
  await t('user cannot list managers', () => assertFails(R(B, 'managers').once('value')));
  await seed({ ['managers/' + key(MGR2.email)]: { email: MGR2.email, ts: 1 } });

  // ---------- group creation ----------
  await t('stranger cannot create a group', () => assertFails(R(Z).update(newGroupUpd(Z, 'g_cccccccccccc'))));
  await t('manager creates group', () => assertSucceeds(R(MGR).update(newGroupUpd(MGR, G))));
  await t('manager cannot create a second group', () => assertFails(R(MGR).update(newGroupUpd(MGR, 'g_dddddddddddd'))));
  await t('manager2 creates group 2', () => assertSucceeds(R(MGR2).update(newGroupUpd(MGR2, G2))));
  await seed({ ['groups/' + G2 + '/inviteToken']: TOK2 });
  await t('group creation with extra member is refused', async () => {
    await seed({ ['managers/' + key(Z.email)]: { email: Z.email, ts: 1 } });
    const u = newGroupUpd(Z, 'g_eeeeeeeeeeee');
    u['groups/g_eeeeeeeeeeee'].members[B.uid] = prof();
    u['groups/g_eeeeeeeeeeee'].memberCount = 1;
    await assertFails(R(Z).update(u));
    await seed({ ['managers/' + key(Z.email)]: null });
  });

  // ---------- joining ----------
  await t('join with wrong token fails', () => assertFails(R(B).update(joinUpd(B, G, 'f'.repeat(32), 1))));
  await t('join without count increment fails', () => assertFails(R(B).update(joinUpd(B, G, TOK, 0))));
  await t('join without setting users/group fails', async () => {
    const u = joinUpd(B, G, TOK, 1); delete u['users/' + B.uid + '/group'];
    await assertFails(R(B).update(u));
  });
  await t('stranger can read memberCount (needed to join)', () => assertSucceeds(R(B, 'groups/' + G + '/memberCount').once('value')));
  await t('B joins with the right token', () => assertSucceeds(R(B).update(joinUpd(B, G, TOK, 1))));
  await t('C joins', () => assertSucceeds(R(C).update(joinUpd(C, G, TOK, 2))));
  await t('O joins group 2', () => assertSucceeds(R(O).update(joinUpd(O, G2, TOK2, 1))));
  await t('O cannot join a second group', () => assertFails(R(O).update(joinUpd(O, G, TOK, 3))));
  await t('member reads roster', () => assertSucceeds(R(B, 'groups/' + G + '/members').once('value')));
  await t('member cannot read invite token', () => assertFails(R(B, 'groups/' + G + '/inviteToken').once('value')));
  await t('member cannot read whole group', () => assertFails(R(B, 'groups/' + G).once('value')));
  await t('outsider cannot read roster', () => assertFails(R(O, 'groups/' + G + '/members').once('value')));
  await t('owner reads whole group', () => assertSucceeds(R(MGR, 'groups/' + G).once('value')));
  await t('member updates own profile', () => assertSucceeds(R(B, 'groups/' + G + '/members/' + B.uid).update({ name: 'Bob' })));
  await t('member cannot edit another member profile', () => assertFails(R(B, 'groups/' + G + '/members/' + C.uid).update({ name: 'hacked' })));
  await t('owner cannot add a member directly', () => assertFails(R(MGR).update({
    ['groups/' + G + '/members/' + Z.uid]: prof(), ['groups/' + G + '/memberCount']: 4 })));
  await t('member cannot change memberCount alone', () => assertFails(R(B, 'groups/' + G + '/memberCount').set(2)));
  await t('owner cannot decrement count without removing', () => assertFails(R(MGR).update({
    ['groups/' + G + '/memberCount']: 2, ['groups/' + G + '/lastRemoved']: B.uid })));
  await t('member cannot rotate invite token', () => assertFails(R(B, 'groups/' + G + '/inviteToken').set('c'.repeat(32))));
  await t('user cannot set own group to a group they are not in', () => assertFails(R(Z, 'users/' + Z.uid + '/group').set(G)));

  // ---------- capacity 10 ----------
  await t('group capped at 10 members', async () => {
    // fill group 2 to 10 (O + mgr2 = 2 now)
    for (let i = 0; i < 8; i++) {
      const u = { uid: 'fill' + i, email: 'f' + i + '@x.com' };
      await assertSucceeds(R(u).update(joinUpd(u, G2, TOK2, 2 + i)));
    }
    const u = { uid: 'fill_extra', email: 'fx@x.com' };
    await assertFails(R(u).update(joinUpd(u, G2, TOK2, 10)));
  });

  // ---------- lists ----------
  await t('stranger (no group) cannot create a list', () => assertFails(R(Z).update(createListUpd(Z, L3, 0, G))));
  await t('B creates a list', () => assertSucceeds(R(B).update(createListUpd(B, L1, 0, G))));
  await t('list creation without quota counter fails', async () => {
    const u = createListUpd(B, L2, 1, G); delete u['users/' + B.uid + '/ownedCount'];
    await assertFails(R(B).update(u));
  });
  await t('list creation with wrong counter fails', () => assertFails(R(B).update(createListUpd(B, L2, 5, G))));
  await t('list creation in a foreign group fails', () => assertFails(R(B).update(createListUpd(B, L2, 1, G2))));
  await t('list creation with bad id fails', () => assertFails(R(B).update(createListUpd(B, 'sl_bad', 1, G))));
  await t('cannot overwrite an existing list by "creating" it', () => assertFails(R(C).update(createListUpd(C, L1, 0, G))));
  await t('member quota stops at 10', async () => {
    await seed({ ['users/' + C.uid + '/ownedCount']: 10 });
    await assertFails(R(C).update(createListUpd(C, L3, 10, G)));
    await seed({ ['users/' + C.uid + '/ownedCount']: null });
  });
  await t('manager quota allows 11..20', async () => {
    await seed({ ['users/' + MGR.uid + '/ownedCount']: 15 });
    await assertSucceeds(R(MGR).update(createListUpd(MGR, L3, 15, G)));
  });
  await t('manager quota stops at 20', async () => {
    await seed({ ['users/' + MGR.uid + '/ownedCount']: 20 });
    await assertFails(R(MGR).update(createListUpd(MGR, 'sl_444444444444', 20, G)));
  });
  await t('user cannot reset own counter', () => assertFails(R(B, 'users/' + B.uid + '/ownedCount').set(0)));
  await t('user cannot fake an owned entry', () => assertFails(R(B).update({
    ['users/' + B.uid + '/owned/sl_555555555555']: true, ['users/' + B.uid + '/ownedCount']: 2, ['users/' + B.uid + '/ownedOp']: 'sl_555555555555' })));

  // ---------- reading / sharing ----------
  await t('owner reads own list', () => assertSucceeds(R(B, L1).once('value')));
  await t('group member reads unshared list -> denied', () => assertFails(R(C, L1).once('value')));
  await t('outsider reads list -> denied', () => assertFails(R(O, L1).once('value')));
  await t('owner shares with group member', () => assertSucceeds(R(B).update({
    [L1 + '/members/' + C.uid]: { ts: 1 }, ['users/' + C.uid + '/shared/' + L1]: { by: B.uid, name: 'x' } })));
  await t('shared member reads list', () => assertSucceeds(R(C, L1).once('value')));
  await t('owner cannot share with outsider', () => assertFails(R(B, L1 + '/members/' + O.uid).set({ ts: 1 })));
  await t('owner cannot plant shared entry for non-member', () => assertFails(R(B, 'users/' + MGR.uid + '/shared/' + L1).set({ by: B.uid, name: 'x' })));
  await t('non-owner member cannot add members', () => assertFails(R(C, L1 + '/members/' + MGR.uid).set({ ts: 1 })));
  await t('member writes an item', () => assertSucceeds(R(C, L1 + '/items/i1').set({ name: 'חלב', cat: 'מוצרי חלב', qtyN: '1', qtyU: "יח'", purchased: false, addedAt: 1 })));
  await t('item with numeric qtyN ok', () => assertSucceeds(R(C, L1 + '/items/i2').set({ name: 'לחם', qtyN: 2 })));
  await t('item update (purchase) ok', () => assertSucceeds(R(C, L1 + '/items/i1').update({ purchased: true, purchasedAt: 5 })));
  await t('item unpurchase with null purchasedAt ok', () => assertSucceeds(R(C, L1 + '/items/i1').update({ purchased: false, purchasedAt: null })));
  await t('item with extra field refused', () => assertFails(R(C, L1 + '/items/i3').set({ name: 'x', evil: 'y' })));
  await t('item with 101-char name refused', () => assertFails(R(C, L1 + '/items/i3').set({ name: 'x'.repeat(101) })));
  await t('outsider cannot write items', () => assertFails(R(O, L1 + '/items/i9').set({ name: 'x' })));
  await t('member presence ok', () => assertSucceeds(R(C, L1 + '/presence/abc').set({ ts: 1 })));
  await t('member renames list', () => assertSucceeds(R(C, L1 + '/meta/name').set('שם חדש')));
  await t('member cannot change list owner', () => assertFails(R(C, L1 + '/meta/owner').set(C.uid)));
  await t('owner cannot move list to another group', () => assertFails(R(B, L1 + '/meta/group').set(G2)));
  await t('member cannot delete list', () => assertFails(R(C, L1).remove()));
  await t('member leaves list', () => assertSucceeds(R(C).update({ [L1 + '/members/' + C.uid]: null, ['users/' + C.uid + '/shared/' + L1]: null })));
  await t('after leaving, list unreadable', () => assertFails(R(C, L1).once('value')));
  await t('users node of others unreadable', () => assertFails(R(C, 'users/' + B.uid).once('value')));

  // ---------- delete ----------
  await t('owner delete without releasing quota fails', () => assertFails(R(B, L1).remove()));
  await t('owner deletes list and releases quota', () => assertSucceeds(R(B).update({
    [L1]: null, ['users/' + B.uid + '/owned/' + L1]: null, ['users/' + B.uid + '/ownedCount']: 0, ['users/' + B.uid + '/ownedOp']: L1 })));
  await t('quota released (count back to 0)', async () => { if ((await get('users/' + B.uid + '/ownedCount')) !== 0) throw new Error('count not 0'); });

  // ---------- removal from group ----------
  await t('B creates list again and shares with C', async () => {
    await assertSucceeds(R(B).update(createListUpd(B, L2, 0, G)));
    await assertSucceeds(R(B).update({ [L2 + '/members/' + C.uid]: { ts: 1 }, ['users/' + C.uid + '/shared/' + L2]: { by: B.uid, name: 'x' } }));
    await assertSucceeds(R(C, L2).once('value'));
  });
  await t('member cannot remove another member from group', async () => {
    const cnt = await get('groups/' + G + '/memberCount');
    await assertFails(R(B).update({ ['groups/' + G + '/members/' + C.uid]: null, ['groups/' + G + '/lastRemoved']: C.uid, ['groups/' + G + '/memberCount']: cnt - 1 }));
  });
  await t('owner cannot remove themselves', async () => {
    const cnt = await get('groups/' + G + '/memberCount');
    await assertFails(R(MGR).update({ ['groups/' + G + '/members/' + MGR.uid]: null, ['groups/' + G + '/lastRemoved']: MGR.uid, ['groups/' + G + '/memberCount']: cnt - 1, ['users/' + MGR.uid + '/group']: null }));
  });
  await t('manager removes C (atomic, rotates token)', async () => {
    const cnt = await get('groups/' + G + '/memberCount');
    await assertSucceeds(R(MGR).update({
      ['groups/' + G + '/members/' + C.uid]: null, ['groups/' + G + '/joins/' + C.uid]: null,
      ['groups/' + G + '/lastRemoved']: C.uid, ['groups/' + G + '/memberCount']: cnt - 1,
      ['groups/' + G + '/inviteToken']: 'c'.repeat(32), ['users/' + C.uid + '/group']: null }));
  });
  await t('removed member loses list access', () => assertFails(R(C, L2).once('value')));
  await t('removed member cannot rejoin with old token', async () => {
    const cnt = await get('groups/' + G + '/memberCount');
    await assertFails(R(C).update(joinUpd(C, G, TOK, cnt)));
  });
  await t('B leaves group', async () => {
    const cnt = await get('groups/' + G + '/memberCount');
    await assertSucceeds(R(B).update({
      ['groups/' + G + '/members/' + B.uid]: null, ['groups/' + G + '/joins/' + B.uid]: null,
      ['groups/' + G + '/lastRemoved']: B.uid, ['groups/' + G + '/memberCount']: cnt - 1, ['users/' + B.uid + '/group']: null }));
  });
  await t('count consistent after removals (1)', async () => { const c = await get('groups/' + G + '/memberCount'); if (c !== 1) throw new Error('count=' + c); });

  // ---------- removed manager ----------
  await t('after admin removes manager2, nobody can join group 2', async () => {
    await assertSucceeds(R(ADMIN, 'managers/' + key(MGR2.email)).remove());
    await env.withSecurityRulesDisabled(async c => {
      await c.database().ref('smartshop/groups/' + G2).update({ 'members/fill7': null, memberCount: 9 });
      await c.database().ref('smartshop/users/fill7/group').remove();
    });
    const u = { uid: 'late', email: 'late@x.com' };
    await assertFails(R(u).update(joinUpd(u, G2, TOK2, 9)));
  });

  // ---------- migrated legacy list ----------
  await t('migrated legacy list readable by its old members', async () => {
    const LL = 'sl_legacy01';
    await seed({
      ['groups/g_ffffffffffff']: { owner: ADMIN.uid, ownerKey: key(ADMIN.email), name: 'x', inviteToken: TOK, memberCount: 2,
        members: { [ADMIN.uid]: prof(), fam: prof() } },
      ['users/' + ADMIN.uid + '/group']: 'g_ffffffffffff', ['users/fam/group']: 'g_ffffffffffff',
      [LL]: { meta: { owner: ADMIN.uid, token: 'old', name: 'פסח', group: 'g_ffffffffffff' },
              members: { fam: { token: 'old', ts: 1 }, [ADMIN.uid]: { token: 'old', ts: 1 } }, items: { i: { name: 'מצות' } } },
      ['users/' + ADMIN.uid + '/owned/' + LL]: true, ['users/' + ADMIN.uid + '/ownedCount']: 1
    });
    await assertSucceeds(db({ uid: 'fam', email: 'fam@x.com' }).ref('smartshop/' + LL).once('value'));
    await assertSucceeds(db({ uid: 'fam', email: 'fam@x.com' }).ref('smartshop/' + LL + '/items/j').set({ name: 'יין', cat: 'שתייה', qtyN: '1', qtyU: "יח'", purchased: false, addedAt: 1 }));
    await assertFails(R(O, LL).once('value'));
  });
  await t('admin has no list quota', async () => {
    await seed({ ['users/' + ADMIN.uid + '/ownedCount']: 50 });
    await assertSucceeds(R(ADMIN).update(createListUpd(ADMIN, 'sl_666666666666', 50, 'g_ffffffffffff')));
  });

  // ---------- misc ----------
  await t('anyone signed in reads global catalog', () => assertSucceeds(R(O, 'global').once('value')));
  await t('non-admin cannot write global catalog', () => assertFails(R(O, 'global/products/p1').set({ name: 'x' })));
  await t('nobody reads /smartshop root', () => assertFails(R(MGR).once('value')));
  await t('registry entry write ok', () => assertSucceeds(R(O, 'users/' + O.uid + '/lists/sl_x').set({ name: 'n', last: 1 })));
  await t('unknown user field refused', () => assertFails(R(O, 'users/' + O.uid + '/junk').set('x')));

  console.log(results.join('\n'));
  console.log(`\n${pass} passed, ${fail} failed`);
  await env.cleanup();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
