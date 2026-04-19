import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Activity, UploadCloud, Wand2, Download, RefreshCw, ChevronDown, ChevronRight, Search, X,
} from "lucide-react";

const EVENT_ICON = {
  upload: UploadCloud,
  process: Wand2,
  download: Download,
};
const EVENT_COLOR = {
  upload: "#60A5FA",   // blue
  process: "#A855F7",  // brand purple
  download: "#10B981", // green
};

const PAGE_SIZE = 25;

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

function fmtLufs(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(1)} LUFS`;
}

function fmtDb(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${Number(v).toFixed(1)} dB`;
}

function deltaColor(delta) {
  if (delta === null || delta === undefined) return "text-[#6B7280]";
  const a = Math.abs(delta);
  if (a <= 0.5) return "text-[#10B981]";   // perfect
  if (a <= 1.5) return "text-[#E28C22]";   // acceptable
  return "text-red-400";                   // off-target
}

export default function AdminActivityLogs() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ upload: 0, process: 0, download: 0 });
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [eventType, setEventType] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [expanded, setExpanded] = useState({});

  const load = async (opts = {}) => {
    const nextOffset = opts.offset ?? offset;
    const nextEvent = opts.eventType ?? eventType;
    const nextEmail = opts.emailQuery ?? emailQuery;
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: nextOffset };
      if (nextEvent) params.event_type = nextEvent;
      if (nextEmail) params.user_email = nextEmail;
      const r = await api.get("/admin/activity", { params });
      setItems(r.data.items || []);
      setTotal(r.data.total || 0);
      setSummary(r.data.summary || { upload: 0, process: 0, download: 0 });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setOffset(0);
    setEmailQuery(emailInput.trim());
    load({ offset: 0, emailQuery: emailInput.trim() });
  };

  const clearFilters = () => {
    setOffset(0);
    setEventType("");
    setEmailQuery("");
    setEmailInput("");
    load({ offset: 0, eventType: "", emailQuery: "" });
  };

  const setType = (t) => {
    setOffset(0);
    setEventType(t);
    load({ offset: 0, eventType: t });
  };

  const nextPage = () => {
    const nxt = offset + PAGE_SIZE;
    if (nxt >= total) return;
    setOffset(nxt);
    load({ offset: nxt });
  };

  const prevPage = () => {
    const prv = Math.max(0, offset - PAGE_SIZE);
    setOffset(prv);
    load({ offset: prv });
  };

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const showing = items.length
    ? `${offset + 1}–${offset + items.length} of ${total}`
    : total > 0 ? `0 of ${total}` : "0 of 0";

  const typeButtons = useMemo(() => ([
    { id: "", label: "All", count: summary.upload + summary.process + summary.download },
    { id: "upload", label: "Uploads", count: summary.upload },
    { id: "process", label: "Masters", count: summary.process },
    { id: "download", label: "Downloads", count: summary.download },
  ]), [summary]);

  return (
    <section
      className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8"
      data-testid="admin-activity-section"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-[#A855F7]" />
        <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>
          User activity logs
        </h2>
        <button
          onClick={() => load()}
          disabled={loading}
          className="ml-auto border border-[#2A2A35] hover:border-[#A855F7] hover:text-[#A855F7] rounded-md p-2 disabled:opacity-40"
          data-testid="admin-activity-refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="text-sm text-[#9CA3AF] mb-6">
        Every upload, master, and download across all users — including the mastered file&apos;s measured LUFS
        vs the preset&apos;s target, so you can audit preset accuracy.
      </p>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 mb-4" data-testid="admin-activity-type-tabs">
        {typeButtons.map((b) => (
          <button
            key={b.id || "all"}
            onClick={() => setType(b.id)}
            data-testid={`admin-activity-tab-${b.id || "all"}`}
            className={`label-overline text-[10px] px-3 py-1.5 rounded-full border transition ${
              eventType === b.id
                ? "bg-[#A855F7] border-[#A855F7] text-white"
                : "border-[#2A2A35] text-[#9CA3AF] hover:border-[#A855F7] hover:text-[#A855F7]"
            }`}
          >
            {b.label} · <span className="mono">{b.count}</span>
          </button>
        ))}
      </div>

      {/* Email search */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center bg-[#0A0A0C] border border-[#2A2A35] rounded-md px-3 py-2 text-sm flex-1 min-w-[220px]">
          <Search size={14} className="text-[#6B7280] mr-2 shrink-0" />
          <input
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Filter by user email or name…"
            className="bg-transparent outline-none flex-1 text-sm"
            data-testid="admin-activity-email-input"
          />
          {emailQuery && (
            <button
              onClick={clearFilters}
              className="text-[#6B7280] hover:text-white shrink-0"
              aria-label="Clear"
              data-testid="admin-activity-clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={applyFilters}
          className="btn-gradient font-semibold px-4 py-2 rounded-md text-sm"
          data-testid="admin-activity-apply-filters"
        >
          Search
        </button>
      </div>

      {/* Table */}
      {loading && items.length === 0 ? (
        <div className="py-12 text-center text-[#6B7280]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-[#6B7280]" data-testid="admin-activity-empty">
          No activity yet for the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#2A2A35] rounded-xl">
          <table className="w-full text-sm" data-testid="admin-activity-table">
            <thead className="bg-[#0A0A0C]">
              <tr className="label-overline text-[10px] text-left">
                <th className="py-3 px-3 w-8" />
                <th className="py-3 px-3">When</th>
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Event</th>
                <th className="py-3 px-3">File</th>
                <th className="py-3 px-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const Icon = EVENT_ICON[it.event_type] || Activity;
                const color = EVENT_COLOR[it.event_type] || "#9CA3AF";
                const isOpen = !!expanded[it.log_id];
                return (
                  <React.Fragment key={it.log_id}>
                    <tr
                      className="border-t border-[#2A2A35]/60 hover:bg-[#1A1A20]/50 cursor-pointer"
                      onClick={() => toggle(it.log_id)}
                      data-testid={`admin-activity-row-${it.log_id}`}
                    >
                      <td className="py-3 px-3 align-top">
                        {isOpen ? <ChevronDown size={14} className="text-[#9CA3AF]" /> : <ChevronRight size={14} className="text-[#6B7280]" />}
                      </td>
                      <td className="py-3 px-3 align-top mono text-xs whitespace-nowrap">
                        {fmtTime(it.timestamp)}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="truncate max-w-[180px]">{it.user_email || "—"}</div>
                        <div className="text-[10px] text-[#6B7280] truncate max-w-[180px]">
                          {it.is_admin ? "ADMIN" : (it.subscription_tier || "free").toUpperCase()}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span
                          className="inline-flex items-center gap-1.5 label-overline text-[10px] px-2 py-1 rounded-full border"
                          style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
                          data-testid={`admin-activity-event-${it.event_type}`}
                        >
                          <Icon size={11} />
                          {it.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="truncate max-w-[200px]" title={it.track_filename}>
                          {it.track_filename || "—"}
                        </div>
                        <div className="text-[10px] text-[#6B7280] mono">
                          {it.event_type === "upload" && `${it.file_ext?.toUpperCase() || ""} · ${fmtDuration(it.duration_sec)} · ${it.file_size_mb ?? "—"} MB`}
                          {it.event_type === "process" && `Preset: ${it.preset_name || it.preset_id} · ${fmtDuration(it.duration_sec)}`}
                          {it.event_type === "download" && `${it.download_format_label || it.download_format} · ${it.file_size_mb ?? "—"} MB`}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top text-xs">
                        {it.event_type === "upload" && (
                          <span className="text-[#9CA3AF]">
                            Auto-gain <span className="mono text-[#E28C22]">{fmtDb(it.auto_input_gain_db)}</span>
                          </span>
                        )}
                        {(it.event_type === "process" || it.event_type === "download") && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-[#9CA3AF]">
                              Target <span className="mono">{fmtLufs(it.preset_target_lufs)}</span>
                            </span>
                            <span className="text-[#9CA3AF]">
                              Measured <span className="mono text-white">{fmtLufs(it.measured_lufs)}</span>
                            </span>
                            <span className={`${deltaColor(it.lufs_delta)} mono`}>
                              {it.lufs_delta === null || it.lufs_delta === undefined
                                ? ""
                                : `Δ ${it.lufs_delta > 0 ? "+" : ""}${Number(it.lufs_delta).toFixed(1)}`}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#0A0A0C]" data-testid={`admin-activity-expanded-${it.log_id}`}>
                        <td />
                        <td colSpan={5} className="py-4 px-3">
                          <DetailsGrid item={it} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pager */}
      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="text-[#6B7280]" data-testid="admin-activity-showing">Showing {showing}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={offset === 0 || loading}
            className="border border-[#2A2A35] hover:border-[#A855F7] hover:text-[#A855F7] rounded-md px-3 py-1.5 disabled:opacity-40"
            data-testid="admin-activity-prev"
          >
            ← Prev
          </button>
          <button
            onClick={nextPage}
            disabled={offset + PAGE_SIZE >= total || loading}
            className="border border-[#2A2A35] hover:border-[#A855F7] hover:text-[#A855F7] rounded-md px-3 py-1.5 disabled:opacity-40"
            data-testid="admin-activity-next"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}

function DetailsGrid({ item }) {
  const rows = [];
  rows.push(["Log ID", <span className="mono text-[#6B7280]">{item.log_id}</span>]);
  rows.push(["Track ID", <span className="mono text-[#6B7280]">{item.track_id || "—"}</span>]);
  rows.push(["User", `${item.user_name || "—"} · ${item.user_email || "—"}`]);
  rows.push(["Tier", item.is_admin ? "ADMIN" : (item.subscription_tier || "free").toUpperCase()]);

  if (item.event_type === "upload") {
    rows.push(["File type", (item.file_ext || "—").toUpperCase()]);
    rows.push(["File size", `${item.file_size_mb ?? "—"} MB`]);
    rows.push(["Duration", fmtDuration(item.duration_sec)]);
    rows.push(["Auto input-gain", fmtDb(item.auto_input_gain_db)]);
  }
  if (item.event_type === "process") {
    rows.push(["Preset", `${item.preset_name || "—"} (${item.preset_id || "—"})`]);
    rows.push(["Target LUFS", fmtLufs(item.preset_target_lufs)]);
    rows.push(["Measured LUFS", fmtLufs(item.measured_lufs)]);
    rows.push(["True peak", fmtDb(item.measured_true_peak_db)]);
    rows.push(["LRA", item.measured_lra === null || item.measured_lra === undefined ? "—" : `${Number(item.measured_lra).toFixed(1)} LU`]);
    rows.push(["Δ vs target", item.lufs_delta === null || item.lufs_delta === undefined ? "—" : `${item.lufs_delta > 0 ? "+" : ""}${Number(item.lufs_delta).toFixed(2)} LU`]);
    const p = item.params || {};
    const parts = [];
    if (p.intensity !== null && p.intensity !== undefined) parts.push(`intensity ${Number(p.intensity).toFixed(2)}×`);
    if (p.input_gain !== null && p.input_gain !== undefined) parts.push(`gain ${fmtDb(p.input_gain)}`);
    if (p.eq_low !== null && p.eq_low !== undefined) parts.push(`EQ low ${fmtDb(p.eq_low)}`);
    if (p.eq_mid !== null && p.eq_mid !== undefined) parts.push(`EQ mid ${fmtDb(p.eq_mid)}`);
    if (p.eq_high !== null && p.eq_high !== undefined) parts.push(`EQ high ${fmtDb(p.eq_high)}`);
    rows.push(["Custom params", parts.length ? parts.join(" · ") : "none (defaults)"]);
  }
  if (item.event_type === "download") {
    rows.push(["Format", item.download_format_label || item.download_format]);
    rows.push(["Extension", `.${item.download_ext || "—"}`]);
    rows.push(["File size", `${item.file_size_mb ?? "—"} MB`]);
    rows.push(["Preset used", `${item.preset_name || "—"} (${item.preset_id || "—"})`]);
    rows.push(["Target LUFS", fmtLufs(item.preset_target_lufs)]);
    rows.push(["Measured LUFS", fmtLufs(item.measured_lufs)]);
    rows.push(["True peak", fmtDb(item.measured_true_peak_db)]);
    rows.push(["LRA", item.measured_lra === null || item.measured_lra === undefined ? "—" : `${Number(item.measured_lra).toFixed(1)} LU`]);
    rows.push(["Δ vs target", item.lufs_delta === null || item.lufs_delta === undefined ? "—" : `${item.lufs_delta > 0 ? "+" : ""}${Number(item.lufs_delta).toFixed(2)} LU`]);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline gap-3 text-[13px]">
          <span className="label-overline text-[10px] text-[#6B7280] shrink-0 w-32">{k}</span>
          <span className="text-white break-all">{v}</span>
        </div>
      ))}
    </div>
  );
}
