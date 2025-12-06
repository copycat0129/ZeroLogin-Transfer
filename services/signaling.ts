import mqtt from 'mqtt';
import { SignalData } from '../types';

type MessageCallback = (data: SignalData) => void;

// Using a public broker for demonstration. 
// In production, this would be a private secure broker.
const BROKER_URL = 'wss://broker.emqx.io:8083/mqtt';
const TOPIC_PREFIX = 'boltshare/v1/room/';

export class SignalingService {
  private client: mqtt.MqttClient | null = null;
  private roomId: string | null = null;
  private onMessageCallback: MessageCallback | null = null;
  private onPeerConnectedCallback: (() => void) | null = null;
  private role: 'host' | 'peer' | null = null;

  constructor() {}

  public connect(roomId: string, role: 'host' | 'peer'): Promise<void> {
    this.roomId = roomId;
    this.role = role;

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(BROKER_URL, {
        clientId: `boltshare-${role}-${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
      });

      this.client.on('connect', () => {
        console.log(`Connected to signaling server as ${role}`);
        this.subscribe();
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('Signaling connection error:', err);
        reject(err);
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });
    });
  }

  private subscribe() {
    if (!this.client || !this.roomId) return;

    if (this.role === 'host') {
      // Host listens for peer hello and answers
      this.client.subscribe(`${TOPIC_PREFIX}${this.roomId}/peer/#`);
    } else {
      // Peer listens for host offers
      this.client.subscribe(`${TOPIC_PREFIX}${this.roomId}/host/#`);
      // Announce presence
      this.publish('hello', { type: 'hello' });
    }
  }

  private handleMessage(topic: string, message: any) {
    try {
      const payload = JSON.parse(message.toString());
      
      // If I am host, ignore my own messages (though topic separation handles most)
      // Peer messages come on /peer/..., Host on /host/...
      
      if (payload.type === 'hello' && this.role === 'host') {
        if (this.onPeerConnectedCallback) this.onPeerConnectedCallback();
        return;
      }

      if (this.onMessageCallback) {
        this.onMessageCallback(payload);
      }
    } catch (e) {
      console.error('Failed to parse signal', e);
    }
  }

  public sendSignal(data: SignalData) {
    if (!this.client || !this.roomId) return;
    
    // Publish to the opposite channel
    // If I am host, I publish to /host/... so peer can see
    // If I am peer, I publish to /peer/... so host can see
    const subTopic = this.role === 'host' ? 'host' : 'peer';
    this.publish('signal', data);
  }

  private publish(type: string, data: any) {
    if (!this.client || !this.roomId) return;
    const topic = `${TOPIC_PREFIX}${this.roomId}/${this.role}/${type}`;
    this.client.publish(topic, JSON.stringify(data));
  }

  public onSignal(callback: MessageCallback) {
    this.onMessageCallback = callback;
  }

  public onPeerFound(callback: () => void) {
    this.onPeerConnectedCallback = callback;
  }

  public disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const signalingService = new SignalingService();

// Helper to generate the 5-6 char code
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const length = Math.random() > 0.5 ? 5 : 6;
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function validateShareCode(code: string): boolean {
  return /^[A-Z0-9]{5,6}$/.test(code.toUpperCase());
}