import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, ShieldCheck, Clock, Tag, DollarSign, Percent, Mail } from "lucide-react";
import AdminActivityLogs from "../components/AdminActivityLogs";

const PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ draft: {}, applied: {}, defaults: {} });
  const [discounts, setDiscounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [testingReceipt, setTestingReceipt] = useState(false);

  // Duration sliders (minutes)
  const [proMin, setProMin] = useState(5);
  const [studioMin, setStudioMin] = useState(5);

  // Pricing form
  const [proPrice, setProPrice] = useState(5.49);
  const [studioPrice, setStudioPrice] = useState(14.29);
  const [yearlyDiscount, setYearlyDiscount] = useState(25);

  // New discount form
  const [newCode, setNewCode] = useState("");
  const [newPlan, setNewPlan] = useState("all");
  const [newPct, setNewPct] = useState(10);

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  const pick = (data, key, fallback) =>
    data.draft?.[key] ?? data.applied?.[key] ?? data.defaults?.[key] ?? fallback;

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([
        api.get("/admin/settings"),
        api.get("/admin/discounts"),
      ]);
      setSettings(s.data);
      setDiscounts(d.data.discounts || []);
      setProMin(Math.round(pick(s.data, "pro_max_duration_sec", 300) / 60));
      setStudioMin(Math.round(pick(s.data, "studio_max_duration_sec", 300) / 60));
      setProPrice(Number(pick(s.data, "pro_monthly_price", 5.49)));
      setStudioPrice(Number(pick(s.data, "studio_monthly_price", 14.29)));
      setYearlyDiscount(Number(pick(s.data, "yearly_discount_percent", 25)));
    } catch {
      toast.error("Failed to load admin data");
    }
  }, []);

  useEffect(() => { if (user?.is_admin) load(); }, [user, load]);

  const saveDraft = async () => {
    setBusy(true);
    try {
      await api.put("/admin/settings/draft", {
        pro_max_duration_sec: proMin * 60,
        studio_max_duration_sec: studioMin * 60,
        pro_monthly_price: Number(proPrice),
        studio_monthly_price: Number(studioPrice),
        yearly_discount_percent: Number(yearlyDiscount),
      });
      toast.success("Draft saved. Hit Apply to go live.");
      await load();
    } catch {
      toast.error("Save failed");
    } finally {
      setBusy(false);
    }
  };

  const addDiscount = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setBusy(true);
    try {
      await api.post("/admin/discounts", { code: newCode, plan: newPlan, percent: newPct });
      toast.success("Discount queued. Click Apply to activate.");
      setNewCode("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Add failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteDiscount = async (code) => {
    try {
      await api.delete(`/admin/discounts/${encodeURIComponent(code)}`);
      await load();
    } catch { toast.error("Delete failed"); }
  };

  const applyAll = async () => {
    setApplying(true);
    try {
      const r = await api.post("/admin/apply");
      toast.success(`Applied live. ${r.data.discount_activated || 0} discounts activated.`);
      await load();
    } catch {
      toast.error("Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const sendTestReceipt = async () => {
    setTestingReceipt(true);
    try {
      const r = await api.post("/admin/test-receipt");
      toast.success(`Test receipt sent to ${r.data.to}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Send failed");
    } finally {
      setTestingReceipt(false);
    }
  };

  if (loading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-[#0A0A0C]">
        <Navbar />
        <div className="p-10 text-center text-[#9CA3AF]">Checking access…</div>
      </div>
    );
  }

  // Applied values for "Currently live" displays
  const appliedProMin = Math.round((settings.applied?.pro_max_duration_sec ?? settings.defaults?.pro_max_duration_sec ?? 300) / 60);
  const appliedStudioMin = Math.round((settings.applied?.studio_max_duration_sec ?? settings.defaults?.studio_max_duration_sec ?? 300) / 60);
  const appliedProPrice = Number(settings.applied?.pro_monthly_price ?? settings.defaults?.pro_monthly_price ?? 5.49);
  const appliedStudioPrice = Number(settings.applied?.studio_monthly_price ?? settings.defaults?.studio_monthly_price ?? 14.29);
  const appliedDiscount = Number(settings.applied?.yearly_discount_percent ?? settings.defaults?.yearly_discount_percent ?? 25);

  const draftProYearly = (Number(proPrice) * 12 * (100 - Number(yearlyDiscount)) / 100).toFixed(2);
  const draftStudioYearly = (Number(studioPrice) * 12 * (100 - Number(yearlyDiscount)) / 100).toFixed(2);

  const pendingCount = discounts.filter((d) => d.pending).length;
  const hasDraftDiff = (
    proMin * 60 !== (settings.applied?.pro_max_duration_sec ?? settings.defaults?.pro_max_duration_sec ?? 300)
    || studioMin * 60 !== (settings.applied?.studio_max_duration_sec ?? settings.defaults?.studio_max_duration_sec ?? 300)
    || Math.abs(Number(proPrice) - appliedProPrice) > 0.005
    || Math.abs(Number(studioPrice) - appliedStudioPrice) > 0.005
    || Math.abs(Number(yearlyDiscount) - appliedDiscount) > 0.005
  );
  const needsApply = hasDraftDiff || pendingCount > 0 || Object.keys(settings.draft || {}).length > 0;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-28">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck size={22} className="text-[#A855F7]" />
          <span className="label-overline text-[#A855F7]">Admin · Neural Melodies</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2" style={{ fontFamily: "Outfit" }}>
          Control room.
        </h1>
        <p className="text-[#9CA3AF] mb-10">Tune pricing, duration limits, and discount codes. Nothing goes live until you hit Apply.</p>

        {/* PRICING */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="admin-pricing-section">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Pricing</h2>
          </div>
          <p className="text-sm text-[#9CA3AF] mb-6">Set monthly prices. Yearly prices are auto-calculated from the monthly price and the yearly discount below.</p>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {[
              { key: "pro", label: "Pro · monthly price", val: proPrice, set: setProPrice, applied: appliedProPrice, yearly: draftProYearly },
              { key: "studio", label: "Studio · monthly price", val: studioPrice, set: setStudioPrice, applied: appliedStudioPrice, yearly: draftStudioYearly },
            ].map((row) => (
              <div key={row.key} className="bg-[#0A0A0C] border border-[#2A2A35] rounded-xl p-5">
                <div className="label-overline mb-2">{row.label}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] text-xl font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={row.val}
                    onChange={(e) => row.set(e.target.value)}
                    data-testid={`admin-${row.key}-price-input`}
                    className="bg-transparent border-b border-[#2A2A35] focus:border-[#E28C22] outline-none text-2xl font-bold text-[#E28C22] w-full py-1 mono"
                  />
                  <span className="text-[#9CA3AF] text-sm">/ mo</span>
                </div>
                <div className="mt-3 text-xs text-[#6B7280]">
                  Yearly (auto): <span className="mono text-[#E28C22]">${row.yearly}</span> · billed annually
                </div>
                <div className="mt-1 text-xs text-[#6B7280]">
                  Currently live: <span className="mono text-[#9CA3AF]">${row.applied.toFixed(2)}/mo</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#0A0A0C] border border-[#2A2A35] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="label-overline flex items-center gap-2">
                <Percent size={14} /> Yearly discount
              </div>
              <div className="mono text-sm text-[#E28C22]" data-testid="admin-yearly-discount-value">
                {yearlyDiscount}% off
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={yearlyDiscount}
              onChange={(e) => setYearlyDiscount(parseInt(e.target.value))}
              className="w-full accent-[#E28C22]"
              data-testid="admin-yearly-discount-slider"
            />
            <div className="flex justify-between mt-2 label-overline text-[10px]">
              <span>0%</span>
              <span>50%</span>
            </div>
            <div className="mt-3 text-xs text-[#6B7280]">
              Currently live: <span className="mono text-[#9CA3AF]">{appliedDiscount}% off yearly</span>
            </div>
          </div>
        </section>

        {/* DURATION LIMITS */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="admin-duration-section">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Duration limits</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { label: "Pro tier", val: proMin, set: setProMin, applied: appliedProMin, key: "pro" },
              { label: "Studio tier", val: studioMin, set: setStudioMin, applied: appliedStudioMin, key: "studio" },
            ].map((row) => (
              <div key={row.key} className="bg-[#0A0A0C] border border-[#2A2A35] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-overline">{row.label} · max minutes</div>
                  <div className="mono text-sm text-[#E28C22]" data-testid={`admin-${row.key}-min-value`}>
                    {row.val} min
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={row.val}
                  onChange={(e) => row.set(parseInt(e.target.value))}
                  className="w-full accent-[#E28C22]"
                  data-testid={`admin-${row.key}-min-slider`}
                />
                <div className="flex justify-between mt-2 label-overline text-[10px]">
                  <span>1 min</span>
                  <span>30 min</span>
                </div>
                <div className="mt-3 text-xs text-[#6B7280]">
                  Currently live: <span className="mono text-[#9CA3AF]">{row.applied} min</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={saveDraft}
            disabled={busy || !hasDraftDiff}
            data-testid="admin-save-draft-btn"
            className="border border-[#2A2A35] px-4 py-2 rounded-md text-sm hover:border-[#E28C22] hover:text-[#E28C22] disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save pricing & limits draft"}
          </button>
          {hasDraftDiff && (
            <span className="label-overline text-[#E28C22] text-[10px]" data-testid="admin-unsaved-indicator">
              ● Unsaved draft
            </span>
          )}
        </div>

        {/* DISCOUNTS */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="admin-discount-section">
          <div className="flex items-center gap-2 mb-6">
            <Tag size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Discount codes</h2>
          </div>
          <form onSubmit={addDiscount} className="grid sm:grid-cols-[1fr_140px_120px_auto] gap-3 mb-6" data-testid="admin-discount-form">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH20"
              data-testid="admin-discount-code-input"
              className="bg-[#0A0A0C] border border-[#2A2A35] rounded-md px-3 py-2 text-sm uppercase tracking-wider focus:border-[#E28C22] outline-none"
              required
            />
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              data-testid="admin-discount-plan-select"
              className="bg-[#0A0A0C] border border-[#2A2A35] rounded-md px-3 py-2 text-sm focus:border-[#E28C22] outline-none"
            >
              <option value="all">All plans</option>
              <option value="pro">Pro only</option>
              <option value="studio">Studio only</option>
            </select>
            <select
              value={newPct}
              onChange={(e) => setNewPct(parseInt(e.target.value))}
              data-testid="admin-discount-percent-select"
              className="bg-[#0A0A0C] border border-[#2A2A35] rounded-md px-3 py-2 text-sm focus:border-[#E28C22] outline-none"
            >
              {PERCENT_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}% off</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              data-testid="admin-discount-add-btn"
              className="btn-gradient font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {discounts.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">No discount codes yet.</div>
          ) : (
            <div className="overflow-x-auto" data-testid="admin-discount-list">
              <table className="w-full text-sm">
                <thead>
                  <tr className="label-overline text-[10px] text-left border-b border-[#2A2A35]">
                    <th className="py-2">Code</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">%</th>
                    <th className="py-2">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d) => (
                    <tr key={d.code} className="border-b border-[#2A2A35]/50" data-testid={`admin-discount-row-${d.code}`}>
                      <td className="py-3 mono font-bold text-[#E28C22]">{d.code}</td>
                      <td className="py-3 capitalize">{d.plan}</td>
                      <td className="py-3 mono">{d.percent}%</td>
                      <td className="py-3">
                        {d.active ? (
                          <span className="label-overline text-[10px] text-[#10B981]">● Live</span>
                        ) : (
                          <span className="label-overline text-[10px] text-[#E28C22]">○ Pending apply</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => deleteDiscount(d.code)}
                          className="text-[#6B7280] hover:text-red-500"
                          data-testid={`admin-discount-delete-${d.code}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-[#121216] border border-[#A855F7]/40 rounded-2xl p-6 mb-8" data-testid="admin-privileges-section">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-[#A855F7] mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-1">You have admin privileges.</div>
              <div className="text-sm text-[#9CA3AF]">
                Your account <span className="text-white mono">{user?.email}</span> bypasses all tier limits — unlimited exports, all 8 presets, full Intensity + EQ controls, no payment required. Use responsibly.
              </div>
            </div>
          </div>
        </section>

        <AdminActivityLogs />

        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 mb-20" data-testid="admin-email-test-section">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={18} className="text-[#A855F7]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Email receipt preview</h2>
          </div>
          <p className="text-sm text-[#9CA3AF] mb-4">
            Send yourself a sample payment receipt to confirm the template looks right in your inbox.
          </p>
          <button
            onClick={sendTestReceipt}
            disabled={testingReceipt}
            data-testid="admin-test-receipt-btn"
            className="btn-gradient font-semibold px-5 py-2.5 rounded-md inline-flex items-center gap-2 disabled:opacity-60"
          >
            {testingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {testingReceipt ? "Sending…" : `Email me a test receipt`}
          </button>
          <div className="mt-3 text-xs text-[#6B7280]">
            Will send to: <span className="mono text-[#9CA3AF]">{user?.email}</span>
          </div>
        </section>
      </main>

      {needsApply && (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none" data-testid="admin-apply-bar">
          <div className="pointer-events-auto bg-[#121216] border border-[#E28C22] rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
            <span className="label-overline text-[11px]">
              Pending changes
            </span>
            <button
              onClick={applyAll}
              disabled={applying}
              data-testid="admin-apply-all-btn"
              className="btn-gradient font-bold px-5 py-2 rounded-full inline-flex items-center gap-2 disabled:opacity-60"
            >
              {applying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {applying ? "Applying…" : "Apply all changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
