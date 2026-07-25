import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Waveform from "../components/Waveform";
import { api } from "../lib/api";
import { UploadCloud, Loader2, FileAudio, Trash2, ArrowRight, CheckCircle2, X, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState([]); // [{ id, name, size, status: queued|uploading|done|failed, error?, track_id? }]
  const [overallBusy, setOverallBusy] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canBatch = user && (user.is_admin || ["pro", "studio"].includes(user.subscription_tier));

  const load = async () => {
    try {
      const r = await api.get("/tracks");
      setTracks(r.data.tracks);
    } catch {
      toast.error("Failed to load tracks");
    }
  };

  useEffect(() => { load(); }, []);

  const uploadOne = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post("/tracks/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  };

  const runQueue = async (items) => {
    setOverallBusy(true);
    const results = [];
    for (const item of items) {
      setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "uploading" } : x));
      try {
        const data = await uploadOne(item.file);
        setTracks((t) => [data, ...t]);
        setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "done", track_id: data.track_id } : x));
        results.push({ id: item.id, status: "done", track_id: data.track_id });
      } catch (e) {
        const msg = e?.response?.data?.detail || "Upload failed";
        setQueue((q) => q.map((x) => x.id === item.id ? { ...x, status: "failed", error: msg } : x));
        results.push({ id: item.id, status: "failed", error: msg });
      }
    }
    setOverallBusy(false);
    return results;
  };

  const handleFiles = (files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    // Free tier: only 1 at a time (show paywall toast)
    const effective = canBatch ? list : list.slice(0, 1);
    if (!canBatch && list.length > 1) {
      toast.info("Batch upload is Pro · opening just the first file. Upgrade for multi-file queue.");
    }
    const items = effective.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      size: f.size,
      file: f,
      status: "queued",
    }));
    if (effective.length === 1 && canBatch === false) {
      // Keep old UX for free tier — auto-open after upload
      setQueue(items);
      runQueue(items).then((results) => {
        const first = results[0];
        if (first?.status === "done") {
          setTimeout(() => navigate(`/workspace/${first.track_id}`), 300);
        }
      });
    } else {
      setQueue((q) => [...items, ...q]);
      runQueue(items);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/tracks/${id}`);
      setTracks((t) => t.filter((x) => x.track_id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const removeFromQueue = (id) => setQueue((q) => q.filter((x) => x.id !== id));
  const clearDone = () => setQueue((q) => q.filter((x) => x.status !== "done"));

  const isAdmin = !!user?.is_admin;
  const tier = user?.subscription_tier || "free";
  // Admin always sees the Studio-level limits since the backend bypasses quotas for them.
  const effectiveTier = isAdmin ? "studio" : tier;
  const maxMB = effectiveTier === "studio" ? 200 : effectiveTier === "pro" ? 200 : 50;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="label-overline mb-2">/ Studio</div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>
              Hey {user?.name?.split(" ")[0]}, ready to master?
            </h1>
          </div>
          <div className="flex items-center gap-2 label-overline">
            <span className="text-[#9CA3AF]">Plan</span>
            <span className={`font-bold ${user?.is_admin ? "text-[#A855F7]" : "text-brand-gradient"}`} data-testid="tier-badge">
              {user?.is_admin ? "ADMIN" : user?.subscription_tier}
            </span>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          data-testid="upload-dropzone"
          className={`cursor-pointer rounded-2xl p-12 text-center border-2 border-dashed transition ${
            dragOver ? "border-[#A855F7] bg-[#A855F7]/5" : "border-[#2A2A35] bg-[#121216] hover:border-[#A855F7]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac"
            multiple={canBatch}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="upload-file-input"
          />
          {overallBusy ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#A855F7]" size={40} />
              <div className="label-overline">Processing queue…</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center">
                <UploadCloud size={30} color="#0A0A0C" />
              </div>
              <div className="text-xl font-semibold" style={{ fontFamily: "Outfit" }}>
                Drop {canBatch ? "audio files" : "an audio file"} or click to browse
              </div>
              <div className="text-sm text-[#9CA3AF]">
                WAV, MP3, FLAC, M4A · up to {maxMB}MB
                {effectiveTier === "free" ? " · max 5 min" : " · max 10 min"}
                {canBatch ? " · batch upload enabled" : ""}
              </div>
              {!canBatch && (
                <div className="text-xs text-[#A855F7]" data-testid="batch-upgrade-hint">
                  Upgrade to Pro for batch upload (queue multiple tracks at once)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload queue */}
        {queue.length > 0 && (
          <section className="mt-6 bg-[#121216] border border-[#2A2A35] rounded-xl p-5" data-testid="upload-queue">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Upload queue · {queue.length}
              </h2>
              {queue.some((x) => x.status === "done") && (
                <button
                  onClick={clearDone}
                  className="text-xs text-[#9CA3AF] hover:text-white"
                  data-testid="clear-done-btn"
                >
                  Clear done
                </button>
              )}
            </div>
            <div className="space-y-2">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-[#0A0A0C] border border-[#2A2A35] rounded-md px-3 py-2 text-sm" data-testid={`queue-item-${item.status}`}>
                  <div className="shrink-0">
                    {item.status === "queued" && <div className="w-4 h-4 rounded-full border border-[#6B7280]" />}
                    {item.status === "uploading" && <Loader2 size={16} className="animate-spin text-[#A855F7]" />}
                    {item.status === "done" && <CheckCircle2 size={16} className="text-[#10B981]" />}
                    {item.status === "failed" && <CircleAlert size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.name}</div>
                    {item.status === "failed" && <div className="text-xs text-red-400 mt-0.5">{item.error}</div>}
                  </div>
                  <div className="text-xs text-[#6B7280] mono shrink-0">
                    {(item.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                  {item.status === "done" && item.track_id && (
                    <button
                      onClick={() => navigate(`/workspace/${item.track_id}`)}
                      className="text-xs text-[#A855F7] hover:underline shrink-0"
                      data-testid={`queue-open-${item.track_id}`}
                    >
                      Open →
                    </button>
                  )}
                  {(item.status === "queued" || item.status === "failed") && (
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="text-[#6B7280] hover:text-red-500 shrink-0"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-[#6B7280] label-overline" data-testid="dashboard-wait-notice">
          ⏱ Mastering can take up to 20 minutes per track on all tiers.
        </div>

        {/* Recent tracks */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Recent tracks</h2>
            <span className="label-overline">{tracks.length} total</span>
          </div>
          {tracks.length === 0 ? (
            <div className="bg-[#121216] border border-[#2A2A35] rounded-xl p-12 text-center text-[#9CA3AF]">
              <FileAudio className="mx-auto mb-4" size={40} />
              <div>No tracks yet. Upload one above to get started.</div>
            </div>
          ) : (
            <div className="space-y-3" data-testid="tracks-list">
              {tracks.map((t) => (
                <div
                  key={t.track_id}
                  className="bg-[#121216] border border-[#2A2A35] rounded-xl p-5 hover:border-[#A855F7]/50 transition group"
                  data-testid={`track-row-${t.track_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      t.status === "mastered" ? "bg-[#10B981]/10 border border-[#10B981]/30" : "bg-[#A855F7]/10 border border-[#A855F7]/30"
                    }`}>
                      {t.status === "mastered"
                        ? <CheckCircle2 size={20} color="#10B981" />
                        : <FileAudio size={20} color="#A855F7" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold" style={{ fontFamily: "Outfit" }}>
                        {t.original_filename}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#9CA3AF]">
                        <span className="label-overline">{t.status}</span>
                        {t.preset_id && <span className="label-overline text-[#E28C22]">· {t.preset_id}</span>}
                        {t.duration_sec > 0 && <span className="mono">{Math.round(t.duration_sec)}s</span>}
                      </div>
                    </div>
                    <div className="hidden md:block flex-1 max-w-xs">
                      <Waveform peaks={t.peaks_original} height={40} testId={`wave-${t.track_id}`} />
                    </div>
                    <button
                      onClick={() => navigate(`/workspace/${t.track_id}`)}
                      className="btn-gradient font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1 text-sm"
                      data-testid={`open-track-${t.track_id}`}
                    >
                      Open <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(t.track_id)}
                      className="p-2 text-[#6B7280] hover:text-red-500 transition"
                      data-testid={`delete-track-${t.track_id}`}
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
