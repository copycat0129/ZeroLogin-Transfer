import React, { useState } from 'react';
import { useStore } from '../store';
import { ConnectionState } from '../types';
import { validateShareCode } from '../services/signaling';
import { ArrowRight, Smartphone, Wifi, Loader2, Copy, CheckCircle } from 'lucide-react';

export const SignalExchange: React.FC = () => {
  const { 
    connectionState, 
    connectionCode, 
    startHosting, 
    joinSession,
    isHost
  } = useStore();

  const [inputCode, setInputCode] = useState('');
  const [inputError, setInputError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (!validateShareCode(inputCode)) {
      setInputError('Code must be 5-6 characters (A-Z, 0-9)');
      return;
    }
    joinSession(inputCode.toUpperCase());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setInputCode(val);
    setInputError('');
  };

  // State 1: Selection Screen
  if (connectionState === ConnectionState.DISCONNECTED || connectionState === ConnectionState.ERROR) {
    return (
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mx-auto mt-12 animate-fade-in-up px-4">
        {/* Send Mode */}
        <div 
          onClick={startHosting}
          className="flex-1 group cursor-pointer relative overflow-hidden rounded-2xl bg-dark-800 border border-slate-700 hover:border-brand-500 transition-all duration-300 p-8 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] active:scale-95"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wifi size={120} />
          </div>
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-full bg-brand-900/50 flex items-center justify-center mb-6 text-brand-500 border border-brand-500/30">
              <ArrowRight size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Send Files</h3>
            <p className="text-slate-400 leading-relaxed">
              Generate a short 6-character code to share instantly with nearby devices.
            </p>
          </div>
        </div>

        {/* Receive Mode */}
        <div className="flex-1 relative overflow-hidden rounded-2xl bg-dark-800 border border-slate-700 p-8">
           <div className="absolute top-0 right-0 p-4 opacity-10">
            <Smartphone size={120} />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-14 h-14 rounded-full bg-emerald-900/50 flex items-center justify-center mb-6 text-emerald-500 border border-emerald-500/30">
              <ArrowRight size={24} className="rotate-90" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Receive Files</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Enter the code from the sender to start receiving.
            </p>
            
            <div className="mt-auto">
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={handleInputChange}
                  placeholder="X8F3M"
                  className={`w-full bg-dark-950 border ${inputError ? 'border-red-500' : 'border-slate-700'} rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700 uppercase`}
                />
              </div>
              {inputError && <p className="text-red-400 text-xs mt-2 text-center">{inputError}</p>}
              
              <button
                onClick={handleJoin}
                disabled={inputCode.length < 5}
                className="w-full mt-4 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Host Waiting for Peer OR Host Initializing
  // Show this screen if we are waiting for a peer OR if we are a host currently connecting to server
  const showHostCode = connectionState === ConnectionState.WAITING_FOR_PEER || 
                       (connectionState === ConnectionState.CONNECTING_TO_SERVER && isHost);

  if (showHostCode) {
    const isConnecting = connectionState === ConnectionState.CONNECTING_TO_SERVER;

    return (
      <div className="w-full max-w-md mx-auto mt-12 px-4 animate-fade-in-up">
        <div className="bg-dark-800 rounded-2xl border border-slate-700 p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-pulse"></div>
          
          <h3 className="text-lg font-medium text-slate-300 mb-6">Your Share Code</h3>
          
          <div className="relative group cursor-pointer" onClick={handleCopy}>
            <div className={`bg-dark-950 border ${isConnecting ? 'border-slate-700' : 'border-brand-500/30'} rounded-2xl py-8 px-4 mb-2 hover:border-brand-500 transition-colors`}>
              <span className={`text-5xl font-mono font-bold tracking-widest text-white select-all ${isConnecting ? 'opacity-50' : ''}`}>
                {connectionCode}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-brand-400 opacity-60 group-hover:opacity-100 transition-opacity">
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Click to copy'}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>
              {isConnecting ? 'Initializing secure session...' : 'Waiting for receiver to join...'}
            </span>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-700/50">
             <p className="text-xs text-slate-500">
               Share this code with the receiver. Valid for this session.
             </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Connecting (Generic/Peer)
  return (
    <div className="flex justify-center mt-20 px-4">
      <div className="flex flex-col items-center gap-6 text-slate-400">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Connecting...</h3>
          <p className="text-sm">Establishing secure P2P tunnel</p>
        </div>
      </div>
    </div>
  );
};