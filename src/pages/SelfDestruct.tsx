import { useState, useCallback } from "react";
import { Shield, ArrowLeft, Bomb, Copy, Check, Clock, Link as LinkIcon, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { generateSelfDestructId } from "@/lib/webrtc";

interface DestructLink {
  id: string;
  fileName: string;
  expiresIn: string;
  maxViews: number;
  views: number;
  createdAt: Date;
  active: boolean;
}

const SelfDestruct = () => {
  const [links, setLinks] = useState<DestructLink[]>([]);
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("1h");
  const [maxViews, setMaxViews] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const createLink = useCallback(() => {
    if (!fileName.trim()) return;
    const link: DestructLink = {
      id: generateSelfDestructId(),
      fileName: fileName.trim(),
      expiresIn: expiry,
      maxViews,
      views: 0,
      createdAt: new Date(),
      active: true,
    };
    setLinks((prev) => [link, ...prev]);
    setFileName("");
  }, [fileName, expiry, maxViews]);

  const copyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/d/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const destroyLink = useCallback((id: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, active: false } : l)));
  }, []);

  const expiryOptions = [
    { value: "5m", label: "5 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "24h", label: "24 hours" },
    { value: "7d", label: "7 days" },
  ];

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
          Self-<span className="text-primary text-glow">Destruct</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8 font-mono">
          Generate links that expire after a set time or number of views.
        </p>

        {/* Create form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-mono mb-2 block uppercase tracking-wider">
                File / Content Name
              </label>
              <input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., secret-document.pdf"
                className="w-full bg-muted border border-border rounded-md px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-2 block uppercase tracking-wider">
                  Expires After
                </label>
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-muted border border-border rounded-md px-4 py-3 text-sm font-mono text-foreground"
                >
                  {expiryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-mono mb-2 block uppercase tracking-wider">
                  Max Views
                </label>
                <select
                  value={maxViews}
                  onChange={(e) => setMaxViews(Number(e.target.value))}
                  className="w-full bg-muted border border-border rounded-md px-4 py-3 text-sm font-mono text-foreground"
                >
                  {[1, 3, 5, 10].map((v) => (
                    <option key={v} value={v}>
                      {v} view{v > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={createLink}
              disabled={!fileName.trim()}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-md font-mono hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Bomb className="w-4 h-4" />
              Generate Self-Destruct Link
            </button>
          </div>
        </div>

        {/* Links list */}
        {links.length > 0 && (
          <div>
            <h2 className="text-sm font-mono text-muted-foreground mb-4 uppercase tracking-wider">Generated Links</h2>
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className={`bg-card border rounded-lg p-4 transition-all ${
                    link.active ? "border-border hover:border-primary/20" : "border-destructive/20 opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LinkIcon className="w-4 h-4 text-primary flex-shrink-0" />
                        <p className="text-foreground font-medium truncate">{link.fileName}</p>
                        {!link.active && (
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-mono">
                            DESTROYED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {link.expiresIn}
                        </span>
                        <span>{link.views}/{link.maxViews} views</span>
                        <span className="text-primary/60">{link.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {link.active && (
                        <>
                          <button
                            onClick={() => copyLink(link.id)}
                            className="p-2 border border-border rounded hover:border-primary/30 transition-colors"
                          >
                            {copied === link.id ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => destroyLink(link.id)}
                            className="p-2 border border-border rounded hover:border-destructive/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {links.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bomb className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-mono text-sm">No self-destruct links yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfDestruct;
