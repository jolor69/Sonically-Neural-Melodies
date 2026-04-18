import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PresetCard from "../components/PresetCard";
import Waveform from "../components/Waveform";
import { api, streamUrl } from "../lib/api";
import { ArrowLeft, Download, Loader2, Play, Pause, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function Workspace() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [presets, setPresets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(null); // "original" | "mastered" | null
  const origAudio = useRef(null);
  const masterAudio = useRef(null);

  useEffect(() => {
    api.get(`/tracks/${trackId}`).then((r) => {
      setTrack(r.data);
      if (r.data.preset_id) setSelectedId(r.data.preset_id);
    }).catch(() => { toast.error("Track not found"); navigate("/dashboard"); });
    api.get("/presets").then((r) => setPresets(r.data.presets)).catch(() => {});
  }, [trackId, navigate]);

  const process = async () => {
    if (!selectedId) { toast.error("Pick a preset first"); return; }
    setProcessing(true);
    try {
      const r = await api.post("/tracks/process", {
        track_id: trackId,
        preset_id: selectedId,
      });
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
      self.currentTime = 0;
      self.play().catch(() => {});
      setPlaying(which);
    }
  };

  const download = () => {
    if (!track?.status || track.status !== "mastered") return;
    const token = localStorage.getItem("auth_token");
    const url = streamUrl(trackId, "mastered");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track.original_filename.replace(/\.[^.]+$/, "")}_mastered.wav`;
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
              className="bg-[#E28C22] text-[#0A0A0C] font-bold px-6 py-3 rounded-md hover:bg-[#F5A138] transition inline-flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {processing ? "Mastering…" : (track.status === "mastered" ? "Re-master" : "Master track")}
            </button>
            <button
              onClick={download}
              disabled={track.status !== "mastered"}
              data-testid="download-btn"
              className="border border-[#2A2A35] px-6 py-3 rounded-md hover:border-[#E28C22] hover:text-[#E28C22] transition inline-flex items-center gap-2 disabled:opacity-40"
            >
              <Download size={16} /> Download WAV
            </button>
          </div>
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

        {/* Preset picker */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="label-overline mb-2">/ Pick a preset</div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "Outfit" }}>
                Eight signature sounds.
              </h2>
            </div>
            {selected && (
              <div className="label-overline" style={{ color: selected.color }} data-testid="active-preset-label">
                ● {selected.name}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {presets.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                selected={p.id === selectedId}
                onClick={() => setSelectedId(p.id)}
                compact
                testId={`workspace-preset-${p.id}`}
              />
            ))}
          </div>
        </section>
      </main>
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
