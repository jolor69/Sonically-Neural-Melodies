import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, Music4 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong", {
        duration: 6000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-10" data-testid="forgot-password-logo-link">
          <div className="w-9 h-9 rounded-md bg-[#E28C22] flex items-center justify-center text-[#0A0A0C]">
            <Music4 size={20} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>Sonically</span>
        </Link>

        {sent ? (
          <>
            <div className="label-overline mb-3 text-[#E28C22]">Check your inbox</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3" style={{ fontFamily: "Outfit" }}>
              Reset link sent.
            </h1>
            <p className="text-[#9CA3AF]" data-testid="forgot-password-sent-message">
              A password reset link is on its way to <span className="text-white">{email}</span>. It expires in 30 minutes.
            </p>
          </>
        ) : (
          <>
            <div className="label-overline mb-3 text-[#E28C22]">Reset password</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ fontFamily: "Outfit" }}>
              Forgot your password?
            </h1>
            <p className="text-[#9CA3AF] mb-8">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  data-testid="forgot-password-email-input"
                  className="w-full bg-[#121216] border border-[#2A2A35] rounded-md py-3 pl-10 pr-3 text-white placeholder:text-[#6B7280] focus:border-[#E28C22] focus:outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                data-testid="forgot-password-submit-btn"
                className="w-full btn-gradient font-bold py-3 rounded-md inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? "..." : "Send reset link"} <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}

        <div className="mt-6 text-sm text-[#9CA3AF] text-center">
          <Link to="/login" data-testid="back-to-login-link" className="text-[#E28C22] hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
