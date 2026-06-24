import { useState } from 'react';
import type { Sender } from '../types';
import { sendUnsubscribeEmail } from '../gmailApi';

interface Props {
  senders: Sender[];
  token: string;
  onUpdate: (email: string, patch: Partial<Sender>) => void;
}

type Filter = 'all' | 'auto' | 'manual' | 'done';

export default function SenderTable({ senders, token, onUpdate }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = senders.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'auto') return !!(s.unsubscribeUrl || s.unsubscribeEmail);
    if (filter === 'manual') return !s.unsubscribeUrl && !s.unsubscribeEmail;
    if (filter === 'done') return s.status === 'done';
    return true;
  });

  async function handleUnsubscribe(s: Sender) {
    onUpdate(s.email, { status: 'loading' });
    try {
      if (s.unsubscribeEmail) {
        await sendUnsubscribeEmail(token, s.unsubscribeEmail);
        onUpdate(s.email, { status: 'done' });
      } else if (s.unsubscribeUrl) {
        window.open(s.unsubscribeUrl, '_blank', 'noopener,noreferrer');
        onUpdate(s.email, { status: 'done' });
      }
    } catch (err: any) {
      onUpdate(s.email, { status: 'error', errorMsg: err.message });
    }
  }

  function handleManual(s: Sender) {
    const url = `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(s.email)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const autoCount = senders.filter(s => s.unsubscribeUrl || s.unsubscribeEmail).length;
  const doneCount = senders.filter(s => s.status === 'done').length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total senders" value={senders.length} color="slate" />
        <StatCard label="Auto-unsubscribe" value={autoCount} color="violet" />
        <StatCard label="Unsubscribed" value={doneCount} color="green" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search sender..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm flex-1 outline-none focus:border-violet-500"
        />
        <div className="flex gap-2">
          {(['all', 'auto', 'manual', 'done'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-slate-800">
          <span>Sender</span>
          <span className="text-center px-4">Emails</span>
          <span className="text-center px-4">Method</span>
          <span className="text-center px-4">Action</span>
        </div>

        {visible.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No senders found</div>
        ) : (
          visible.map(s => <SenderRow key={s.email} sender={s} onUnsubscribe={handleUnsubscribe} onManual={handleManual} />)
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate: 'text-slate-200',
    violet: 'text-violet-400',
    green: 'text-green-400',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-slate-500 text-sm mt-1">{label}</div>
    </div>
  );
}

function SenderRow({
  sender: s,
  onUnsubscribe,
  onManual,
}: {
  sender: Sender;
  onUnsubscribe: (s: Sender) => void;
  onManual: (s: Sender) => void;
}) {
  const hasAuto = !!(s.unsubscribeUrl || s.unsubscribeEmail);
  const method = s.unsubscribeEmail
    ? { label: '✉ Email', color: 'text-violet-400' }
    : s.unsubscribeUrl
    ? { label: '🔗 Link', color: 'text-blue-400' }
    : { label: '👁 Manual', color: 'text-slate-500' };

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
      {/* Sender info */}
      <div className="min-w-0">
        <div className="text-slate-100 text-sm font-medium truncate">{s.name}</div>
        <div className="text-slate-500 text-xs truncate">{s.email}</div>
      </div>

      {/* Count */}
      <div className="px-4 text-center">
        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">{s.count}</span>
      </div>

      {/* Method */}
      <div className={`px-4 text-xs font-medium ${method.color} whitespace-nowrap`}>
        {method.label}
      </div>

      {/* Action */}
      <div className="px-4">
        {s.status === 'done' ? (
          <span className="text-green-400 text-sm">✓ Done</span>
        ) : s.status === 'error' ? (
          <span className="text-red-400 text-xs" title={s.errorMsg}>✗ Error</span>
        ) : s.status === 'loading' ? (
          <span className="text-slate-400 text-xs animate-pulse">...</span>
        ) : hasAuto ? (
          <button
            onClick={() => onUnsubscribe(s)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Unsubscribe
          </button>
        ) : (
          <button
            onClick={() => onManual(s)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Open in Gmail
          </button>
        )}
      </div>
    </div>
  );
}
