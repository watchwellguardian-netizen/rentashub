import { PAYMENT_ARCHITECTURE_NOTICE } from "./providerReadiness.js";

export function createSimulatedPaymentProvider() {
  return {
    name: "simulated",
    async createIntent(summary) {
      return {
        provider: "simulated",
        status: "preview_only",
        clientSecret: null,
        summary,
        notice: PAYMENT_ARCHITECTURE_NOTICE,
      };
    },
    async capture(summary) {
      return {
        provider: "simulated",
        status: "simulated_paid",
        providerTransactionId: `simulated-${Date.now()}`,
        summary,
        notice: "Simulated payment recorded. No external payment provider, card, bank, mobile money, escrow, or settlement action was used.",
      };
    },
    async refundPlaceholder() {
      return {
        provider: "simulated",
        status: "refund_placeholder_only",
        notice: "Refunds are not executed in this development version. No money movement occurred.",
      };
    },
    async payoutPlaceholder() {
      return {
        provider: "simulated",
        status: "payout_placeholder_only",
        notice: "Payout requests create simulated ledger records only. No bank transfer occurred.",
      };
    },
  };
}
