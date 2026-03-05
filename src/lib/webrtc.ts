// WebRTC P2P file transfer utilities
// Uses manual signaling (copy/paste SDP) for true serverless privacy

const CHUNK_SIZE = 16 * 1024; // 16KB chunks for reliable transfer
const BUFFER_THRESHOLD = 1024 * 1024; // 1MB buffer threshold

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface TransferProgress {
  fileName: string;
  totalSize: number;
  transferred: number;
  percentage: number;
  speed: number; // bytes per second
}

export type ConnectionState = 'idle' | 'creating-offer' | 'waiting-for-answer' | 'connecting' | 'connected' | 'transferring' | 'completed' | 'error';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export async function createOffer(pc: RTCPeerConnection): Promise<string> {
  const channel = pc.createDataChannel('file-transfer', { ordered: true });
  
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering to complete
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    } else {
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
    }
  });

  return btoa(JSON.stringify(pc.localDescription));
}

export async function acceptOffer(pc: RTCPeerConnection, offerStr: string): Promise<string> {
  const offer = JSON.parse(atob(offerStr));
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    } else {
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
    }
  });

  return btoa(JSON.stringify(pc.localDescription));
}

export async function completeConnection(pc: RTCPeerConnection, answerStr: string): Promise<void> {
  const answer = JSON.parse(atob(answerStr));
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export function sendFile(
  channel: RTCDataChannel,
  file: File,
  onProgress: (progress: TransferProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Send metadata first
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
    };
    channel.send(JSON.stringify({ type: 'metadata', data: metadata }));

    let offset = 0;
    const startTime = Date.now();

    const sendNextChunk = () => {
      while (offset < file.size) {
        if (channel.bufferedAmount > BUFFER_THRESHOLD) {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            sendNextChunk();
          };
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          if (e.target?.result && channel.readyState === 'open') {
            channel.send(e.target.result as ArrayBuffer);
            offset += (e.target.result as ArrayBuffer).byteLength;

            const elapsed = (Date.now() - startTime) / 1000;
            onProgress({
              fileName: file.name,
              totalSize: file.size,
              transferred: offset,
              percentage: Math.round((offset / file.size) * 100),
              speed: offset / elapsed,
            });

            if (offset >= file.size) {
              channel.send(JSON.stringify({ type: 'complete' }));
              resolve();
            } else {
              sendNextChunk();
            }
          }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(slice);
        return; // Wait for FileReader
      }
    };

    sendNextChunk();
  });
}

export function receiveFile(
  channel: RTCDataChannel,
  onMetadata: (meta: FileMetadata) => void,
  onProgress: (progress: TransferProgress) => void,
  onComplete: (file: Blob, meta: FileMetadata) => void
): void {
  let metadata: FileMetadata | null = null;
  const chunks: ArrayBuffer[] = [];
  let received = 0;
  const startTime = Date.now();

  channel.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const msg = JSON.parse(event.data);
      if (msg.type === 'metadata') {
        metadata = msg.data;
        onMetadata(metadata!);
      } else if (msg.type === 'complete' && metadata) {
        const blob = new Blob(chunks, { type: metadata.type });
        onComplete(blob, metadata);
      }
    } else {
      chunks.push(event.data);
      received += event.data.byteLength;

      if (metadata) {
        const elapsed = (Date.now() - startTime) / 1000;
        onProgress({
          fileName: metadata.name,
          totalSize: metadata.size,
          transferred: received,
          percentage: Math.round((received / metadata.size) * 100),
          speed: received / elapsed,
        });
      }
    }
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

// Self-destruct link utility
export function generateSelfDestructId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
}

// Team room utility  
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
