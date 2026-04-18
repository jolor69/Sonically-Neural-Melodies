import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PresetCard from "../components/PresetCard";
import { api } from "../lib/api";
import { ArrowRight, Check, Quote, Upload, Wand2, Download, Clock } from "lucide-react";

const PRESET_DETAILS = [
  {
    id: "universal",
    name: "Universal",
    color: "#3B82F6",
    genres: ["Rock", "Pop", "Electronic"],
    lufs: "-14 LUFS",
    headline: "The safe-bet master. Natural tonal balance that translates everywhere — earbuds, car, club.",
    chain: [
      "Subtle low-shelf lift at 80 Hz · +1.5 dB for gentle warmth",
      "Presence bump at 3 kHz · +1.2 dB for vocal clarity",
      "Air band at 10 kHz · +1.5 dB for streaming sheen",
      "Glue compressor · 3:1 ratio, slow attack, moderate release",
      "Loudness normalize to -14 LUFS (Spotify / YouTube standard)",
    ],
    best_for: "Any genre you're unsure about. Great for demos.",
    img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "fire",
    name: "Fire",
    color: "#EF4444",
    genres: ["Trap", "Experimental", "Reggaeton"],
    lufs: "-9 LUFS",
    headline: "Club-loud. Punchy 60 Hz thump with a scooped low-mid and crisp top for club PA systems.",
    chain: [
      "Sub-bass boost at 60 Hz · +3.5 dB",
      "Low-mid scoop at 200 Hz · -1.5 dB to clean mud",
      "Presence lift at 2.5 kHz · +2 dB for rap attack",
      "Aggressive compressor · 4:1, 8 ms attack",
      "Normalize to -9 LUFS (hit the limiter like a trap master)",
    ],
    best_for: "Trap, drill, reggaeton, anything that needs to slap.",
    img: "https://images.unsplash.com/photo-1571266028243-d220bc562db8?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "clarity",
    name: "Clarity",
    color: "#06B6D4",
    genres: ["Classical", "R&B", "Singer-songwriter"],
    lufs: "-16 LUFS",
    headline: "Transparent. Low compression, airy highs, extended dynamic range for nuanced performances.",
    chain: [
      "Gentle 120 Hz low-cut · -1 dB to avoid muddiness",
      "Upper-mid lift at 4 kHz · +2 dB for vocal breath",
      "Air band at 12 kHz · +3 dB for shimmer",
      "Light expander · 2:1, 30 ms attack, preserves dynamics",
      "Normalize to -16 LUFS (Apple Music target)",
    ],
    best_for: "Classical, piano ballads, jazz vocals, intimate recordings.",
    img: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "tape",
    name: "Tape",
    color: "#F59E0B",
    genres: ["Jazz", "Alternative", "Indie", "Rock"],
    lufs: "-13 LUFS",
    headline: "Warm analog feel. Subtle harmonic saturation with gentle top-end roll-off for a vintage vibe.",
    chain: [
      "Warm low-shelf at 100 Hz · +2 dB",
      "Gentle top roll-off at 8 kHz · -1.5 dB (tape ceiling)",
      "Analog compressor · 2.5:1, 40 ms attack",
      "Subtle tape echo · 40 ms delay, 20% feedback",
      "Normalize to -13 LUFS for vinyl-master feel",
    ],
    best_for: "Indie rock, lo-fi, anything vintage or analog-leaning.",
    img: "https://images.unsplash.com/photo-1619983081563-430f63602796?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "natural",
    name: "Natural",
    color: "#10B981",
    genres: ["Acoustic", "Jazz", "Singer-songwriter"],
    lufs: "-16 LUFS",
    headline: "Minimal-touch. Light compression and barely-there EQ that keeps the performance front and centre.",
    chain: [
      "Gentle low lift at 200 Hz · +0.8 dB for body",
      "Presence at 5 kHz · +0.8 dB",
      "Soft compressor · 1.8:1, very slow attack",
      "Normalize to -16 LUFS with 12 LRA (wide dynamics)",
    ],
    best_for: "Acoustic, unplugged, small-room recordings.",
    img: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "spatial",
    name: "Spatial",
    color: "#8B5CF6",
    genres: ["Ambient", "Experimental", "Electronic"],
    lufs: "-14 LUFS",
    headline: "Wide & atmospheric. Enhanced stereo field and subtle reverb tail for immersive headphone listening.",
    chain: [
      "Presence air at 5 kHz · +1.5 dB",
      "Stereo widener · 160% — expands the soundstage",
      "Atmospheric reverb · 60-80 ms early reflections",
      "Slow glue compressor · 2:1",
      "Normalize to -14 LUFS",
    ],
    best_for: "Ambient, downtempo, chillwave, film scoring.",
    img: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    color: "#EAB308",
    genres: ["Soundtrack", "Orchestral", "Classical"],
    lufs: "-12 LUFS",
    headline: "Epic & dramatic. Scooped mids, deep lows, bright highs — the sonic signature of modern film trailers.",
    chain: [
      "Sub-lift at 60 Hz · +2.5 dB for impact",
      "Mid scoop at 400 Hz · -2 dB for clarity",
      "Brightness at 8 kHz · +1.5 dB",
      "Aggressive compressor · 3.5:1, fast attack",
      "Normalize to -12 LUFS (trailer-ready)",
    ],
    best_for: "Film scores, trailer music, game soundtracks, orchestral.",
    img: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "punch",
    name: "Punch",
    color: "#EC4899",
    genres: ["Hip Hop", "Trap", "R&B"],
    lufs: "-10 LUFS",
    headline: "Energetic & bouncy. Deep 50 Hz kick, controlled low-mids, boosted air band — modern hip-hop energy.",
    chain: [
      "Deep kick at 50 Hz · +4 dB",
      "Low-mid control at 250 Hz · -2 dB",
      "Vocal presence at 3 kHz · +1.5 dB",
      "Air at 10 kHz · +2.5 dB",
      "Punch compressor · 4.5:1, 6 ms attack",
      "Normalize to -10 LUFS (streaming-ready)",
    ],
    best_for: "Hip-hop, R&B, modern pop with heavy low-end.",
    img: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&q=80&w=1200",
  },
];

export default function Landing() {
  const [presets, setPresets] = useState([]);
  const [plans, setPlans] = useState(null);
  const [billing, setBilling] = useState("yearly");
  const [sampleCredits, setSampleCredits] = useState(null);

  useEffect(() => {
    api.get("/presets").then((r) => setPresets(r.data.presets)).catch(() => {});
    api.get("/plans").then((r) => setPlans(r.data.plans)).catch(() => {});
    api.get("/presets/samples/credits").then((r) => setSampleCredits(r.data)).catch(() => {});
  }, []);

  const titleFor = (pid) =>
    sampleCredits?.tracks?.find((t) => t.preset === pid)?.title;

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
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-4xl fade-up" style={{ fontFamily: "Outfit" }}>
            Master your sound <br />
            <span className="text-brand-gradient">in under a minute.</span>
          </h1>
          <p className="mt-8 text-lg text-[#9CA3AF] max-w-2xl leading-relaxed fade-up" style={{ animationDelay: "150ms" }}>
            Professional mastering driven by engineer-curated presets. Upload a track, pick a vibe,
            ship it to streaming. No plugins. No sessions. No guesswork.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 fade-up" style={{ animationDelay: "300ms" }}>
            <Link
              to="/login?mode=signup"
              data-testid="hero-cta-launch"
              className="btn-gradient font-bold px-8 py-4 rounded-md inline-flex items-center gap-2"
            >
              Launch App <ArrowRight size={18} />
            </Link>
            <a
              href="#presets"
              data-testid="hero-cta-presets"
              className="border border-[#2A2A35] px-8 py-4 rounded-md hover:border-[#A855F7] hover:text-[#A855F7] transition inline-flex items-center gap-2"
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
            <div key={s.title} className="bg-[#121216] border border-[#2A2A35] rounded-xl p-8 hover:border-[#A855F7]/60 transition" data-testid={`step-${i}`}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {presets.map((p, i) => (
            <div key={p.id} className="fade-up h-full" style={{ animationDelay: `${i * 60}ms` }}>
              <PresetCard preset={p} onClick={() => {}} enableMiniPlayer sampleTitle={titleFor(p.id)} />
            </div>
          ))}
        </div>

        {sampleCredits && (
          <div className="mt-10 text-center text-xs text-[#6B7280]" data-testid="sample-attribution">
            Demo clips by{" "}
            <a href={sampleCredits.source} target="_blank" rel="noopener noreferrer" className="text-[#E28C22] hover:underline">
              {sampleCredits.artist}
            </a>{" "}
            · Licensed under{" "}
            <a href={sampleCredits.license_url} target="_blank" rel="noopener noreferrer" className="text-[#E28C22] hover:underline">
              {sampleCredits.license}
            </a>
          </div>
        )}
      </section>

      {/* PRESET DETAIL — what each preset does */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="label-overline mb-4">/ Under the hood</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-3xl" style={{ fontFamily: "Outfit" }}>
          What each preset actually does.
        </h2>
        <p className="text-[#9CA3AF] max-w-2xl mb-14">
          No black boxes. Here's the chain of EQ bands, compression, and loudness targeting behind every signature sound.
        </p>
        <div className="space-y-6">
          {PRESET_DETAILS.map((d, i) => (
            <div
              key={d.id}
              className="grid md:grid-cols-[380px_1fr] gap-0 bg-[#121216] border border-[#2A2A35] rounded-2xl overflow-hidden hover:border-[#E28C22]/40 transition group"
              data-testid={`preset-detail-${d.id}`}
            >
              <div
                className="relative h-64 md:h-auto min-h-[220px] overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${d.color}33, ${d.color}08)` }}
              >
                <img
                  src={d.img}
                  alt={d.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-500 grayscale-[30%]"
                  loading="lazy"
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${d.color}66, transparent 60%, #0A0A0C)` }} />
                <div className="relative h-full flex flex-col justify-between p-6">
                  <div className="flex flex-wrap gap-1">
                    {d.genres.map((g) => (
                      <span
                        key={g}
                        className="label-overline text-[10px] px-2 py-1 rounded border"
                        style={{ color: d.color, borderColor: `${d.color}66` }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-black tracking-tight" style={{ fontFamily: "Outfit", color: "#fff" }}>
                      {d.name}
                    </div>
                    <div className="mono text-xs mt-1" style={{ color: d.color }}>
                      LUFS target · {d.lufs}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <div className="text-lg text-[#F4F4F5] leading-relaxed mb-5">{d.headline}</div>
                <ul className="space-y-2 text-sm text-[#9CA3AF]">
                  {d.chain.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mono text-[11px] mt-[3px]" style={{ color: d.color }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 label-overline text-[10px]" style={{ color: d.color }}>
                  Best for · {d.best_for}
                </div>
              </div>
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
            <div key={e.name} className="bg-[#121216] border border-[#2A2A35] rounded-xl overflow-hidden group" data-testid={`engineer-${i}`}>
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
            features={[
              "3 exports / month",
              "WAV 16-bit",
              "4 presets: Universal · Fire · Clarity · Tape",
              "Tracks up to 2 minutes",
            ]}
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
            features={[
              "20 exports / month",
              "WAV 16/24-bit · MP3 320k · FLAC",
              "All 8 presets + Intensity & EQ",
              "Batch upload (queue multiple tracks)",
            ]}
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
            features={[
              "Unlimited exports",
              "Hi-res 24/96 & 24/192",
              "All 8 presets + full controls",
              "Batch upload + priority processing",
            ]}
            cta="Upgrade to Studio"
            ctaTo="/login?mode=signup"
            testId="price-studio"
          />
        </div>

        <div className="mt-8 text-center text-xs text-[#6B7280] label-overline" data-testid="wait-time-notice-landing">
          Note · All tiers may take up to 20 minutes per master
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
              className="inline-flex items-center gap-2 btn-gradient font-bold px-8 py-4 rounded-md"
            >
              Launch Sonically <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2A2A35] py-12" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-2 flex items-center justify-center" style={{ width: 64, height: 64 }}>
              <img
                src="https://customer-assets.emergentagent.com/job_audio-enhance-34/artifacts/zn8793na_Neural%20Logo.JPG"
                alt="Neural Melodies"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="label-overline text-[#A855F7]">A Neural Melodies product</span>
              <span className="text-lg font-bold mt-1" style={{ fontFamily: "Outfit" }}>
                Sonically is crafted by <span className="text-[#A855F7]">Neural Melodies</span>
              </span>
              <span className="text-xs text-[#9CA3AF] mt-1">Pushing music forward with neural audio tools.</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="label-overline">Sonically © 2026 — Mastered in analog spirit</div>
            <div className="text-xs text-[#9CA3AF] mt-2 flex items-center gap-3 justify-center md:justify-end">
              <span>© Neural Melodies. All rights reserved.</span>
              <span className="text-[#2A2A35]">·</span>
              <Link to="/terms" data-testid="footer-terms-link" className="hover:text-[#E28C22]">Terms &amp; Refunds</Link>
            </div>
          </div>
        </div>
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
