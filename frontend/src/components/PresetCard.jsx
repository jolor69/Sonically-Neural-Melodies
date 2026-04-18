import React from "react";
import { ICON_MAP } from "../lib/icons";

export default function PresetCard({ preset, selected, onClick, compact = false, testId }) {
  const Icon = ICON_MAP[preset.icon] || ICON_MAP.Globe;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId || `preset-card-${preset.id}`}
      className={`preset-card text-left bg-[#121216] border border-[#2A2A35] rounded-xl p-5 ${selected ? "selected" : ""} ${compact ? "min-h-[180px]" : "min-h-[220px]"} flex flex-col justify-between w-full`}
      style={{ "--glow": preset.color }}
    >
      <div>
        <div className="flex flex-wrap gap-1 mb-4">
          {preset.genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="label-overline px-2 py-1 rounded border border-[#2A2A35] text-[10px]"
              style={{ color: preset.color }}
            >
              {g}
            </span>
          ))}
        </div>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `${preset.color}1A`, border: `1px solid ${preset.color}40` }}
        >
          <Icon size={28} color={preset.color} strokeWidth={1.8} />
        </div>
        <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit" }}>
          {preset.name}
        </div>
        <div className="text-sm text-[#9CA3AF] mt-1 leading-relaxed">{preset.description}</div>
      </div>
      {selected ? (
        <div
          className="label-overline mt-4 text-[10px]"
          style={{ color: preset.color }}
          data-testid="preset-selected-indicator"
        >
          ● Selected
        </div>
      ) : null}
    </button>
  );
}
