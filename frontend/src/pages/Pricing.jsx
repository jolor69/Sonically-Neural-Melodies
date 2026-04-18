import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Check, CircleAlert } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import PayPalCheckoutButton from "../components/PayPalCheckoutButton";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Link } from "react-router-dom";

export default function Pricing() {
  const { user, refresh } = useAuth();
  const [billing, setBilling] = useState("yearly");
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [plans, setPlans] = useState(null); // from /api/plans

  useEffect(() => { refresh?.(); }, []);

  useEffect(() => {
    api.get("/payments/paypal/config")
      .then((r) => setPaypalConfig(r.data))
      .catch(() => setPaypalConfig(null));
  }, []);

  useEffect(() => {
    api.get("/plans")
      .then((r) => setPlans(r.data.plans))
      .catch(() => setPlans(null));
  }, []);

  const validateCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setDiscount(null); return; }
    setValidating(true);
    try {
      const r = await api.post("/payments/validate-discount", { code: trimmed, plan: "pro", billing });
      if (r.data.valid) {
        setDiscount({ code: r.data.code, percent: r.data.percent });
        toast.success(`${r.data.percent}% off applied`);
        return;
      }
      const r2 = await api.post("/payments/validate-discount", { code: trimmed, plan: "studio", billing });
      if (r2.data.valid) {
        setDiscount({ code: r2.data.code, percent: r2.data.percent, plan: "studio" });
        toast.success(`${r2.data.percent}% off applied (Studio)`);
        return;
      }
      setDiscount(null);
      toast.error("Invalid or inactive code");
    } catch {
      toast.error("Couldn't validate code");
    } finally {
      setValidating(false);
    }
  };

  const applyDiscountPrice = (base) => discount?.percent
    ? Number((base * (100 - discount.percent) / 100).toFixed(2))
    : Number(base);

  // Derived display prices from live /api/plans response
  const proMonthly = Number(plans?.pro?.monthly?.amount ?? 5.49);
  const proYearly = Number(plans?.pro?.yearly?.amount ?? 49.49);
  const studioMonthly = Number(plans?.studio?.monthly?.amount ?? 14.29);
  const studioYearly = Number(plans?.studio?.yearly?.amount ?? 131.99);

  const proPerMo = billing === "yearly" ? Number((proYearly / 12).toFixed(2)) : proMonthly;
  const studioPerMo = billing === "yearly" ? Number((studioYearly / 12).toFixed(2)) : studioMonthly;

  // Yearly savings % (computed from live prices)
  const yearlySavePct = proMonthly > 0
    ? Math.round((1 - (proYearly / 12) / proMonthly) * 100)
    : 25;

  const pricingInner = (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="text-center">
          <div className="label-overline mb-3">/ Plans</div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4" style={{ fontFamily: "Outfit" }}>
            Plans for every stage.
          </h1>
          <p className="text-[#9CA3AF] max-w-xl mx-auto mb-10">
            {user?.subscription_tier && user.subscription_tier !== "free"
              ? `You're on ${user.subscription_tier}. Thanks for supporting Sonically.`
              : "Start free. Upgrade whenever you need more exports or higher resolution output."}
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1 bg-[#121216] border border-[#2A2A35] rounded-full p-1" data-testid="pricing-billing-toggle">
            {["monthly", "yearly"].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                data-testid={`pricing-billing-${b}`}
                className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition ${
                  billing === b ? "bg-[#E28C22] text-[#0A0A0C]" : "text-white/70 hover:text-white"
                }`}
              >
                {b} {b === "yearly" && yearlySavePct > 0 && (
                  <span
                    className={`ml-2 text-[10px] font-bold tracking-widest ${
                      billing === b ? "text-[#0A0A0C]" : "text-[#E28C22]"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    SAVE {yearlySavePct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Discount code input */}
        <div className="flex justify-center mb-12" data-testid="pricing-discount-section">
          {discount ? (
            <div className="inline-flex items-center gap-3 bg-[#0B241A] border border-[#10B981] rounded-full px-4 py-2 text-sm" data-testid="pricing-discount-active">
              <span className="label-overline text-[10px] text-[#10B981]">Applied</span>
              <span className="mono font-bold text-[#10B981]">{discount.code}</span>
              <span className="text-[#9CA3AF]">· {discount.percent}% off</span>
              <button
                onClick={() => { setDiscount(null); setCode(""); }}
                className="text-[#6B7280] hover:text-white text-xs"
                data-testid="pricing-discount-remove"
              >
                remove
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-[#121216] border border-[#2A2A35] rounded-full p-1 pl-4">
              <span className="label-overline text-[10px]">Promo code</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && validateCode()}
                placeholder="LAUNCH20"
                maxLength={30}
                data-testid="pricing-discount-input"
                className="bg-transparent text-sm uppercase tracking-wider w-32 outline-none placeholder:text-[#6B7280]"
              />
              <button
                onClick={validateCode}
                disabled={validating || !code.trim()}
                data-testid="pricing-discount-apply"
                className="btn-gradient font-semibold text-sm px-4 py-1.5 rounded-full disabled:opacity-50"
              >
                {validating ? "…" : "Apply"}
              </button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <PriceCard
            name="Free"
            tagline="Try it out, hobby sketches"
            price="$0"
            period=""
            features={[
              "3 exports / month",
              "WAV 16-bit",
              "4 presets: Universal · Fire · Clarity · Tape",
              "Tracks up to 2 minutes",
            ]}
            testId="plan-free"
            current={user?.subscription_tier === "free"}
          />
          <PriceCard
            name="Pro"
            tagline="Serious creators who release"
            price={`$${applyDiscountPrice(proPerMo)}`}
            period="/ month"
            billed={billing === "yearly" ? `Billed $${applyDiscountPrice(proYearly)}/yr` : "Billed monthly"}
            strike={discount ? `$${proPerMo.toFixed(2)}` : null}
            highlight
            badge="Popular"
            features={[
              "20 exports / month",
              "WAV 16/24-bit · MP3 320k · FLAC",
              "All 8 presets + Intensity & EQ",
              "Batch upload (queue multiple tracks)",
            ]}
            testId="plan-pro"
            current={user?.subscription_tier === "pro"}
            paypalNode={paypalConfig?.client_id ? (
              <PayPalCheckoutButton
                plan="pro"
                billing={billing}
                discountCode={discount?.code}
                disabled={user?.subscription_tier === "pro"}
                testId="plan-pro"
              />
            ) : null}
          />
          <PriceCard
            name="Studio"
            tagline="Labels, producers, multi-project"
            price={`$${applyDiscountPrice(studioPerMo)}`}
            period="/ month"
            billed={billing === "yearly" ? `Billed $${applyDiscountPrice(studioYearly)}/yr` : "Billed monthly"}
            strike={discount ? `$${studioPerMo.toFixed(2)}` : null}
            features={[
              "Unlimited exports",
              "Hi-res 24/96 & 24/192",
              "All 8 presets + full controls",
              "Batch upload + priority processing",
            ]}
            testId="plan-studio"
            current={user?.subscription_tier === "studio"}
            paypalNode={paypalConfig?.client_id ? (
              <PayPalCheckoutButton
                plan="studio"
                billing={billing}
                discountCode={discount?.code}
                disabled={user?.subscription_tier === "studio"}
                testId="plan-studio"
              />
            ) : null}
          />
        </div>

        <div className="mt-8 text-center text-xs text-[#6B7280] label-overline" data-testid="wait-time-pricing-notice">
          Note · All tiers may take up to 20 minutes per master
        </div>

        <div className="mt-12 text-center bg-[#121216] border border-[#2A2A35] rounded-xl p-6 max-w-3xl mx-auto flex items-center gap-3 justify-center text-sm text-[#9CA3AF]">
          <CircleAlert size={16} className="text-[#E28C22]" />
          <span>
            Secure checkout via <span className="font-semibold text-white">PayPal</span>. Cancel anytime — see our <Link to="/terms" className="text-[#E28C22] hover:underline">Terms &amp; Refund Policy</Link>.
          </span>
        </div>
      </main>
    </div>
  );

  if (!paypalConfig?.client_id) {
    return pricingInner;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalConfig.client_id,
        currency: paypalConfig.currency || "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      {pricingInner}
    </PayPalScriptProvider>
  );
}

function PriceCard({ name, tagline, price, period, billed, features, highlight, badge, testId, strike, paypalNode, current }) {
  return (
    <div
      data-testid={testId}
      className={`relative bg-[#121216] border rounded-2xl p-8 flex flex-col ${
        highlight ? "border-[#E28C22]" : "border-[#2A2A35]"
      }`}
    >
      {badge && (
        <div
          className="absolute -top-3 left-8 text-[10px] tracking-widest uppercase font-black bg-[#E28C22] text-[#0A0A0C] px-3 py-1 rounded-full"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {badge}
        </div>
      )}
      <div className="text-3xl font-bold" style={{ fontFamily: "Outfit" }}>{name}</div>
      <div className="text-[#9CA3AF] text-sm mt-1">{tagline}</div>
      <div className="mt-6 flex items-end gap-2">
        <span className="text-5xl font-black" style={{ fontFamily: "Outfit" }}>{price}</span>
        {period && <span className="text-[#9CA3AF] mb-2">{period}</span>}
        {strike && (
          <span className="text-xl line-through text-[#6B7280] mb-1" data-testid={`${testId}-strike`}>{strike}</span>
        )}
      </div>
      {billed && <div className="label-overline mt-1 text-[10px]">{billed}</div>}
      <ul className="mt-8 space-y-3 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check size={16} className="mt-1 text-[#E28C22] shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {current ? (
          <div
            data-testid={`${testId}-current-plan`}
            className="w-full text-center font-semibold px-6 py-3 rounded-md border border-[#10B981] text-[#10B981] bg-[#0B241A]"
          >
            Current plan
          </div>
        ) : paypalNode ? (
          <div data-testid={`${testId}-paypal-slot`}>
            <div className="label-overline text-[10px] text-[#6B7280] text-center mb-2">checkout with</div>
            {paypalNode}
          </div>
        ) : (
          <div className="text-center text-xs text-[#6B7280] py-3">Free tier — no checkout needed</div>
        )}
      </div>
    </div>
  );
}
