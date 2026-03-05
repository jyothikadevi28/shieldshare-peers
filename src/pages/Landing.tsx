import { Shield, ArrowRight, Zap, Users, Timer, Lock, Eye, Send } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    desc: "Files transfer directly between browsers. No server ever sees your data.",
  },
  {
    icon: Zap,
    title: "Any File Size",
    desc: "Chunked transfer protocol handles files of any size with resume support.",
  },
  {
    icon: Users,
    title: "Team Rooms",
    desc: "Create temporary rooms for your team. Share files with multiple peers.",
  },
  {
    icon: Timer,
    title: "Self-Destruct Links",
    desc: "Generate links that expire after a single use or set time limit.",
  },
  {
    icon: Eye,
    title: "Zero Knowledge",
    desc: "We never store, log, or even see your files. Pure peer-to-peer.",
  },
  {
    icon: Send,
    title: "Instant Transfer",
    desc: "No upload wait. Files stream directly to the recipient in real-time.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background grid-bg relative overflow-hidden">
      {/* Scan line overlay */}
      <div className="fixed inset-0 pointer-events-none scan-line z-50" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-foreground font-mono tracking-wider">
            ShieldShare
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/transfer" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">
            Transfer
          </Link>
          <Link to="/rooms" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">
            Rooms
          </Link>
          <Link to="/self-destruct" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">
            Self-Destruct
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32 text-center">
        <div className="animate-float mb-8">
          <div className="relative">
            <Shield className="w-24 h-24 text-primary" />
            <div className="absolute inset-0 w-24 h-24 text-primary animate-pulse-glow">
              <Shield className="w-24 h-24" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
          Shield<span className="text-primary text-glow">Share</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-4 font-mono">
          Peer-to-peer file transfer. No servers. No limits. No traces.
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mb-10 opacity-60">
          Powered by WebRTC — your files never touch our servers. Direct browser-to-browser encryption.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/transfer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-md box-glow-strong hover:scale-105 transition-transform font-mono tracking-wide"
          >
            Start Transfer
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-8 py-4 border border-primary/30 text-foreground font-semibold rounded-md hover:border-primary/60 hover:box-glow transition-all font-mono tracking-wide"
          >
            <Users className="w-5 h-5" />
            Team Rooms
          </Link>
        </div>

        {/* Terminal-style status */}
        <div className="mt-16 font-mono text-xs text-muted-foreground bg-card/50 border border-border rounded-md px-6 py-3 backdrop-blur-sm">
          <span className="text-primary">●</span> Protocol: WebRTC &nbsp;|&nbsp;
          <span className="text-primary">●</span> Encryption: AES-256 &nbsp;|&nbsp;
          <span className="text-primary">●</span> Server storage: None
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 md:px-12 pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 hover:box-glow transition-all group"
            >
              <f.icon className="w-8 h-8 text-primary mb-4 group-hover:text-glow-sm transition-all" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          ShieldShare — Your files, your rules. No data ever leaves your browser.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
