import { FileMeta } from '../types';

// Adaptive Chunk Sizing
const MIN_CHUNK_SIZE = 16 * 1024; // 16KB
const MAX_CHUNK_SIZE = 256 * 1024; // 256KB (Conservative max for reliable delivery over public internet)

type EventCallback = (data: any) => void;

export class P2PService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private events: Map<string, EventCallback[]> = new Map();
  
  // File Transfer State
  private incomingFileMeta: FileMeta | null = null;
  private incomingFileBuffer: ArrayBuffer[] = [];
  private incomingReceivedSize = 0;
  private incomingStartTime = 0;

  constructor() {}

  public initConnection(isInitiator: boolean) {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    };
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      this.emit('connectionStateChange', this.peerConnection?.connectionState);
    };

    if (isInitiator) {
      // Host creates the channel
      const channel = this.peerConnection.createDataChannel("boltshare-transfer", {
        ordered: true
      });
      this.setupDataChannel(channel);
    } else {
      // Peer receives the channel
      this.peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';
    
    // Optimize bufferedAmountLowThreshold for backpressure
    this.dataChannel.bufferedAmountLowThreshold = 64 * 1024;

    this.dataChannel.onopen = () => {
      console.log('Data channel open');
      this.emit('open', null);
    };
    
    this.dataChannel.onclose = () => {
      this.emit('close', null);
    };

    this.dataChannel.onmessage = (event) => {
      this.handleDataMessage(event.data);
    };
  }

  // --- Signaling Handlers ---

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("Connection not initialized");
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("Connection not initialized");
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding ICE candidate", e);
    }
  }

  public close() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    this.dataChannel = null;
    this.peerConnection = null;
  }

  // --- File Transfer Logic ---

  private handleDataMessage(data: ArrayBuffer | string) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'FILE_META') {
          this.incomingFileMeta = msg.meta;
          this.incomingFileBuffer = [];
          this.incomingReceivedSize = 0;
          this.incomingStartTime = Date.now();
          this.emit('transferStart', msg.meta);
        }
      } catch (e) {
        console.error("Failed to parse msg", e);
      }
    } else {
      if (!this.incomingFileMeta) return;

      this.incomingFileBuffer.push(data);
      this.incomingReceivedSize += data.byteLength;

      const duration = (Date.now() - this.incomingStartTime) / 1000;
      const speed = duration > 0 ? this.incomingReceivedSize / duration : 0;

      this.emit('progress', {
        id: this.incomingFileMeta.id,
        received: this.incomingReceivedSize,
        total: this.incomingFileMeta.size,
        speed: speed
      });

      if (this.incomingReceivedSize >= this.incomingFileMeta.size) {
        this.finishIncomingFile();
      }
    }
  }

  private finishIncomingFile() {
    if (!this.incomingFileMeta) return;
    
    const blob = new Blob(this.incomingFileBuffer, { type: this.incomingFileMeta.type });
    const url = URL.createObjectURL(blob);
    
    this.emit('transferComplete', {
      meta: this.incomingFileMeta,
      url: url
    });

    this.incomingFileMeta = null;
    this.incomingFileBuffer = [];
  }

  public sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error("Connection not open");
    }

    const meta: FileMeta = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };

    this.dataChannel.send(JSON.stringify({ type: 'FILE_META', meta }));

    const reader = new FileReader();
    let offset = 0;
    const startTime = Date.now();
    let currentChunkSize = MIN_CHUNK_SIZE;

    const readSlice = () => {
      const slice = file.slice(offset, offset + currentChunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
      
      const buffer = e.target?.result as ArrayBuffer;
      
      const sendChunk = () => {
        if (!this.dataChannel) return; 
        
        try {
          this.dataChannel.send(buffer);
          
          offset += buffer.byteLength;
          const duration = (Date.now() - startTime) / 1000;
          const speed = duration > 0 ? offset / duration : 0;
          
          // Adaptive Chunk Size Update
          // If transfer is fast, increase chunk size
          if (speed > 1024 * 1024) { // > 1MB/s
             currentChunkSize = Math.min(MAX_CHUNK_SIZE, currentChunkSize * 2);
          }
          
          this.emit('sendProgress', {
            id: meta.id,
            sent: offset,
            total: meta.size,
            speed: speed
          });

          if (offset < file.size) {
            // Use setTimeout(..., 0) to yield to event loop
            setTimeout(readSlice, 0); 
          } else {
            this.emit('sendComplete', meta.id);
          }
        } catch (err) {
          console.error("Send error", err);
          this.emit('error', err);
        }
      };

      // Dynamic Chunking & Backpressure Logic
      // If buffer is low, we can increase chunk size for next read (up to max)
      // If buffer is high, we wait
      
      if (this.dataChannel.bufferedAmount > 1024 * 1024) { // 1MB Threshold
        // Backpressure: Wait for buffer to drain
        const checkBuffer = () => {
          if (!this.dataChannel) return;
          if (this.dataChannel.bufferedAmount < 256 * 1024) { // Wait until drops to 256KB
             sendChunk();
          } else {
             setTimeout(checkBuffer, 10);
          }
        };
        checkBuffer();
      } else {
         sendChunk();
      }
    };

    readSlice();
    return meta;
  }

  // --- Event Handling ---
  public on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);
  }

  public off(event: string, callback: EventCallback) {
     const callbacks = this.events.get(event);
     if (callbacks) {
         this.events.set(event, callbacks.filter(cb => cb !== callback));
     }
  }

  private emit(event: string, data: any) {
    this.events.get(event)?.forEach(cb => cb(data));
  }
}

export const p2pService = new P2PService();