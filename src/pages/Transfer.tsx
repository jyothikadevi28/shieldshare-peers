import { useState, useRef, useCallback } from "react";
import { Shield, Upload, Download, Copy, Check, ArrowLeft, FileIcon } from "lucide-react";
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
  const [mode, setMode] = useState<"select" | "send" | "receive">("select");

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <div className="fixed inset-0 pointer-events-none scan-line z-50" />
      
      <nav className="relative z-10 flex items-center gap-4 px-6 py-4 md:px-12">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-foreground font-mono tracking-wider">ShieldShare</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-20">
        <h1 className="text-3xl font-bold text-foreground mb-2 font-mono">
          P2P <span className="text-primary text-glow">Transfer</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">
          Direct browser-to-browser file transfer via WebRTC
        </p>

        {mode === "select" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("send")}
              className="bg-card border border-border rounded-lg p-8 text-center hover:border-primary/30 hover:box-glow transition-all group"
            >
              <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Send File</h3>
              <p className="text-xs text-muted-foreground">Generate a code for the receiver</p>
            </button>
            <button
              onClick={() => setMode("receive")}
              className="bg-card border border-border rounded-lg p-8 text-center hover:border-primary/30 hover:box-glow transition-all group"
            >
              <Download className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Receive File</h3>
              <p className="text-xs text-muted-foreground">Enter the sender's code</p>
            </button>
          </div>
        )}

        {mode === "send" && <SendPanel onBack={() => setMode("select")} />}
        {mode === "receive" && <ReceivePanel onBack={() => setMode("select")} />}
      </div>
    </div>
  );
};

function SendPanel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ConnectionState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [copied, setCopied] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setState("creating-offer");

    const pc = createPeerConnection();
    pcRef.current = pc;

    pc.ondatachannel = undefined; // sender creates channel
    
    // Listen for the data channel we create
    const channelCreatedPromise = new Promise<RTCDataChannel>((resolve) => {
      const originalCreateDataChannel = pc.createDataChannel.bind(pc);
      // We'll get the channel from createOffer's internal call
      // Actually, let's create it here
    });

    const code = await createOffer(pc);
    setOfferCode(code);
    setState("waiting-for-answer");

    // Get the data channel (created inside createOffer)
    pc.ondatachannel = (e) => {
      channelRef.current = e.channel;
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (!pcRef.current || !answerCode || !file) return;
    setState("connecting");

    try {
      await completeConnection(pcRef.current, answerCode);

      // Wait for data channel to open
      // The sender created the channel in createOffer, so we need to find it
      const pc = pcRef.current;
      
      // The data channel was created in createOffer - we need to access it
      // Let's listen for connection state
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);
        
        if (pc.connectionState === 'connected') {
          clearTimeout(timeout);
          resolve();
          return;
        }
        
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            resolve();
          } else if (pc.connectionState === 'failed') {
            clearTimeout(timeout);
            reject(new Error("Connection failed"));
          }
        };
      });

      setState("connected");
    } catch (err) {
      setState("error");
    }
  }, [answerCode, file]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(offerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [offerCode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  return (
    <div>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 font-mono flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      {/* File selection */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-16 text-center cursor-pointer hover:border-primary/30 hover:box-glow transition-all"
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-1">Drop a file or click to browse</p>
          <p className="text-xs text-muted-foreground">Any file type, any size</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {/* File selected - show info */}
      {file && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>
      )}

      {/* Offer code */}
      {offerCode && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-2 block">
              STEP 1: Share this code with the receiver
            </label>
            <div className="relative">
              <textarea
                readOnly
                value={offerCode}
                className="w-full h-24 bg-muted border border-border rounded-md p-3 text-xs font-mono text-foreground resize-none"
              />
              <button
                onClick={copyCode}
                className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded hover:border-primary/30 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-mono mb-2 block">
              STEP 2: Paste the receiver's answer code
            </label>
            <textarea
              value={answerCode}
              onChange={(e) => setAnswerCode(e.target.value)}
              placeholder="Paste answer code here..."
              className="w-full h-24 bg-muted border border-border rounded-md p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={!answerCode || state === "connecting"}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md font-mono hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {state === "connecting" ? "Connecting..." : "Connect & Send"}
          </button>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div className="mt-6 bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between text-xs text-muted-foreground font-mono mb-2">
            <span>{progress.percentage}%</span>
            <span>{formatSpeed(progress.speed)}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-2">
            {formatBytes(progress.transferred)} / {formatBytes(progress.totalSize)}
          </p>
        </div>
      )}

      {state === "completed" && (
        <div className="mt-6 bg-card border border-primary/30 rounded-lg p-4 text-center box-glow">
          <Check className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-foreground font-semibold">Transfer Complete!</p>
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 bg-card border border-destructive/30 rounded-lg p-4 text-center">
          <p className="text-destructive font-semibold">Connection failed. Please try again.</p>
        </div>
      )}
    </div>
  );
}

function ReceivePanel({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ConnectionState>("idle");
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const handleAccept = useCallback(async () => {
    if (!offerCode) return;
    setState("connecting");

    try {
      const pc = createPeerConnection();
      pcRef.current = pc;

      // Listen for data channel from sender
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        channel.binaryType = 'arraybuffer';
        
        receiveFile(
          channel,
          (meta) => {
            setMetadata(meta);
            setState("transferring");
          },
          (prog) => setProgress(prog),
          (blob, meta) => {
            // Download the file
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = meta.name;
            a.click();
            URL.revokeObjectURL(url);
            setState("completed");
          }
        );
      };

      const answer = await acceptOffer(pc, offerCode);
      setAnswerCode(answer);
      setState("waiting-for-answer");
    } catch (err) {
      setState("error");
    }
  }, [offerCode]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(answerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [answerCode]);

  return (
    <div>
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-6 font-mono flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      {!answerCode && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-mono mb-2 block">
              STEP 1: Paste the sender's offer code
            </label>
            <textarea
              value={offerCode}
              onChange={(e) => setOfferCode(e.target.value)}
              placeholder="Paste offer code here..."
              className="w-full h-24 bg-muted border border-border rounded-md p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>
          <button
            onClick={handleAccept}
            disabled={!offerCode || state === "connecting"}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md font-mono hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {state === "connecting" ? "Processing..." : "Accept Connection"}
          </button>
        </div>
      )}

      {answerCode && (
        <div>
          <label className="text-xs text-muted-foreground font-mono mb-2 block">
            STEP 2: Send this answer code back to the sender
          </label>
          <div className="relative">
            <textarea
              readOnly
              value={answerCode}
              className="w-full h-24 bg-muted border border-border rounded-md p-3 text-xs font-mono text-foreground resize-none"
            />
            <button
              onClick={copyCode}
              className="absolute top-2 right-2 p-1.5 bg-card border border-border rounded hover:border-primary/30 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-3">
            Waiting for sender to connect and transfer the file...
          </p>
        </div>
      )}

      {metadata && (
        <div className="mt-6 bg-card border border-border rounded-lg p-4 flex items-center gap-3">
          <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <p className="text-foreground font-medium">{metadata.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(metadata.size)}</p>
          </div>
        </div>
      )}

      {progress && (
        <div className="mt-4 bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between text-xs text-muted-foreground font-mono mb-2">
            <span>{progress.percentage}%</span>
            <span>{formatSpeed(progress.speed)}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {state === "completed" && (
        <div className="mt-6 bg-card border border-primary/30 rounded-lg p-4 text-center box-glow">
          <Check className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-foreground font-semibold">File received & downloaded!</p>
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 bg-card border border-destructive/30 rounded-lg p-4 text-center">
          <p className="text-destructive font-semibold">Connection failed. Invalid code or timeout.</p>
        </div>
      )}
    </div>
  );
}

export default Transfer;
