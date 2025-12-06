import { create } from 'zustand';
import { ConnectionState, TransferItem, TransferType, TransferStatus, FileMeta, SignalData } from './types';
import { p2pService } from './services/p2p';
import { signalingService, generateShareCode } from './services/signaling';

interface AppState {
  connectionState: ConnectionState;
  transfers: TransferItem[];
  connectionCode: string;
  error: string | null;
  isHost: boolean;
  
  // Actions
  startHosting: () => Promise<void>;
  joinSession: (code: string) => Promise<void>;
  initiateFileTransfer: (file: File) => void;
  reset: () => void;
  setError: (err: string | null) => void;
}

export const useStore = create<AppState>((set, get) => {
  
  // --- P2P Service Listeners ---
  p2pService.on('connectionStateChange', (state: RTCPeerConnectionState) => {
    if (state === 'connected') {
      set({ connectionState: ConnectionState.CONNECTED, error: null });
      signalingService.disconnect(); // Disconnect signaling once P2P is established to save resources
    } else if (state === 'disconnected' || state === 'failed') {
      set({ connectionState: ConnectionState.DISCONNECTED, error: 'P2P Connection lost' });
    }
  });

  p2pService.on('open', () => {
    set({ connectionState: ConnectionState.CONNECTED });
  });

  p2pService.on('ice-candidate', (candidate) => {
    signalingService.sendSignal({ type: 'ice-candidate', data: candidate });
  });

  p2pService.on('transferStart', (meta: FileMeta) => {
    const newItem: TransferItem = {
      id: meta.id,
      meta,
      type: TransferType.RECEIVE,
      progress: 0,
      speed: 0,
      status: TransferStatus.IN_PROGRESS,
      startedAt: Date.now()
    };
    set(state => ({ transfers: [newItem, ...state.transfers] }));
  });

  p2pService.on('progress', (data: {id: string, received: number, total: number, speed: number}) => {
    set(state => ({
      transfers: state.transfers.map(item => 
        item.id === data.id 
          ? { ...item, progress: (data.received / data.total) * 100, speed: data.speed } 
          : item
      )
    }));
  });

  p2pService.on('transferComplete', (data: {meta: FileMeta, url: string}) => {
    set(state => ({
      transfers: state.transfers.map(item => 
        item.id === data.meta.id 
          ? { ...item, progress: 100, status: TransferStatus.COMPLETED, blobUrl: data.url, completedAt: Date.now() } 
          : item
      )
    }));
  });
  
  p2pService.on('sendProgress', (data: {id: string, sent: number, total: number, speed: number}) => {
      set(state => ({
      transfers: state.transfers.map(item => 
        item.id === data.id 
          ? { ...item, progress: (data.sent / data.total) * 100, speed: data.speed } 
          : item
      )
    }));
  });

  p2pService.on('sendComplete', (id: string) => {
      set(state => ({
      transfers: state.transfers.map(item => 
        item.id === id 
          ? { ...item, progress: 100, status: TransferStatus.COMPLETED, completedAt: Date.now() } 
          : item
      )
    }));
  });

  // --- Signaling Service Listeners ---
  signalingService.onSignal(async (signal: SignalData) => {
    try {
      if (signal.type === 'offer') {
        const answer = await p2pService.handleOffer(signal.data);
        signalingService.sendSignal({ type: 'answer', data: answer });
      } else if (signal.type === 'answer') {
        await p2pService.handleAnswer(signal.data);
      } else if (signal.type === 'ice-candidate') {
        await p2pService.handleIceCandidate(signal.data);
      }
    } catch (e) {
      console.error("Error handling signal", e);
      set({ error: "Signaling error occurred" });
    }
  });

  signalingService.onPeerFound(async () => {
    // Peer found (Host side logic)
    // Host initiates P2P connection
    set({ connectionState: ConnectionState.CONNECTING_P2P });
    try {
      p2pService.initConnection(true); // Initiator
      const offer = await p2pService.createOffer();
      signalingService.sendSignal({ type: 'offer', data: offer });
    } catch (e) {
      set({ error: "Failed to initiate P2P connection" });
    }
  });

  return {
    connectionState: ConnectionState.DISCONNECTED,
    transfers: [],
    connectionCode: '',
    error: null,
    isHost: false,

    setError: (err) => set({ error: err }),

    startHosting: async () => {
      // Set state immediately to show code UI
      set({ connectionState: ConnectionState.CONNECTING_TO_SERVER, error: null, isHost: true });
      const code = generateShareCode();
      set({ connectionCode: code });
      
      try {
        await signalingService.connect(code, 'host');
        set({ connectionState: ConnectionState.WAITING_FOR_PEER });
      } catch (e) {
        set({ error: "Failed to connect to signaling server", connectionState: ConnectionState.ERROR, isHost: false });
      }
    },

    joinSession: async (code: string) => {
      set({ connectionState: ConnectionState.CONNECTING_TO_SERVER, error: null, connectionCode: code, isHost: false });
      
      try {
        await signalingService.connect(code, 'peer');
        // Initialize P2P as receiver (non-initiator)
        p2pService.initConnection(false);
        set({ connectionState: ConnectionState.CONNECTING_P2P });
      } catch (e) {
        set({ error: "Failed to connect to room. Check internet or code.", connectionState: ConnectionState.ERROR });
      }
    },

    initiateFileTransfer: (file: File) => {
      try {
        const meta = p2pService.sendFile(file);
        const newItem: TransferItem = {
          id: meta.id,
          meta,
          type: TransferType.SEND,
          progress: 0,
          speed: 0,
          status: TransferStatus.IN_PROGRESS,
          startedAt: Date.now()
        };
        set(state => ({ transfers: [newItem, ...state.transfers] }));
      } catch (e) {
        set({ error: "Failed to start transfer" });
      }
    },
    
    reset: () => {
        p2pService.close();
        signalingService.disconnect();
        set({ connectionState: ConnectionState.DISCONNECTED, connectionCode: '', error: null, transfers: [], isHost: false });
    }
  };
});