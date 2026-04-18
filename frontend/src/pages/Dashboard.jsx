import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Waveform from "../components/Waveform";
import { api } from "../lib/api";
import { UploadCloud, Loader2, FileAudio, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [tracks, setTracks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    try {
      const r = await api.get("/tracks");
      setTracks(r.data.tracks);
    } catch (e) {
      toast.error("Failed to load tracks");
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/tracks/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded — choose a preset to master");
      setTracks((t) => [r.data, ...t]);
      navigate(`/workspace/${r.data.track_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/tracks/${id}`);
      setTracks((t) => t.filter((x) => x.track_id !== id));
    } catch { toast.error("Delete failed"); }
  };

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
            <span className="text-[#E28C22]" data-testid="tier-badge">{user?.subscription_tier}</span>
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
            dragOver ? "border-[#E28C22] bg-[#E28C22]/5" : "border-[#2A2A35] bg-[#121216] hover:border-[#E28C22]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
            data-testid="upload-file-input"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#E28C22]" size={40} />
              <div className="label-overline">Uploading & analyzing...</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#E28C22]/10 border border-[#E28C22]/30 flex items-center justify-center">
                <UploadCloud size={30} color="#E28C22" />
              </div>
              <div className="text-xl font-semibold" style={{ fontFamily: "Outfit" }}>
                Drop an audio file or click to browse
              </div>
              <div className="text-sm text-[#9CA3AF]">WAV, MP3, FLAC, M4A · up to {user?.subscription_tier === "studio" ? "200" : user?.subscription_tier === "pro" ? "100" : "50"}MB</div>
            </div>
          )}
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
                  className="bg-[#121216] border border-[#2A2A35] rounded-xl p-5 hover:border-[#E28C22]/50 transition group"
                  data-testid={`track-row-${t.track_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                      t.status === "mastered" ? "bg-[#10B981]/10 border border-[#10B981]/30" : "bg-[#E28C22]/10 border border-[#E28C22]/30"
                    }`}>
                      {t.status === "mastered"
                        ? <CheckCircle2 size={20} color="#10B981" />
                        : <FileAudio size={20} color="#E28C22" />
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
                      className="bg-[#E28C22] text-[#0A0A0C] font-semibold px-4 py-2 rounded-md hover:bg-[#F5A138] transition inline-flex items-center gap-1 text-sm"
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
