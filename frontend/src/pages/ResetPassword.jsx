import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, Music4 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      if (res.data.token) localStorage.setItem("auth_token", res.data.token);
      setUser(res.data.user);
      toast.success("Password updated");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset link is invalid or expired");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-black tracking-tight mb-3" style={{ fontFamily: "Outfit" }}>
            Invalid link
          </h1>
          <p className="text-[#9CA3AF] mb-6">This reset link is missing its token. Request a new one.</p>
          <Link to="/forgot-password" className="text-[#E28C22] hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-10" data-testid="reset-password-logo-link">
          <div className="w-9 h-9 rounded-md bg-[#E28C22] flex items-center justify-center text-[#0A0A0C]">
            <Music4 size={20} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>Sonically</span>
        </Link>

        <div className="label-overline mb-3 text-[#E28C22]">Reset password</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Outfit" }}>
          Choose a new password.
        </h1>
        <p className="text-[#9CA3AF] mb-8">Make it something you'll remember.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              data-testid="reset-password-input"
              className="w-full bg-[#121216] border border-[#2A2A35] rounded-md py-3 pl-10 pr-3 text-white placeholder:text-[#6B7280] focus:border-[#E28C22] focus:outline-none transition"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              required
              data-testid="reset-password-confirm-input"
              className="w-full bg-[#121216] border border-[#2A2A35] rounded-md py-3 pl-10 pr-3 text-white placeholder:text-[#6B7280] focus:border-[#E28C22] focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            data-testid="reset-password-submit-btn"
            className="w-full btn-gradient font-bold py-3 rounded-md inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? "..." : "Reset password"} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
