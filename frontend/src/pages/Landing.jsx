import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PresetCard from "../components/PresetCard";
import { api } from "../lib/api";
import { ArrowRight, Check, Quote, Upload, Wand2, Download } from "lucide-react";

export default function Landing() {
  const [presets, setPresets] = useState([]);
  const [plans, setPlans] = useState(null);
  const [billing, setBilling] = useState("yearly");

  useEffect(() => {
    api.get("/presets").then((r) => setPresets(r.data.presets)).catch(() => {});
    api.get("/plans").then((r) => setPlans(r.data.plans)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar variant="landing" />

      {/* HERO */}
      <section className="relative overflow-hidden grain">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1627667049672-ffa8a285567c?crop=entropy&cs=srgb&fm=jpg&q=85)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C]/60 via-[#0A0A0C]/80 to-[#0A0A0C]" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-36">
          <div className="label-overline mb-6 text-[#E28C22] fade-up">AI · Analog · Mastered</div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-4xl fade-up" style={{ fontFamily: "Outfit" }}>
            Master your sound <br />
            <span className="text-[#E28C22]">in under a minute.</span>
          </h1>
          <p className="mt-8 text-lg text-[#9CA3AF] max-w-2xl leading-relaxed fade-up" style={{ animationDelay: "150ms" }}>
            Professional mastering driven by engineer-curated presets. Upload a track, pick a vibe,
            ship it to streaming. No plugins. No sessions. No guesswork.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 fade-up" style={{ animationDelay: "300ms" }}>
            <Link
              to="/login?mode=signup"
              data-testid="hero-cta-launch"
              className="bg-[#E28C22] text-[#0A0A0C] font-bold px-8 py-4 rounded-md hover:bg-[#F5A138] transition inline-flex items-center gap-2"
            >
              Launch App <ArrowRight size={18} />
            </Link>
            <a
              href="#presets"
              data-testid="hero-cta-presets"
              className="border border-[#2A2A35] px-8 py-4 rounded-md hover:border-[#E28C22] hover:text-[#E28C22] transition inline-flex items-center gap-2"
            >
              See the 8 Presets
            </a>
          </div>

          {/* Mini waveform visual */}
          <div className="mt-16 flex items-end gap-1 h-24 max-w-3xl fade-up" style={{ animationDelay: "450ms" }}>
            {Array.from({ length: 80 }).map((_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 0.4) * 60) + Math.random() * 20;
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
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-overline mb-4">/ Workflow</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16" style={{ fontFamily: "Outfit" }}>
          Three steps from mix to master.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Upload, title: "Upload", desc: "Drop WAV, MP3, or FLAC. Up to 200MB on Studio." },
            { icon: Wand2, title: "Pick a Preset", desc: "Eight flavours from Natural to Punch. Swap instantly." },
            { icon: Download, title: "Download", desc: "Platform-ready files normalized per streaming LUFS." },
          ].map((s, i) => (
            <div key={i} className="bg-[#121216] border border-[#2A2A35] rounded-xl p-8 hover:border-[#E28C22]/60 transition" data-testid={`step-${i}`}>
              <div className="w-12 h-12 rounded-lg bg-[#E28C22]/10 border border-[#E28C22]/30 flex items-center justify-center mb-5">
                <s.icon size={22} color="#E28C22" />
              </div>
              <div className="label-overline mb-2">Step {i + 1}</div>
              <div className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>{s.title}</div>
              <div className="text-[#9CA3AF] mt-2">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRESETS */}
      <section id="presets" className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-overline mb-4">/ Signature Presets</div>
        <div className="flex flex-wrap items-end justify-between mb-14 gap-6">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl" style={{ fontFamily: "Outfit" }}>
            Your music,
            <br /> your sound.
          </h2>
          <div className="text-[#9CA3AF] max-w-md">
            Each preset is a different chain of EQ, compression, saturation and loudness targeting —
            dialed in for real genres.
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {presets.map((p, i) => (
            <div key={p.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <PresetCard preset={p} onClick={() => {}} />
            </div>
          ))}
        </div>
      </section>

      {/* ENGINEERS */}
      <section id="engineers" className="relative max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-overline mb-4">/ Engineered With The Best</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-14 max-w-3xl" style={{ fontFamily: "Outfit" }}>
          Built with Grammy-winning mastering engineers.
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              name: "Maya Parnell",
              role: "Multi-Platinum Mastering Engineer",
              quote: "My goal is to vibe with the artist's vision and push it another 20%.",
              img: "https://images.pexels.com/photos/11776927/pexels-photo-11776927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            },
            {
              name: "Jordan Ellis",
              role: "Sterling Sound · 25+ yrs",
              quote: "My job is to make sure this idea, this song, is best presented to the world.",
              img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?crop=entropy&cs=tinysrgb&fm=jpg&q=80&w=940",
            },
          ].map((e, i) => (
            <div key={i} className="bg-[#121216] border border-[#2A2A35] rounded-xl overflow-hidden group" data-testid={`engineer-${i}`}>
              <div className="aspect-[16/9] overflow-hidden">
                <img src={e.img} alt={e.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-700" />
              </div>
              <div className="p-8">
                <Quote size={22} color="#E28C22" />
                <p className="mt-4 text-lg leading-relaxed">&ldquo;{e.quote}&rdquo;</p>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg" style={{ fontFamily: "Outfit" }}>{e.name}</div>
                    <div className="label-overline">{e.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-overline mb-4 text-center">/ Plans</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-4" style={{ fontFamily: "Outfit" }}>
          Plans for every stage.
        </h2>
        <p className="text-center text-[#9CA3AF] max-w-xl mx-auto mb-10">
          Start free. Upgrade whenever you need more exports or hi-res output.
        </p>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 bg-[#121216] border border-[#2A2A35] rounded-full p-1" data-testid="billing-toggle">
            {["monthly", "yearly"].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                data-testid={`billing-${b}`}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition capitalize ${
                  billing === b
                    ? "bg-[#E28C22] text-[#0A0A0C]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {b} {b === "yearly" && <span className="label-overline ml-2 text-[10px]">Save 25%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <PriceCard
            name="Free"
            tagline="Try it out, hobby sketches"
            price="$0"
            period=""
            features={["5 exports / month", "WAV 16-bit", "All 8 presets", "LUFS normalize basic"]}
            cta="Start Free"
            ctaTo="/login?mode=signup"
            testId="price-free"
          />
          <PriceCard
            name="Pro"
            tagline="Serious creators who release music"
            price={billing === "yearly" ? "$3.75" : "$4.99"}
            period="/ month"
            billed={billing === "yearly" ? "Billed $44.99/yr" : "Billed monthly"}
            highlight
            badge="Popular"
            features={["30 exports / month", "WAV 16/24-bit, MP3 320k, FLAC", "Target LUFS per platform", "Save 25 presets"]}
            cta="Upgrade to Pro"
            ctaTo="/login?mode=signup"
            testId="price-pro"
          />
          <PriceCard
            name="Studio"
            tagline="Labels, producers, multi-project"
            price={billing === "yearly" ? "$9.99" : "$12.99"}
            period="/ month"
            billed={billing === "yearly" ? "Billed $119.99/yr" : "Billed monthly"}
            features={["Unlimited exports", "Hi-res 24/96 & 24/192", "Unlimited presets", "Priority support"]}
            cta="Upgrade to Studio"
            ctaTo="/login?mode=signup"
            testId="price-studio"
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="bg-gradient-to-br from-[#121216] to-[#1A1A20] border border-[#2A2A35] rounded-2xl p-10 md:p-16 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#E28C22]/20 blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: "Outfit" }}>
              Ready to sound finished?
            </h3>
            <p className="text-[#9CA3AF] max-w-xl mb-8">
              Upload your first track free. No credit card. Hear the difference in 30 seconds.
            </p>
            <Link
              to="/login?mode=signup"
              data-testid="footer-cta"
              className="inline-flex items-center gap-2 bg-[#E28C22] text-[#0A0A0C] font-bold px-8 py-4 rounded-md hover:bg-[#F5A138] transition"
            >
              Launch Sonically <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2A2A35] py-10 text-center text-sm text-[#9CA3AF]">
        <div className="label-overline">Sonically © 2026 — Mastered in analog spirit</div>
      </footer>
    </div>
  );
}

function PriceCard({ name, tagline, price, period, billed, features, cta, ctaTo, highlight, badge, testId }) {
  return (
    <div
      data-testid={testId}
      className={`relative bg-[#121216] border rounded-2xl p-8 flex flex-col ${
        highlight ? "border-[#E28C22]" : "border-[#2A2A35]"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-8 label-overline text-[10px] bg-[#E28C22] text-[#0A0A0C] px-3 py-1 rounded-full">
          {badge}
        </div>
      )}
      <div className="text-3xl font-bold" style={{ fontFamily: "Outfit" }}>{name}</div>
      <div className="text-[#9CA3AF] text-sm mt-1">{tagline}</div>
      <div className="mt-6 flex items-end gap-1">
        <span className="text-5xl font-black" style={{ fontFamily: "Outfit" }}>{price}</span>
        {period && <span className="text-[#9CA3AF] mb-2">{period}</span>}
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
      <Link
        to={ctaTo}
        data-testid={`${testId}-cta`}
        className={`mt-8 text-center font-semibold px-6 py-3 rounded-md transition ${
          highlight
            ? "bg-[#E28C22] text-[#0A0A0C] hover:bg-[#F5A138]"
            : "border border-[#2A2A35] hover:border-[#E28C22] hover:text-[#E28C22]"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
