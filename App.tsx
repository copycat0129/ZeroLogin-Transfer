import React from 'react';
import { useStore } from './store';
import { SignalExchange } from './components/SignalExchange';
import { TransferPanel } from './components/TransferPanel';
import { ConnectionState } from './types';
import { Zap, Github, Shield, Share2 } from 'lucide-react';

const App: React.FC = () => {
  const { connectionState, reset } = useStore();
  const isConnected = connectionState === ConnectionState.CONNECTED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 text-slate-200 font-sans selection:bg-brand-500/30 selection:text-brand-200">
      
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="w-full border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={reset}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
                <Zap size={20} fill="currentColor" className="text-white" />
              </div>
              <h1 className="font-bold text-xl tracking-tight text-white">Bolt<span className="text-brand-400">Share</span></h1>
            </div>

            <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
              <a href="#" className="hidden md:flex items-center gap-2 hover:text-white transition-colors">
                <Shield size={16} /> Secure P2P
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col">
          
          {/* Hero Section (only when not connected) */}
          {!isConnected && connectionState === ConnectionState.DISCONNECTED && (
            <div className="text-center pt-20 pb-12 px-4 animate-fade-in-down">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                Serverless Architecture
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
                Share files at <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">lightspeed</span>.
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed mb-8">
                No size limits. No servers. No tracking. Just a direct, encrypted link between devices.
                Works on any network, anywhere.
              </p>
            </div>
          )}

          {/* Connection Error Banner */}
          {useStore(s => s.error) && (
            <div className="max-w-lg mx-auto w-full px-4 mb-8">
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <AlertCircle size={20} />
                </div>
                <p>{useStore(s => s.error)}</p>
                <button onClick={() => useStore.getState().setError(null)} className="ml-auto hover:text-white">✕</button>
              </div>
            </div>
          )}

          {/* Logic Switcher */}
          {isConnected ? <TransferPanel /> : <SignalExchange />}

        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} BoltShare. Open Source.</p>
            <div className="flex gap-6">
              <span>WebRTC</span>
              <span>End-to-End Encrypted</span>
              <span>No Cloud Storage</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

// Icons for dynamic usage if needed
function AlertCircle({ size = 24 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default App;