import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            HR
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">HookRelay</h1>
            <p className="text-xs text-slate-400">Multi-tenant Webhook Delivery Service</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            Phase 1: Architecture Initialized
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center items-center text-center">
        <div className="max-w-md p-8 rounded-2xl bg-slate-800/50 border border-slate-700/60 shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 text-xl font-mono">
            ⚡
          </div>
          <h2 className="text-xl font-bold text-white mb-2">HookRelay Console</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The multi-tenant webhook ingestion and delivery engine is currently initialized in Phase
            1 (Architecture &amp; Scaffolding).
          </p>
          <div className="text-xs font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-400 text-left space-y-1">
            <div>
              <span className="text-indigo-400 font-semibold">Server:</span> Node.js / Express /
              TypeScript
            </div>
            <div>
              <span className="text-indigo-400 font-semibold">Database:</span> PostgreSQL / Prisma
            </div>
            <div>
              <span className="text-indigo-400 font-semibold">Client:</span> Vite / React / Tailwind
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        HookRelay &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
