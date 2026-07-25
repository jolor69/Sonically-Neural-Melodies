import React, { useRef, useState, useEffect } from "react";
import { ICON_MAP } from "../lib/icons";
import { Play, Pause } from "lucide-react";
import { API } from "../lib/api";

const DSP_LABEL = {
  streaming: "Streaming",
  youtube: "YouTube",
  broadcast: "Broadcast",
  apple_music: "Apple Music",
  mastering: "Master",
};

export default function PresetCard({ preset, selected, onClick, compact = false, testId, enableMiniPlayer = false, sampleTitle = null }) {
  const Icon = ICON_MAP[preset.icon] || ICON_MAP.Globe;
  const [which, setWhich] = useState("mastered");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }
  }, [which]);

  useEffect(() => {
    const el = audioRef.current;
    return () => { try { el?.pause(); } catch {} };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const targetLabels = (preset.targets || []).map((t) => DSP_LABEL[t]).filter(Boolean);

  return (
    <div
      onClick={onClick}
      data-testid={testId || `preset-card-${preset.id}`}
      className={`preset-card text-left bg-[#121216] border border-[#2A2A35] rounded-xl p-5 cursor-pointer ${selected ? "selected" : ""} flex flex-col w-full h-full`}
      style={{ "--glow": preset.color, minHeight: compact ? 340 : 380 }}
      role="button"
      tabIndex={0}
    >
      {/* GENRES */}
      <div className="flex flex-wrap gap-1 mb-4">
        {preset.genres.slice(0, 4).map((g) => (
          <span
            key={g}
            className="label-overline px-2 py-1 rounded border border-[#2A2A35] text-[10px]"
            style={{ color: preset.color }}
          >
            {g}
          </span>
        ))}
      </div>

      {/* ICON */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${preset.color}1A`, border: `1px solid ${preset.color}40` }}
      >
        <Icon size={28} color={preset.color} strokeWidth={1.8} />
      </div>

      {/* TITLE + DESC */}
      <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit" }}>
        {preset.name}
      </div>
      <div className="text-sm text-[#9CA3AF] mt-1 leading-relaxed">{preset.description}</div>

      {/* Push remaining content to bottom */}
      <div className="flex-1" />

      {/* LUFS + DSP TARGET — BOTTOM ROW (doesn't overlap genres) */}
      {(preset.lufs !== undefined || targetLabels.length > 0) && (
        <div className="mt-4 pt-3 border-t border-[#2A2A35] flex items-center gap-2 flex-wrap" data-testid={`preset-target-${preset.id}`}>
          {preset.lufs !== undefined && (
            <span
              className="mono text-[10px] px-2 py-0.5 rounded border"
              style={{ borderColor: `${preset.color}66`, color: preset.color }}
            >
              {preset.lufs} LUFS
            </span>
          )}
          {targetLabels.slice(0, 2).map((t) => (
            <span key={t} className="label-overline text-[9px] px-2 py-0.5 rounded border border-[#2A2A35] text-[#9CA3AF]">
              ✓ {t}
            </span>
          ))}
        </div>
      )}

      {enableMiniPlayer && (
        <>
          {sampleTitle && (
            <div className="mt-3 label-overline text-[9px] text-[#6B7280] truncate" data-testid={`preset-sample-title-${preset.id}`}>
              ♫ {sampleTitle}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2" data-testid={`preset-miniplayer-${preset.id}`}>
            <button
              onClick={togglePlay}
              data-testid={`preset-miniplayer-play-${preset.id}`}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[#2A2A35] bg-[#1A1A20] hover:border-[#E28C22] transition"
              style={{ color: preset.color }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <div className="flex items-center gap-1 bg-[#0A0A0C] border border-[#2A2A35] rounded-full p-1 flex-1">
              <button
                onClick={(e) => { e.stopPropagation(); setWhich("original"); }}
                data-testid={`preset-miniplayer-original-${preset.id}`}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                  which === "original" ? "bg-white text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                }`}
              >
                Original
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setWhich("mastered"); }}
                data-testid={`preset-miniplayer-mastered-${preset.id}`}
                className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                  which === "mastered" ? "bg-white text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                }`}
              >
                Mastered
              </button>
            </div>
            <audio
              ref={audioRef}
              src={`${API}/presets/${preset.id}/sample/${which}`}
              onEnded={() => setPlaying(false)}
              preload="none"
            />
          </div>
        </>
      )}

      {selected && !enableMiniPlayer ? (
        <div
          className="label-overline mt-4 text-[10px]"
          style={{ color: preset.color }}
          data-testid="preset-selected-indicator"
        >
          ● Selected
        </div>
      ) : null}
    </div>
  );
}
