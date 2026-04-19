import React, { useEffect, useRef, useState } from "react";

/**
 * Peak LED meter — renders a vertical 10-segment LED column that reflects the
 * live peak level of the signal coming out of the Web Audio `analyser` node.
 *
 * Thresholds (dBFS):
 *   - Red  (clip warning): >= -3 dB
 *   - Yellow (hot):        -12 .. -3 dB
 *   - Green (safe):        below -12 dB
 *
 * The meter holds the absolute peak since last render and decays ~3 dB/frame
 * so it visually "settles" like a hardware LED meter.
 */
export default function PeakMeter({ analyser, active, testId }) {
  const [peakDb, setPeakDb] = useState(-60);
  const rafRef = useRef(null);
  const peakHoldRef = useRef(-60);

  useEffect(() => {
    if (!analyser || !active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setPeakDb(-60);
      peakHoldRef.current = -60;
      return;
    }

    const bufferLength = analyser.fftSize;
    const buf = new Float32Array(bufferLength);

    const tick = () => {
      try {
        analyser.getFloatTimeDomainData(buf);
        // absolute max amplitude in [0, ~1+]
        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = Math.abs(buf[i]);
          if (v > max) max = v;
        }
        const db = max > 0 ? 20 * Math.log10(max) : -60;
        // peak-hold with decay
        if (db > peakHoldRef.current) {
          peakHoldRef.current = db;
        } else {
          peakHoldRef.current = Math.max(-60, peakHoldRef.current - 0.7);
        }
        setPeakDb(peakHoldRef.current);
      } catch {
        /* analyser closed */
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyser, active]);

  // 10 LED segments mapped to -48..0 dBFS (each segment ~4.8 dB)
  const SEGMENTS = 10;
  const MIN_DB = -48;
  const MAX_DB = 0;
  const segmentForIndex = (i) => MIN_DB + ((MAX_DB - MIN_DB) * (i + 1)) / SEGMENTS; // top-of-segment in dB
  const colorFor = (topDb) => {
    if (topDb >= -3) return "#EF4444";   // red
    if (topDb >= -12) return "#EAB308";  // yellow
    return "#10B981";                    // green
  };

  return (
    <div data-testid={testId || "peak-meter"} className="flex flex-col items-center">
      <div className="flex flex-col-reverse gap-[2px] p-1 bg-[#0A0A0C] border border-[#2A2A35] rounded-sm">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const topDb = segmentForIndex(i);
          const on = peakDb >= topDb - 0.001;
          const c = colorFor(topDb);
          return (
            <div
              key={`peak-seg-${i}`}
              className="w-3 h-1.5 rounded-[1px] transition-opacity duration-75"
              style={{
                backgroundColor: on ? c : "#1A1A20",
                boxShadow: on ? `0 0 4px ${c}` : "none",
                opacity: on ? 1 : 0.6,
              }}
            />
          );
        })}
      </div>
      <div
        className="mt-1 text-[9px] mono tracking-wider"
        style={{ color: peakDb >= -3 ? "#EF4444" : peakDb >= -12 ? "#EAB308" : "#10B981" }}
        data-testid={`${testId || "peak-meter"}-value`}
      >
        {peakDb <= -48 ? "—" : `${peakDb > 0 ? "+" : ""}${peakDb.toFixed(1)}`}
      </div>
    </div>
  );
}
