require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_IDS = (process.env.ALLOWED_IDS || '')
  .split(',')
  .map(s => parseInt(s.trim()))
  .filter(n => !isNaN(n));

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

// ─── Projects ─────────────────────────────────────────────────────────────────
const BASE = 'C:\\Users\\מחשב\\claude files';

const PROJECTS = {
  smartshop: {
    label: '🛒 SmartShop',
    path: path.join(BASE, 'smartshop'),
    deploy: 'copy smartshop.html public\\index.html && firebase deploy --only hosting',
    deployUrl: 'https://smartshop-c58a5.web.app',
  },
  stockstocker: {
    label: '📈 StockStocker',
    path: path.join(BASE, 'stockstocker'),
    deploy: 'npm run build && firebase deploy --only hosting',
    deployUrl: 'https://stockstocker-449fa.web.app',
  },
  smartcard: {
    label: '💳 SmartCard',
    path: 'C:\\Users\\מחשב\\frontend_files',
    deploy: null, // SSH deploy — needs manual step
    deployUrl: 'http://138.2.162.153',
  },
};

// ─── Bot setup ───────────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Per-user session: { projectKey: string | null }
const sessions = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAllowed(userId) {
  return ALLOWED_IDS.length === 0 || ALLOWED_IDS.includes(userId);
}

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { projectKey: null });
  return sessions.get(userId);
}

function projectKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        ...Object.values(PROJECTS).map(p => [{ text: p.label }]),
        [{ text: '❓ Help' }],
      ],
      resize_keyboard: true,
    },
  };
}

function runCmd(command, cwd, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { cwd, timeout: timeoutMs, shell: 'cmd.exe', encoding: 'utf8' },
      (err, stdout, stderr) => {
        if (err && !stdout) reject(new Error(stderr || err.message));
        else resolve((stdout || '') + (stderr || ''));
      }
    );
  });
}

function runClaude(cwd, prompt) {
  // Escape quotes in the prompt for the shell
  const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, ' ');
  return runCmd(`claude -p "${escaped}"`, cwd, 300_000);
}

function truncate(text, max = 3800) {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n…[truncated]';
}

// ─── /start command ──────────────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const { id: userId, first_name } = msg.from;
  const chatId = msg.chat.id;

  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId,
      `❌ Access denied.\n\nYour Telegram ID: \`${userId}\`\nAsk Alon to add it to the bot.`,
      { parse_mode: 'Markdown' }
    );
  }

  await bot.sendMessage(chatId,
    `👋 Hi${first_name ? ' ' + first_name : ''}!\n\n` +
    `I can write code and deploy it for you — straight from Telegram.\n\n` +
    `*Step 1:* Tap a project below\n` +
    `*Step 2:* Send your instruction in any language\n\n` +
    `Example: _"Add a dark mode toggle button"_`,
    { parse_mode: 'Markdown', ...projectKeyboard() }
  );
});

// ─── /help command ───────────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    `*How to use:*\n\n` +
    `1️⃣ Select a project from the keyboard\n` +
    `2️⃣ Send your instruction (Hebrew or English)\n` +
    `3️⃣ Wait — I'll make the change and deploy automatically\n\n` +
    `*Commands:*\n` +
    `/start — show welcome\n` +
    `/project — change project\n` +
    `/status — which project is selected\n`,
    { parse_mode: 'Markdown', ...projectKeyboard() }
  );
});

// ─── /project command ────────────────────────────────────────────────────────
bot.onText(/\/project/, async (msg) => {
  await bot.sendMessage(msg.chat.id, 'Select a project:', projectKeyboard());
});

// ─── /status command ─────────────────────────────────────────────────────────
bot.onText(/\/status/, async (msg) => {
  const session = getSession(msg.from.id);
  const project = session.projectKey ? PROJECTS[session.projectKey] : null;
  await bot.sendMessage(msg.chat.id,
    project
      ? `✅ Active project: *${project.label}*`
      : `❓ No project selected yet. Tap a button to choose one.`,
    { parse_mode: 'Markdown', ...projectKeyboard() }
  );
});

// ─── Main message handler ────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const { id: userId } = msg.from;
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId,
      `❌ Access denied. Your ID: \`${userId}\``,
      { parse_mode: 'Markdown' }
    );
  }

  // ── Help button ──
  if (text === '❓ Help') {
    return bot.sendMessage(chatId,
      `Send me an instruction like:\n\n` +
      `_"Change the page title to 'My Shop'"_\n` +
      `_"Add a blue button that says 'Buy Now'"_\n` +
      `_"שנה את הצבע של הכפתור לירוק"_\n\n` +
      `First make sure you selected a project!`,
      { parse_mode: 'Markdown', ...projectKeyboard() }
    );
  }

  // ── Project selection via keyboard ──
  const projectEntry = Object.entries(PROJECTS).find(([, p]) => p.label === text);
  if (projectEntry) {
    const [key, project] = projectEntry;
    getSession(userId).projectKey = key;
    return bot.sendMessage(chatId,
      `✅ Project set: *${project.label}*\n\nNow send me your instruction:`,
      { parse_mode: 'Markdown', ...projectKeyboard() }
    );
  }

  // ── Get active project ──
  const session = getSession(userId);
  if (!session.projectKey) {
    return bot.sendMessage(chatId,
      `❓ Please select a project first by tapping one of the buttons below.`,
      projectKeyboard()
    );
  }

  const project = PROJECTS[session.projectKey];

  // ── Show "working" message ──
  const workingMsg = await bot.sendMessage(chatId,
    `⚙️ *${project.label}*\n\n` +
    `📝 Instruction: _"${truncate(text, 300)}"_\n\n` +
    `⏳ Claude is working...`,
    { parse_mode: 'Markdown' }
  );

  try {
    // Run Claude Code
    const claudeOut = await runClaude(project.path, text);

    await bot.editMessageText(
      `✅ *Code change done!*\n\n` +
      `\`\`\`\n${truncate(claudeOut, 2000)}\n\`\`\``,
      {
        chat_id: chatId,
        message_id: workingMsg.message_id,
        parse_mode: 'Markdown',
      }
    );

    // Auto-deploy
    if (project.deploy) {
      const deployMsg = await bot.sendMessage(chatId,
        `🚀 Deploying *${project.label}*...`,
        { parse_mode: 'Markdown' }
      );

      const deployOut = await runCmd(project.deploy, project.path, 180_000);

      await bot.editMessageText(
        `✅ *Deployed!*\n\n` +
        `🌐 ${project.deployUrl}\n\n` +
        `\`\`\`\n${truncate(deployOut, 1500)}\n\`\`\``,
        {
          chat_id: chatId,
          message_id: deployMsg.message_id,
          parse_mode: 'Markdown',
        }
      );
    } else {
      await bot.sendMessage(chatId,
        `⚠️ *${project.label}* — changes saved locally.\n` +
        `Auto-deploy not configured for SmartCard (requires SSH).\n` +
        `Ask Alon to deploy manually.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (err) {
    await bot.editMessageText(
      `❌ *Error*\n\n\`\`\`\n${truncate(err.message, 2000)}\n\`\`\``,
      {
        chat_id: chatId,
        message_id: workingMsg.message_id,
        parse_mode: 'Markdown',
      }
    );
  }
});

// ─── Error handling ──────────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

console.log('🤖 Claude Telegram Bot is running...');
console.log(`📋 Allowed user IDs: ${ALLOWED_IDS.length ? ALLOWED_IDS.join(', ') : 'ALL (no restriction)'}`);
console.log('Press Ctrl+C to stop.\n');
