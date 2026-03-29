import { useState, useRef, useCallback } from "react";
import {
  Shield,
  Upload,
  Download,
  Copy,
  Check,
  ArrowLeft,
  FileIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  createPeerConnection,
  createOffer,
  acceptOffer,
  completeConnection,
  sendFile,
  receiveFile,
  formatBytes,
  formatSpeed,
  type ConnectionState,
  type TransferProgress,
  type FileMetadata,
} from "@/lib/webrtc";

const Transfer = () => {
  const [mode, setMode] =
    useState<"select" | "send" | "receive">("select");

  return (
    <div className="min-h-screen bg-background grid-bg">
      <nav className="flex items-center gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold font-mono">ShieldShare</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-10">
        {mode === "select" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <button onClick={() => setMode("send")} className="card">
              <Upload className="mx-auto mb-2" />
              Send File
            </button>

            <button onClick={() => setMode("receive")} className="card">
              <Download className="mx-auto mb-2" />
              Receive File
            </button>
          </div>
        )}

        {mode === "send" && <SendPanel onBack={() => setMode("select")} />}
        {mode === "receive" && (
          <ReceivePanel onBack={() => setMode("select")} />
        )}
      </div>
    </div>
  );
};

/* ===================================================
   SEND PANEL  ✅ FIXED
=================================================== */

function SendPanel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ConnectionState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [progress, setProgress] =
    useState<TransferProgress | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  /* ---------- FILE SELECT ---------- */

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setState("creating-offer");

    const pc = createPeerConnection();
    pcRef.current = pc;

    // ⭐ IMPORTANT FIX
    const { offer, channel } = await createOffer(pc);

    channelRef.current = channel;

    channel.onopen = () => {
      console.log("DataChannel open");
    };

    setOfferCode(offer);
    setState("waiting-for-answer");
  }, []);

  /* ---------- CONNECT ---------- */

  const handleConnect = useCallback(async () => {
    if (!pcRef.current || !file || !answerCode) return;

    setState("connecting");

    try {
      await completeConnection(pcRef.current, answerCode);

      await new Promise<void>((resolve) => {
        pcRef.current!.onconnectionstatechange = () => {
          if (pcRef.current!.connectionState === "connected")
            resolve();
        };
      });

      setState("connected");

      // ⭐ START SENDING FILE
      if (channelRef.current) {
        setState("transferring");

        await sendFile(channelRef.current, file, (p) =>
          setProgress(p)
        );

        setState("completed");
      }
    } catch {
      setState("error");
    }
  }, [answerCode, file]);

  return (
    <div>
      <button onClick={onBack}>← Back</button>

      {!file && (
        <input
          type="file"
          onChange={(e) =>
            e.target.files?.[0] &&
            handleFileSelect(e.target.files[0])
          }
        />
      )}

      {offerCode && (
        <>
          <textarea readOnly value={offerCode} />
          <textarea
            placeholder="Paste answer code"
            onChange={(e) => setAnswerCode(e.target.value)}
          />
          <button onClick={handleConnect}>
            Connect & Send
          </button>
        </>
      )}

      {progress && (
        <p>
          {progress.percentage}% —
          {formatBytes(progress.transferred)}
        </p>
      )}

      {state === "completed" && <p>Transfer Complete ✅</p>}
    </div>
  );
}

/* ===================================================
   RECEIVE PANEL  ✅ WORKING
=================================================== */

function ReceivePanel({ onBack }: { onBack: () => void }) {
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [progress, setProgress] =
    useState<TransferProgress | null>(null);
  const [metadata, setMetadata] =
    useState<FileMetadata | null>(null);

  const handleAccept = async () => {
    const pc = createPeerConnection();

    pc.ondatachannel = (e) => {
      const channel = e.channel;

      receiveFile(
        channel,
        (meta) => setMetadata(meta),
        (p) => setProgress(p),
        (blob, meta) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = meta.name;
          a.click();
        }
      );
    };

    const answer = await acceptOffer(pc, offerCode);
    setAnswerCode(answer);
  };

  return (
    <div>
      <button onClick={onBack}>← Back</button>

      {!answerCode && (
        <>
          <textarea
            placeholder="Paste offer code"
            onChange={(e) => setOfferCode(e.target.value)}
          />
          <button onClick={handleAccept}>
            Accept Connection
          </button>
        </>
      )}

      {answerCode && <textarea readOnly value={answerCode} />}

      {metadata && <p>Receiving: {metadata.name}</p>}

      {progress && <p>{progress.percentage}%</p>}
    </div>
  );
}

export default Transfer;
