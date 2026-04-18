import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Scale, Receipt, ShieldCheck, Mail } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 md:px-10 py-16" data-testid="terms-page">
        <div className="label-overline mb-3">/ Legal</div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3" style={{ fontFamily: "Outfit" }}>
          Terms &amp; Refund Policy.
        </h1>
        <p className="text-[#9CA3AF] mb-12">Last updated: February 2026 · Neural Melodies</p>

        {/* TERMS */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="terms-section">
          <div className="flex items-center gap-3 mb-5">
            <Scale size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Terms of Service</h2>
          </div>
          <div className="space-y-5 text-sm text-[#9CA3AF] leading-relaxed">
            <p>
              By creating an account or uploading audio to Sonically ("the Service"), you agree to these terms.
              The Service is operated by Neural Melodies ("we", "us"). If you disagree with any of these terms,
              please do not use the Service.
            </p>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">1 · Your content</div>
              <p>
                You retain full ownership of any audio you upload. You grant us a limited, non-exclusive license
                to process, store, and deliver that audio back to you solely for the purpose of providing the
                mastering service. We do not claim rights to your music and do not use it to train models without
                your consent.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">2 · Acceptable use</div>
              <p>
                Do not upload content you do not have the rights to process. Do not use the Service for anything
                illegal, defamatory, infringing, or abusive. We may suspend accounts that violate this.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">3 · Subscriptions &amp; billing</div>
              <p>
                Pro and Studio plans are billed via PayPal. Prices are listed in USD. Monthly plans renew each
                month, yearly plans renew each year. You may cancel any time from your PayPal account; upon
                cancellation your plan stays active until the end of the current billing period.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">4 · Service &amp; uptime</div>
              <p>
                We aim for reliable delivery but do not guarantee zero downtime. Mastering may take up to 20
                minutes per track. We reserve the right to rate-limit, queue, or temporarily throttle accounts
                during peak load.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">5 · Liability</div>
              <p>
                The Service is provided "as is". We are not liable for loss of data, lost revenue, or indirect
                damages arising from use of the Service. Our total liability to you for any claim will not exceed
                the amount you paid us in the 12 months preceding the claim.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">6 · Changes</div>
              <p>
                We may update these terms from time to time. Material changes will be announced via email or in
                the app. Continued use after a change constitutes acceptance.
              </p>
            </div>
          </div>
        </section>

        {/* REFUND POLICY */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="refund-section">
          <div className="flex items-center gap-3 mb-5">
            <Receipt size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Refund Policy</h2>
          </div>
          <div className="space-y-5 text-sm text-[#9CA3AF] leading-relaxed">
            <p>
              We want you to be satisfied. If the Service is not working for you, we offer a straightforward
              refund within the following rules.
            </p>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">1 · 7-day money-back guarantee</div>
              <p>
                New Pro or Studio subscribers can request a full refund within 7 days of their first payment,
                provided they have exported fewer than 3 mastered tracks on the paid plan.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">2 · Yearly plans</div>
              <p>
                For yearly plans beyond the 7-day window, we offer a pro-rata refund for the unused months if
                you cancel within the first 30 days. After 30 days, yearly plans are non-refundable but remain
                active until the end of the billing year.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">3 · Service failure</div>
              <p>
                If a master export fails repeatedly due to a bug on our side, we will either reprocess it at no
                cost or refund the proportional value of that export. Contact us with the track ID.
              </p>
            </div>
            <div>
              <div className="label-overline text-[11px] mb-1 text-white">4 · How to request</div>
              <p>
                Reply to your payment receipt email, or write to
                {" "}
                <a href="mailto:neural.melodies.notes@gmail.com" className="text-[#E28C22] hover:underline">
                  neural.melodies.notes@gmail.com
                </a>{" "}
                with your account email, the plan, and a brief reason. We respond within 2 business days.
                Approved refunds are issued to the original PayPal account within 5–7 business days.
              </p>
            </div>
          </div>
        </section>

        {/* PRIVACY SNAPSHOT */}
        <section className="bg-[#121216] border border-[#2A2A35] rounded-2xl p-6 md:p-8 mb-8" data-testid="privacy-snapshot">
          <div className="flex items-center gap-3 mb-5">
            <ShieldCheck size={18} className="text-[#E28C22]" />
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>Privacy snapshot</h2>
          </div>
          <ul className="space-y-2 text-sm text-[#9CA3AF] leading-relaxed list-disc pl-5">
            <li>We store your email, display name, and audio uploads associated with your account.</li>
            <li>Payments are processed by PayPal — we never see or store your card / bank details.</li>
            <li>Receipts are sent via Resend. You can unsubscribe from non-essential email at any time.</li>
            <li>Delete your account at any time by emailing us; we remove your audio within 30 days.</li>
          </ul>
        </section>

        <section className="bg-[#121216] border border-[#A855F7]/40 rounded-2xl p-6 text-sm" data-testid="terms-contact">
          <div className="flex items-start gap-3">
            <Mail size={18} className="text-[#A855F7] mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Questions?</div>
              <div className="text-[#9CA3AF]">
                Write to
                {" "}
                <a href="mailto:neural.melodies.notes@gmail.com" className="text-[#E28C22] hover:underline">
                  neural.melodies.notes@gmail.com
                </a>. We answer every email.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
