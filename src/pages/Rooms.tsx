import { useState, useCallback } from "react";
import { Shield, ArrowLeft, Users, Copy, Check, Plus, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { generateRoomCode } from "@/lib/webrtc";

interface Room {
  code: string;
  name: string;
  createdAt: Date;
  members: number;
}

const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const createRoom = useCallback(() => {
    const room: Room = {
      code: generateRoomCode(),
      name: `Room ${rooms.length + 1}`,
      createdAt: new Date(),
      members: 1,
    };
    setRooms((prev) => [...prev, room]);
  }, [rooms.length]);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleJoin = useCallback(() => {
    if (!joinCode.trim()) return;
    const room: Room = {
      code: joinCode.toUpperCase(),
      name: `Joined Room`,
      createdAt: new Date(),
      members: 2,
    };
    setRooms((prev) => [...prev, room]);
    setJoinCode("");
  }, [joinCode]);

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
          Team <span className="text-primary text-glow">Rooms</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">
          Create temporary rooms for group file sharing. Rooms are ephemeral — they vanish when everyone leaves.
        </p>

        {/* Create or Join */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={createRoom}
            className="bg-card border border-border rounded-lg p-6 text-center hover:border-primary/30 hover:box-glow transition-all"
          >
            <Plus className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-foreground font-semibold mb-1">Create Room</h3>
            <p className="text-xs text-muted-foreground">Generate a new room code</p>
          </button>

          <div className="bg-card border border-border rounded-lg p-6">
            <UserPlus className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-foreground font-semibold mb-1 text-center">Join Room</h3>
            <div className="flex gap-2 mt-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground text-center tracking-[0.3em] uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={joinCode.length < 4}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md text-sm disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Active Rooms */}
        {rooms.length > 0 && (
          <div>
            <h2 className="text-sm font-mono text-muted-foreground mb-4 uppercase tracking-wider">Active Rooms</h2>
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.code}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{room.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Code: <span className="text-primary tracking-[0.2em]">{room.code}</span> · {room.members} member{room.members !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyCode(room.code)}
                    className="p-2 border border-border rounded hover:border-primary/30 transition-colors"
                  >
                    {copied === room.code ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono text-sm">No active rooms. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Rooms;
