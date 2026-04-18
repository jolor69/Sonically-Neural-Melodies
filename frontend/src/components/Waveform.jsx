import React from "react";

/**
 * Waveform renders a bar graph from array of 0..1 peaks.
 */
export default function Waveform({ peaks = [], color = "#E28C22", height = 80, active = true, testId }) {
  const bars = peaks.length ? peaks : Array(80).fill(0.05);
  return (
    <div
      className="flex items-center gap-[2px] w-full"
      style={{ height }}
      data-testid={testId}
    >
      {bars.map((p, i) => {
        const h = Math.max(2, Math.round(p * height));
        return (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: h,
              background: active
                ? `linear-gradient(to top, ${color}55, ${color})`
                : `${color}33`,
              minWidth: 2,
            }}
          />
        );
      })}
    </div>
  );
}
