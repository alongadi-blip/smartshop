import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Sender, ScanState } from '../types';
import { fetchPromotionalSenders } from '../gmailApi';
import SenderTable from './SenderTable';

interface Props {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function Dashboard({ user, token, onLogout }: Props) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [scan, setScan] = useState<ScanState>({ phase: 'idle', total: 0, loaded: 0 });
  const [error, setError] = useState('');

  async function handleScan() {
    setError('');
    setSenders([]);
    setScan({ phase: 'listing', total: 0, loaded: 0 });

    try {
      const results = await fetchPromotionalSenders(token, (loaded, total) => {
        setScan({ phase: 'fetching', total, loaded });
      });
      setSenders(results);
      setScan(s => ({ ...s, phase: 'done' }));
    } catch (err: any) {
      setError(err.message || 'Scan failed');
      setScan({ phase: 'idle', total: 0, loaded: 0 });
    }
  }

  function updateSender(email: string, patch: Partial<Sender>) {
    setSenders(prev => prev.map(s => (s.email === email ? { ...s, ...patch } : s)));
  }

  const progress = scan.total > 0 ? Math.round((scan.loaded / scan.total) * 100) : 0;
  const scanning = scan.phase === 'listing' || scan.phase === 'fetching';

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <h1 className="text-xl font-bold text-white">PromoUnsub</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Scan section */}
        {scan.phase === 'idle' && senders.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mb-8">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-white text-xl font-semibold mb-2">Scan your inbox</h2>
            <p className="text-slate-400 text-sm mb-6">
              Finds all promotional emails and groups them by sender, then lets you unsubscribe in one click.
            </p>
            <button
              onClick={handleScan}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Start Scan
            </button>
          </div>
        )}

        {/* Progress */}
        {scanning && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mb-8">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p className="text-white font-medium mb-2">
              {scan.phase === 'listing' ? 'Finding promotional emails…' : `Loading emails… ${scan.loaded} / ${scan.total}`}
            </p>
            {scan.phase === 'fetching' && (
              <div className="mt-4 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-violet-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-red-300 text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-300 ml-4 cursor-pointer">✕</button>
          </div>
        )}

        {/* Results */}
        {scan.phase === 'done' && senders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold">
                Found {senders.length} senders
              </h2>
              <button
                onClick={handleScan}
                className="text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
              >
                ↻ Rescan
              </button>
            </div>
            <SenderTable senders={senders} token={token} onUpdate={updateSender} />
          </div>
        )}

        {scan.phase === 'done' && senders.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-4">🎉</div>
            <p>No promotional emails found!</p>
          </div>
        )}
      </div>
    </div>
  );
}
