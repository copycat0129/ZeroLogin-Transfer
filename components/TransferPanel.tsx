import React, { useRef } from 'react';
import { useStore } from '../store';
import { TransferItem, TransferStatus, TransferType } from '../types';
import { FileUp, FileDown, Check, Download, Clock, Wifi } from 'lucide-react';

export const TransferPanel: React.FC = () => {
  const { transfers, initiateFileTransfer } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      initiateFileTransfer(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    return formatSize(bytesPerSec) + '/s';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4 pb-20 animate-fade-in-up">
      {/* Action Bar */}
      <div className="bg-dark-800 rounded-2xl p-6 border border-slate-700 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 sticky top-6 z-30 backdrop-blur-xl bg-opacity-90">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse absolute top-0 right-0 border border-dark-800 z-10"></div>
            <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-emerald-500 shadow-inner">
               <Wifi size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Connected</h2>
            <p className="text-emerald-500 text-xs font-mono font-medium tracking-wide">ENCRYPTED P2P LINK ACTIVE</p>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="group cursor-pointer w-full md:w-auto bg-brand-600 hover:bg-brand-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 flex items-center justify-center gap-3 active:scale-95 border border-brand-400/20"
          >
            <FileUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
            Send File
          </label>
        </div>
      </div>

      {/* Transfer List */}
      <div className="space-y-4">
        {transfers.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-dark-800/30">
            <div className="text-slate-700 mb-4 bg-dark-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
               <FileUp size={32} className="opacity-50" />
            </div>
            <p className="text-slate-400 font-medium">Ready to transfer</p>
            <p className="text-slate-600 text-sm mt-1">Select a file to send instantly</p>
          </div>
        )}

        {transfers.map((item) => (
          <TransferItemCard key={item.id} item={item} formatSize={formatSize} formatSpeed={formatSpeed} />
        ))}
      </div>
    </div>
  );
};

const TransferItemCard: React.FC<{
  item: TransferItem;
  formatSize: (n: number) => string;
  formatSpeed: (n: number) => string;
}> = ({ item, formatSize, formatSpeed }) => {
  const isCompleted = item.status === TransferStatus.COMPLETED;
  const isSending = item.type === TransferType.SEND;
  
  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700/50 p-5 shadow-lg overflow-hidden relative group transition-all hover:border-slate-600">
      
      <div className="flex items-center gap-5 relative z-10">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border transition-colors ${
          isCompleted 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
            : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
        }`}>
          {isSending ? <FileUp size={24} /> : <FileDown size={24} />}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="text-white font-medium truncate pr-4 text-base" title={item.meta.name}>
              {item.meta.name}
            </h4>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check size={12} /> COMPLETE
                </span>
              ) : (
                <span className="text-xs font-bold text-brand-400 font-mono">
                  {item.progress.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mt-1">
            <span className="text-slate-500">{formatSize(item.meta.size)}</span>
            {!isCompleted && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-brand-300">{formatSpeed(item.speed)}</span>
              </>
            )}
            {isCompleted && item.completedAt && (
                <>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {((item.completedAt - item.startedAt)/1000).toFixed(1)}s</span>
                </>
            )}
          </div>
          
          {/* Progress Bar */}
          {!isCompleted && (
            <div className="w-full bg-dark-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 relative"
                style={{ width: `${item.progress}%` }}
              >
                <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isCompleted && item.type === TransferType.RECEIVE && item.blobUrl && (
          <a 
            href={item.blobUrl} 
            download={item.meta.name}
            className="flex-shrink-0 w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
            title="Download"
          >
            <Download size={20} />
          </a>
        )}
      </div>
    </div>
  );
};
