import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Music4, Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        await signup(form.email, form.password, form.name || form.email.split("@")[0]);
        toast.success("Welcome to Sonically");
      } else {
        await login(form.email, form.password);
        toast.success("Logged in");
      }
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white grid md:grid-cols-2">
      {/* Left panel — brand */}
      <div className="hidden md:flex relative overflow-hidden flex-col justify-between p-12 bg-[#0A0A0C] border-r border-[#2A2A35]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1627667049672-ffa8a285567c?crop=entropy&cs=srgb&fm=jpg&q=85)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C]/80 via-[#0A0A0C]/70 to-[#0A0A0C]" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2" data-testid="auth-logo-link">
            <div className="w-9 h-9 rounded-md bg-[#E28C22] flex items-center justify-center text-[#0A0A0C]">
              <Music4 size={20} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "Outfit" }}>
                Sonically
              </span>
              <span className="label-overline text-[9px] mt-0.5 text-[#A855F7]">
                by Neural Melodies
              </span>
            </div>
          </Link>
        </div>

        <div className="relative">
          <div className="label-overline mb-3 text-[#E28C22]">What's inside</div>
          <div className="text-4xl font-bold tracking-tight leading-tight" style={{ fontFamily: "Outfit" }}>
            Eight signature <br /> masters, one studio.
          </div>
          <p className="mt-6 text-[#9CA3AF] max-w-md leading-relaxed">
            Sign up to upload your first track and hear a real, processed master in under a minute.
            Free forever tier, no card required.
          </p>

          {/* Waveform decoration */}
          <div className="mt-10 flex items-end gap-1 h-20">
            {Array.from({ length: 50 }).map((_, i) => {
              const h = 10 + Math.abs(Math.sin(i * 0.3) * 40) + Math.random() * 20;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}px`,
                    background: `linear-gradient(to top, #E28C2244, #E28C22)`,
                  }}
                />
              );
            })}
          </div>

          {/* Neural Melodies attribution */}
          <div className="mt-10 flex items-center gap-3 border-t border-[#2A2A35] pt-6" data-testid="auth-neural-melodies-brand">
            <div className="bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0" style={{ width: 48, height: 48 }}>
              <img
                src="https://customer-assets.emergentagent.com/job_audio-enhance-34/artifacts/zn8793na_Neural%20Logo.JPG"
                alt="Neural Melodies"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="label-overline text-[10px] text-[#A855F7]">A Neural Melodies product</span>
              <span className="text-sm text-[#9CA3AF]">Pushing music forward with neural audio tools.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <div className="label-overline mb-3 text-[#E28C22]">
            {mode === "signup" ? "Create account" : "Welcome back"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2" style={{ fontFamily: "Outfit" }}>
            {mode === "signup" ? "Start mastering." : "Log back in."}
          </h1>
          <p className="text-[#9CA3AF] mb-8">
            {mode === "signup"
              ? "No credit card. Upload in 30 seconds."
              : "Pick up where you left off."}
          </p>

          <button
            onClick={onGoogle}
            data-testid="google-signin-btn"
            className="w-full border border-[#2A2A35] bg-[#121216] hover:border-[#E28C22] hover:bg-[#1A1A20] rounded-md py-3 px-4 flex items-center justify-center gap-3 transition mb-6"
          >
            <GoogleIcon />
            <span className="font-semibold">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-[#2A2A35]" />
            <span className="label-overline text-[10px]">or email</span>
            <div className="h-px flex-1 bg-[#2A2A35]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <FormField icon={User} placeholder="Your name" value={form.name}
                onChange={(v) => setForm({ ...form, name: v })} testId="auth-name-input" />
            )}
            <FormField icon={Mail} placeholder="Email" type="email" value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} testId="auth-email-input" />
            <FormField icon={Lock} placeholder="Password" type="password" value={form.password}
              onChange={(v) => setForm({ ...form, password: v })} testId="auth-password-input" />

            <button
              type="submit"
              disabled={busy}
              data-testid="auth-submit-btn"
              className="w-full bg-[#E28C22] text-[#0A0A0C] font-bold py-3 rounded-md hover:bg-[#F5A138] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? "..." : (mode === "signup" ? "Create account" : "Log in")} <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 text-sm text-[#9CA3AF] text-center">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} data-testid="switch-login" className="text-[#E28C22] hover:underline">
                  Log in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button onClick={() => setMode("signup")} data-testid="switch-signup" className="text-[#E28C22] hover:underline">
                  Create an account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ icon: Icon, placeholder, type = "text", value, onChange, testId }) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        required
        className="w-full bg-[#121216] border border-[#2A2A35] rounded-md py-3 pl-10 pr-3 text-white placeholder:text-[#6B7280] focus:border-[#E28C22] focus:outline-none transition"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.264h2.909c1.702-1.567 2.687-3.874 2.687-6.621z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.164 6.656 3.58 9 3.58z" />
    </svg>
  );
}
