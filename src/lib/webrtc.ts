// WebRTC P2P file transfer utilities

const CHUNK_SIZE = 16 * 1024;
const BUFFER_THRESHOLD = 1024 * 1024;

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
  speed: number;
}

export type ConnectionState =
  | "idle"
  | "creating-offer"
  | "waiting-for-answer"
  | "connecting"
  | "connected"
  | "transferring"
  | "completed"
  | "error";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });
}

/* =======================
   CREATE OFFER (FIXED)
======================= */

export async function createOffer(
  pc: RTCPeerConnection
): Promise<{ offer: string; channel: RTCDataChannel }> {
  const channel = pc.createDataChannel("file-transfer", {
    ordered: true,
  });

  channel.binaryType = "arraybuffer";

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await waitForIce(pc);

  return {
    offer: btoa(JSON.stringify(pc.localDescription)),
    channel,
  };
}

/* =======================
   ACCEPT OFFER
======================= */

export async function acceptOffer(
  pc: RTCPeerConnection,
  offerStr: string
): Promise<string> {
  const offer = JSON.parse(atob(offerStr));

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await waitForIce(pc);

  return btoa(JSON.stringify(pc.localDescription));
}

/* =======================
   COMPLETE CONNECTION
======================= */

export async function completeConnection(
  pc: RTCPeerConnection,
  answerStr: string
) {
  const answer = JSON.parse(atob(answerStr));
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

/* =======================
   ICE WAIT HELPER
======================= */

function waitForIce(pc: RTCPeerConnection) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();

    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") resolve();
    });
  });
}

/* =======================
   SEND FILE (FIXED)
======================= */

export function sendFile(
  channel: RTCDataChannel,
  file: File,
  onProgress: (p: TransferProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
    };

    channel.send(JSON.stringify({ type: "metadata", data: metadata }));

    let offset = 0;
    const start = Date.now();

    const sendChunk = () => {
      if (offset >= file.size) {
        channel.send(JSON.stringify({ type: "complete" }));
        resolve();
        return;
      }

      if (channel.bufferedAmount > BUFFER_THRESHOLD) {
        setTimeout(sendChunk, 50);
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return;

        channel.send(e.target.result as ArrayBuffer);

        offset += (e.target.result as ArrayBuffer).byteLength;

        const elapsed = (Date.now() - start) / 1000;

        onProgress({
          fileName: file.name,
          totalSize: file.size,
          transferred: offset,
          percentage: Math.round((offset / file.size) * 100),
          speed: offset / elapsed,
        });

        sendChunk();
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(slice);
    };

    sendChunk();
  });
}

/* =======================
   RECEIVE FILE
======================= */

export function receiveFile(
  channel: RTCDataChannel,
  onMetadata: (m: FileMetadata) => void,
  onProgress: (p: TransferProgress) => void,
  onComplete: (file: Blob, meta: FileMetadata) => void
) {
  let metadata: FileMetadata | null = null;
  const chunks: ArrayBuffer[] = [];
  let received = 0;
  const start = Date.now();

  channel.onmessage = (event) => {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data);

      if (msg.type === "metadata") {
        metadata = msg.data;
        onMetadata(metadata);
      }

      if (msg.type === "complete" && metadata) {
        const blob = new Blob(chunks, { type: metadata.type });
        onComplete(blob, metadata);
      }

      return;
    }

    chunks.push(event.data);
    received += event.data.byteLength;

    if (metadata) {
      const elapsed = (Date.now() - start) / 1000;

      onProgress({
        fileName: metadata.name,
        totalSize: metadata.size,
        transferred: received,
        percentage: Math.round((received / metadata.size) * 100),
        speed: received / elapsed,
      });
    }
  };
}

export const formatBytes = (bytes: number) =>
  bytes === 0
    ? "0 B"
    : `${(bytes / 1024 ** Math.floor(Math.log(bytes) / Math.log(1024))).toFixed(
        2
      )}`;
