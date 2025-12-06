export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING_TO_SERVER = 'CONNECTING_TO_SERVER',
  WAITING_FOR_PEER = 'WAITING_FOR_PEER',
  CONNECTING_P2P = 'CONNECTING_P2P',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export enum TransferType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE'
}

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface TransferItem {
  id: string;
  meta: FileMeta;
  type: TransferType;
  progress: number; // 0 to 100
  speed: number; // bytes per second
  status: TransferStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
  blobUrl?: string; // For downloaded files
}

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
}
