import { createSimulatedPaymentProvider } from "./simulatedPaymentProvider.js";
import { assertPaymentProviderReady } from "./providerReadiness.js";

function blockedProvider(name) {
  return {
    name,
    async createIntent() {
      const error = new Error(`${name} payment provider is not implemented or credentialed in this build.`);
      error.code = "payment_provider_not_implemented";
      error.statusCode = 501;
      error.publicMessage = "Selected payment provider is not implemented in this development build.";
      throw error;
    },
  };
}

export const PAYMENT_PROVIDER_PLACEHOLDERS = {
  stripe: "Stripe placeholder",
  paypal: "PayPal placeholder",
  wipay: "WiPay placeholder",
  lynk: "Lynk placeholder",
  bank_transfer: "Bank transfer placeholder",
  escrow_provider: "Escrow provider placeholder",
};

export function createPaymentProvider(env = process.env) {
  const readiness = assertPaymentProviderReady(env);
  if (readiness.simulated || ["placeholder", "simulated"].includes(readiness.paymentProvider)) return createSimulatedPaymentProvider();
  return blockedProvider(readiness.paymentProvider);
}
