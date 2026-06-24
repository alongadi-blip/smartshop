interface Props {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-3xl font-bold text-white mb-2">PromoUnsub</h1>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          Scan your Gmail inbox for promotional emails and unsubscribe with one click.
        </p>

        <div className="bg-slate-800 rounded-xl p-4 mb-8 text-left">
          <p className="text-slate-300 text-sm font-medium mb-2">Permissions requested:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-green-400">✓</span> Read promotional emails (headers only)
            </li>
            <li className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-green-400">✓</span> Send unsubscribe emails on your behalf
            </li>
          </ul>
        </div>

        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-slate-600 text-xs mt-4">
          Your data never leaves your browser. All processing is done locally.
        </p>
      </div>
    </div>
  );
}
