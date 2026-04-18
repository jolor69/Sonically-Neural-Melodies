import React, { useRef } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { api } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * PayPal checkout buttons for a given plan/billing.
 * Must be rendered inside a <PayPalScriptProvider> parent.
 * On approval, captures the order server-side and redirects to /payment/success.
 */
export default function PayPalCheckoutButton({ plan, billing, discountCode, disabled, testId }) {
  const navigate = useNavigate();
  const orderIdRef = useRef(null);

  if (disabled) {
    return (
      <div
        data-testid={`${testId}-paypal-disabled`}
        className="w-full rounded-md border border-[#2A2A35] text-[#6B7280] text-xs text-center py-2 opacity-60"
      >
        PayPal unavailable on current plan
      </div>
    );
  }

  return (
    <div data-testid={`${testId}-paypal-wrapper`} className="w-full">
      <PayPalButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 44 }}
        fundingSource="paypal"
        forceReRender={[plan, billing, discountCode]}
        createOrder={async () => {
          try {
            const payload = { plan, billing };
            if (discountCode) payload.discount_code = discountCode;
            const r = await api.post("/payments/paypal/create-order", payload);
            orderIdRef.current = r.data.order_id;
            return r.data.order_id;
          } catch (e) {
            toast.error(e?.response?.data?.detail || "PayPal order creation failed");
            throw e;
          }
        }}
        onApprove={async (data) => {
          try {
            const orderId = data.orderID || orderIdRef.current;
            await api.post(`/payments/paypal/capture-order/${orderId}`);
            navigate(`/payment/success?session_id=${orderId}`);
          } catch (e) {
            toast.error(e?.response?.data?.detail || "PayPal capture failed");
          }
        }}
        onError={(err) => {
          console.error("PayPal error", err);
          toast.error("PayPal checkout error. Please try again.");
        }}
        onCancel={() => {
          toast.info("PayPal checkout cancelled");
        }}
      />
    </div>
  );
}
