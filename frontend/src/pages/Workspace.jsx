import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PresetCard from "../components/PresetCard";
import Waveform from "../components/Waveform";
import { api, streamUrl, downloadUrl } from "../lib/api";
import { ArrowLeft, Download, Loader2, Play, Pause, Wand2, Lock, ChevronDown, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Slider } from "../components/ui/slider";

const TIER_RANK = { free: 0, pro: 1, studio: 2 };
const FREE_PRESETS = ["universal", "fire", "clarity", "tape"];

export default function Workspace() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [track, setTrack] = useState(null);
  const [presets, setPresets] = useState([]);
  const [formats, setFormats] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [intensity, setIntensity] = useState(1.0);
  const [inputGain, setInputGain] = useState(0);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const origAudio = useRef(null);
  const masterAudio = useRef(null);

  const userTier = user?.subscription_tier || "free";
  const userTierRank = TIER_RANK[userTier] ?? 0;
  const isAdmin = !!user?.is_admin;
  const isFree = !isAdmin && userTier === "free";
  const advUnlocked = isAdmin || !isFree;

  useEffect(() => {
    api.get(`/tracks/${trackId}`).then((r) => {
      setTrack(r.data);
      if (r.data.preset_id) setSelectedId(r.data.preset_id);
    }).catch(() => { toast.error("Track not found"); navigate("/dashboard"); });
    api.get("/presets").then((r) => setPresets(r.data.presets)).catch(() => {});
    api.get("/plans").then((r) => setFormats(r.data.download_formats || [])).catch(() => {});
  }, [trackId, navigate]);

  const presetLocked = (id) => isFree && !FREE_PRESETS.includes(id);

  const process = async () => {
    if (!selectedId) { toast.error("Pick a preset first"); return; }
    if (presetLocked(selectedId)) {
      toast.error("This preset requires Pro tier");
      navigate("/pricing");
      return;
    }
    setProcessing(true);
    try {
      const payload = { track_id: trackId, preset_id: selectedId };
      if (advUnlocked) {
        payload.intensity = intensity;
        payload.input_gain = inputGain;
        payload.eq_low = eqLow;
        payload.eq_mid = eqMid;
        payload.eq_high = eqHigh;
      }
      const r = await api.post("/tracks/process", payload);
      setTrack(r.data);
      toast.success("Mastered — hit play to compare");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Processing failed";
      toast.error(msg);
      if (e?.response?.status === 402) {
        setTimeout(() => navigate("/pricing"), 1200);
      }
    } finally {
      setProcessing(false);
    }
  };

  const togglePlay = (which) => {
    const other = which === "original" ? masterAudio.current : origAudio.current;
    const self = which === "original" ? origAudio.current : masterAudio.current;
    if (!self) return;
    other?.pause();
    if (playing === which) {
      self.pause();
      setPlaying(null);
    } else {
      try { self.currentTime = 0; } catch {}
      self.play().then(() => {
        setPlaying(which);
      }).catch((err) => {
        console.error("Audio play failed:", err);
        toast.error("Couldn't play audio — please try again");
        setPlaying(null);
      });
    }
  };

  const download = (formatId) => {
    if (!track?.status || track.status !== "mastered") return;
    const fmt = formats.find((f) => f.id === formatId);
    if (!fmt) return;
    if (!isAdmin && (TIER_RANK[fmt.tier] ?? 0) > userTierRank) {
      toast.error(`${fmt.label} requires ${fmt.tier.toUpperCase()} tier`);
      navigate("/pricing");
      return;
    }
    const url = downloadUrl(trackId, formatId);
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!track) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white">
        <Navbar />
        <div className="max-w-7xl mx-auto p-10"><div className="label-overline">Loading...</div></div>
      </div>
    );
  }

  const selected = presets.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <Link to="/dashboard" className="label-overline inline-flex items-center gap-1 mb-4 hover:text-[#E28C22]" data-testid="back-to-dashboard">
          <ArrowLeft size={14} /> Back to studio
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="label-overline mb-2">/ Mastering workspace</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight truncate max-w-2xl" style={{ fontFamily: "Outfit" }}>
              {track.original_filename}
            </h1>
            <div className="mt-2 text-sm text-[#9CA3AF] mono" data-testid="track-meta">
              {Math.round(track.duration_sec)}s · {track.status}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={process}
              disabled={processing || !selectedId}
              data-testid="process-btn"
              className="btn-gradient font-bold px-6 py-3 rounded-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {processing ? "Mastering…" : (track.status === "mastered" ? "Re-master" : "Master track")}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={track.status !== "mastered"}
                  data-testid="download-btn"
                  className="border border-[#2A2A35] px-6 py-3 rounded-md hover:border-[#E28C22] hover:text-[#E28C22] transition inline-flex items-center gap-2 disabled:opacity-40 disabled:hover:border-[#2A2A35] disabled:hover:text-white"
                >
                  <Download size={16} /> Download <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="bg-[#121216] border border-[#2A2A35] text-white min-w-[260px]"
                align="end"
                data-testid="download-format-menu"
              >
                <DropdownMenuLabel className="label-overline text-[10px]">
                  Export format
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2A2A35]" />
                {formats.map((f) => {
                  const locked = !isAdmin && (TIER_RANK[f.tier] ?? 0) > userTierRank;
                  return (
                    <DropdownMenuItem
                      key={f.id}
                      onSelect={(e) => { e.preventDefault(); download(f.id); }}
                      data-testid={`download-format-${f.id}`}
                      className={`flex items-center justify-between gap-4 px-3 py-2.5 rounded-sm cursor-pointer focus:bg-[#1A1A20] focus:text-white ${locked ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{f.label}</span>
                        <span className="label-overline text-[9px] mt-0.5">.{f.ext}</span>
                      </div>
                      {locked ? (
                        <span className="inline-flex items-center gap-1 label-overline text-[10px] text-[#E28C22]">
                          <Lock size={11} /> {f.tier}
                        </span>
                      ) : (
                        <span className="label-overline text-[10px] text-[#10B981]">Ready</span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 20-min wait notice */}
        <div className="bg-[#121216] border border-[#2A2A35] rounded-xl px-4 py-3 mb-8 flex items-center gap-3 text-sm text-[#9CA3AF]" data-testid="wait-time-notice">
          <Clock size={16} className="text-[#E28C22] shrink-0" />
          <span>Heads up: mastering can take up to <span className="text-white font-semibold">20 minutes</span> per track on all tiers.</span>
        </div>

        {/* A/B preview */}
        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <ABCard
            title="Original"
            label="Your upload"
            peaks={track.peaks_original}
            color="#9CA3AF"
            onPlay={() => togglePlay("original")}
            playing={playing === "original"}
            audioRef={origAudio}
            src={streamUrl(trackId, "original")}
            onEnded={() => setPlaying(null)}
            testId="ab-original"
          />
          <ABCard
            title="Mastered"
            label={track.preset_id ? `Preset: ${track.preset_id}` : "Pick preset & master"}
            peaks={track.peaks_mastered}
            color={selected?.color || "#E28C22"}
            onPlay={() => togglePlay("mastered")}
            playing={playing === "mastered"}
            audioRef={masterAudio}
            src={track.status === "mastered" ? streamUrl(trackId, "mastered") : null}
            onEnded={() => setPlaying(null)}
            disabled={track.status !== "mastered"}
            testId="ab-mastered"
          />
        </section>

        {/* Advanced controls: Intensity + EQ (Pro+) */}
        <section className="mb-12 relative" data-testid="advanced-controls-section">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Intensity */}
            <div className={`bg-[#121216] border border-[#2A2A35] rounded-xl p-6 relative ${!advUnlocked ? "opacity-80" : ""}`} data-testid="intensity-panel">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-bold" style={{ fontFamily: "Outfit" }}>Intensity</div>
                  <div className="label-overline mt-1">How hard the preset hits</div>
                </div>
                {!advUnlocked && <LockBadge />}
              </div>
              <div className="px-1 pt-4 pb-2">
                <Slider
                  value={[intensity]}
                  onValueChange={(v) => advUnlocked && setIntensity(v[0])}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  disabled={!advUnlocked}
                  data-testid="intensity-slider"
                />
                <div className="flex justify-between mt-3 label-overline text-[10px]">
                  <span>Light</span>
                  <span className={advUnlocked ? "text-[#E28C22]" : "text-[#6B7280]"} data-testid="intensity-value">
                    {intensity.toFixed(2)}×
                  </span>
                  <span>Heavy</span>
                </div>
              </div>
              <div className="mt-4 border-t border-[#2A2A35] pt-4">
                <div className="label-overline mb-2">Input gain</div>
                <Slider
                  value={[inputGain]}
                  onValueChange={(v) => advUnlocked && setInputGain(v[0])}
                  min={-12}
                  max={12}
                  step={0.5}
                  disabled={!advUnlocked}
                  data-testid="input-gain-slider"
                />
                <div className="flex justify-between mt-2 label-overline text-[10px]">
                  <span>-12 dB</span>
                  <span className={advUnlocked ? "text-[#E28C22]" : "text-[#6B7280]"}>{inputGain > 0 ? "+" : ""}{inputGain.toFixed(1)} dB</span>
                  <span>+12 dB</span>
                </div>
              </div>
              {!advUnlocked && (
                <UpgradeOverlay onClick={() => navigate("/pricing")} text="Unlock Intensity + Input Gain with Pro" />
              )}
            </div>

            {/* EQ */}
            <div className={`bg-[#121216] border border-[#2A2A35] rounded-xl p-6 relative ${!advUnlocked ? "opacity-80" : ""}`} data-testid="eq-panel">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold" style={{ fontFamily: "Outfit" }}>EQ</div>
                  <span className="label-overline text-[9px] bg-[#E28C22]/15 text-[#E28C22] px-2 py-0.5 rounded">Beta</span>
                </div>
                {!advUnlocked && <LockBadge />}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Low", freq: "100 Hz", val: eqLow, set: setEqLow, id: "low" },
                  { label: "Mid", freq: "1 kHz", val: eqMid, set: setEqMid, id: "mid" },
                  { label: "High", freq: "8 kHz", val: eqHigh, set: setEqHigh, id: "high" },
                ].map((band) => (
                  <EQKnob key={band.id} {...band} disabled={!advUnlocked} />
                ))}
              </div>
              {!advUnlocked && (
                <UpgradeOverlay onClick={() => navigate("/pricing")} text="Unlock EQ with Pro" />
              )}
            </div>
          </div>
        </section>

        {/* Preset picker */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="label-overline mb-2">/ Pick a preset</div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit" }}>
                {isFree ? "Four signature sounds." : "Eight signature sounds."}
              </h2>
              {isFree && (
                <div className="text-sm text-[#9CA3AF] mt-1" data-testid="free-preset-notice">
                  Free tier: Universal, Fire, Clarity, Tape.
                  <button onClick={() => navigate("/pricing")} className="ml-2 text-[#E28C22] hover:underline">
                    Unlock all 8 →
                  </button>
                </div>
              )}
            </div>
            {selected && (
              <div className="label-overline" style={{ color: selected.color }} data-testid="active-preset-label">
                ● {selected.name}
              </div>
            )}
          </div>

          {/* DSP RELEASE GUIDE */}
          <div className="bg-[#121216] border border-[#2A2A35] rounded-xl p-4 mb-6" data-testid="dsp-release-guide">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#E28C22]" />
              <span className="label-overline">DSP release · LUFS targeting</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {DSP_TARGETS.map((t) => (
                <div key={t.id} className="flex items-start gap-2" data-testid={`dsp-target-${t.id}`}>
                  <span className="mono text-[10px] mt-0.5 text-[#E28C22] shrink-0">{t.lufs}</span>
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-[#9CA3AF] text-[10px]">{t.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {presets.map((p) => {
              const locked = presetLocked(p.id);
              return (
                <div key={p.id} className="relative h-full">
                  <PresetCard
                    preset={p}
                    selected={p.id === selectedId}
                    onClick={() => {
                      if (locked) {
                        toast.error(`${p.name} requires Pro tier`);
                        navigate("/pricing");
                        return;
                      }
                      setSelectedId(p.id);
                    }}
                    compact
                    testId={`workspace-preset-${p.id}`}
                  />
                  {locked && (
                    <div className="absolute inset-0 rounded-xl bg-[#0A0A0C]/70 flex items-center justify-center pointer-events-none" data-testid={`preset-lock-${p.id}`}>
                      <div className="flex flex-col items-center gap-2 label-overline text-[#E28C22]">
                        <Lock size={22} />
                        <span>PRO</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

const DSP_TARGETS = [
  { id: "streaming", name: "Spotify · Apple Music", lufs: "-14 LUFS", note: "Streaming standard" },
  { id: "youtube", name: "YouTube", lufs: "-13 to -15", note: "Video platforms" },
  { id: "broadcast", name: "TV · Radio Broadcast", lufs: "-23 LUFS", note: "EBU R128 compliance" },
  { id: "mastering", name: "Mastering Target", lufs: "-8 to -12", note: "Loud club / hip-hop" },
];

const DSP_LABEL = {
  streaming: "Streaming",
  youtube: "YouTube",
  broadcast: "Broadcast",
  apple_music: "Apple Music",
  mastering: "Master",
};

function LockBadge() {
  return (
    <span className="inline-flex items-center gap-1 label-overline text-[10px] text-[#E28C22] bg-[#E28C22]/10 px-2 py-1 rounded">
      <Lock size={11} /> Pro
    </span>
  );
}

function UpgradeOverlay({ onClick, text }) {
  return (
    <button
      onClick={onClick}
      className="absolute inset-0 rounded-xl flex items-center justify-center bg-[#0A0A0C]/60 backdrop-blur-[1px] hover:bg-[#0A0A0C]/40 transition"
      data-testid="upgrade-overlay"
    >
      <div className="flex items-center gap-2 border border-[#E28C22] bg-[#121216] px-4 py-2 rounded-full">
        <Sparkles size={14} className="text-[#E28C22]" />
        <span className="text-sm font-semibold">{text}</span>
      </div>
    </button>
  );
}

function EQKnob({ label, freq, val, set, disabled, id }) {
  // Visual rotary knob using a conic gradient; clicking steps through values.
  const pct = (val + 6) / 12; // 0..1
  const rotation = -135 + pct * 270; // -135° to 135°
  return (
    <div className="flex flex-col items-center gap-2" data-testid={`eq-knob-${id}`}>
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center select-none"
        style={{
          background: disabled
            ? "radial-gradient(circle at 30% 30%, #2A2A35, #121216)"
            : "radial-gradient(circle at 30% 30%, #3A3A45, #14141A)",
          boxShadow: disabled ? "none" : "inset 0 2px 4px rgba(0,0,0,0.5), 0 0 12px rgba(226,140,34,0.15)",
        }}
      >
        <div
          className="absolute w-1 h-7 rounded-full"
          style={{
            top: 6,
            background: disabled ? "#4B5563" : "#E28C22",
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "bottom center",
            transition: "transform 0.2s",
          }}
        />
      </div>
      <input
        type="range"
        min={-6}
        max={6}
        step={0.5}
        value={val}
        onChange={(e) => !disabled && set(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full accent-[#E28C22]"
        data-testid={`eq-input-${id}`}
      />
      <div className="flex flex-col items-center leading-tight">
        <span className="label-overline text-[10px]">{label}</span>
        <span className="mono text-xs text-[#6B7280]">{freq}</span>
        <span className={`mono text-xs ${disabled ? "text-[#6B7280]" : "text-[#E28C22]"}`}>
          {val > 0 ? "+" : ""}{val.toFixed(1)} dB
        </span>
      </div>
    </div>
  );
}

function ABCard({ title, label, peaks, color, onPlay, playing, audioRef, src, onEnded, disabled, testId }) {
  return (
    <div className="bg-[#121216] border border-[#2A2A35] rounded-xl p-6" data-testid={testId}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xl font-bold" style={{ fontFamily: "Outfit", color }}>{title}</div>
          <div className="label-overline mt-1">{label}</div>
        </div>
        <button
          onClick={onPlay}
          disabled={disabled}
          data-testid={`${testId}-play`}
          className="w-12 h-12 rounded-full flex items-center justify-center transition disabled:opacity-40"
          style={{ background: disabled ? "#2A2A35" : color, color: "#0A0A0C" }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </div>
      <Waveform peaks={peaks && peaks.length ? peaks : []} color={color} height={90} active={!disabled} />
      {src && (
        <audio ref={audioRef} src={src} onEnded={onEnded} preload="none" />
      )}
      {disabled && (
        <div className="mt-3 label-overline text-[#6B7280]">Not mastered yet</div>
      )}
    </div>
  );
}
