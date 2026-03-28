import { useRef, useState } from "react";
import {
  createPeerConnection,
  createOffer,
  acceptOffer,
  completeConnection,
  sendFile,
  receiveFile
} from "@/lib/webrtc";

export default function Transfer() {

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const [offer, setOffer] = useState("");
  const [answer, setAnswer] = useState("");

  // CREATE OFFER (Sender)
  const handleCreateOffer = async () => {
    const pc = createPeerConnection();
    pcRef.current = pc;

    const offerStr = await createOffer(pc);

    const channel = pc.createDataChannel("file-transfer");
    channelRef.current = channel;

    setOffer(offerStr);
  };

  // ACCEPT OFFER (Receiver)
  const handleAcceptOffer = async () => {
    const pc = createPeerConnection();
    pcRef.current = pc;

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channelRef.current = channel;

      receiveFile(
        channel,
        (meta) => console.log("Metadata", meta),
        (progress) => console.log(progress),
        (blob, meta) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = meta.name;
          a.click();
        }
      );
    };

    const answerStr = await acceptOffer(pc, offer);
    setAnswer(answerStr);
  };

  // COMPLETE CONNECTION (Sender pastes answer)
  const handleComplete = async () => {
    if (!pcRef.current) return;
    await completeConnection(pcRef.current, answer);
  };

  // SEND FILE
  const handleFile = async (file: File) => {
    if (!channelRef.current) return;

    await sendFile(
      channelRef.current,
      file,
      (progress) => console.log(progress)
    );
  };

  return (
    <div>
      <h2>Manual P2P Transfer</h2>

      <button onClick={handleCreateOffer}>Create Offer</button>

      <textarea
        placeholder="Paste Offer Here"
        value={offer}
        onChange={(e) => setOffer(e.target.value)}
      />

      <button onClick={handleAcceptOffer}>Accept Offer</button>

      <textarea
        placeholder="Paste Answer Here"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <button onClick={handleComplete}>Complete Connection</button>

      <input
        type="file"
        onChange={(e) =>
          e.target.files && handleFile(e.target.files[0])
        }
      />
    </div>
  );
}
