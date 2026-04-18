import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ loading: true, status: null, plan: null });
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) { navigate("/pricing"); return; }
    let attempts = 0;
    const MAX_ATTEMPTS = 25;
    const poll = async () => {
      attempts++;
      try {
        const r = await api.get(`/payments/status/${sessionId}`);
        if (r.data.payment_status === "paid") {
          await refresh?.();
          setState({ loading: false, status: "paid", plan: r.data.plan });
          return;
        }
        if (r.data.status === "expired") {
          setState({ loading: false, status: "expired", plan: r.data.plan });
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          setState({ loading: false, status: "pending", plan: r.data.plan });
          return;
        }
        // Progressive backoff: 2s for first 5, then 3s, 4s, etc.
        const delay = attempts < 5 ? 2000 : Math.min(2000 + attempts * 500, 6000);
        setTimeout(poll, delay);
      } catch (e) {
        if (attempts >= MAX_ATTEMPTS) {
          setState({ loading: false, status: "error", plan: null });
          return;
        }
        setTimeout(poll, 3000);
      }
    };
    poll();
  }, [sessionId, navigate, refresh]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 md:px-10 py-24 text-center">
        {state.loading ? (
          <>
            <Loader2 size={48} className="mx-auto animate-spin text-[#E28C22] mb-6" />
            <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "Outfit" }}>
              Confirming your payment…
            </h1>
            <p className="text-[#9CA3AF]">This takes just a moment.</p>
          </>
        ) : state.status === "paid" ? (
          <>
            <CheckCircle2 size={56} className="mx-auto text-[#10B981] mb-6" />
            <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "Outfit" }} data-testid="payment-success-heading">
              You're {state.plan === "studio" ? "a Studio" : "Pro"} now.
            </h1>
            <p className="text-[#9CA3AF] mb-8">Your plan is active. Time to make something loud.</p>
            <Link
              to="/dashboard"
              data-testid="go-to-dashboard-btn"
              className="inline-flex items-center gap-2 btn-gradient font-bold px-8 py-4 rounded-md"
            >
              Back to studio <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <XCircle size={56} className="mx-auto text-red-500 mb-6" />
            <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "Outfit" }}>
              Payment not completed
            </h1>
            <p className="text-[#9CA3AF] mb-8">Status: {state.status || "unknown"}. No charges were made.</p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 border border-[#2A2A35] hover:border-[#E28C22] px-6 py-3 rounded-md"
            >
              Try again
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
