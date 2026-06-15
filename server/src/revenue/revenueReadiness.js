const PLACEHOLDER_VALUES = new Set(["", "placeholder", "todo", "tbd", "none", "your-value", "simulated"]);

export const PAYMENT_LIFECYCLE_STATES = [
  "draft",
  "intent_created",
  "authorized_placeholder",
  "simulated_paid",
  "failed",
  "cancelled",
  "refunded_placeholder",
];

export const DEPOSIT_LIFECYCLE_STATES = [
  "not_required",
  "draft",
  "requested",
  "pending_hold",
  "held_placeholder",
  "release_pending",
  "released_placeholder",
  "refund_pending",
  "refunded_placeholder",
  "disputed",
  "expired",
];

export const ESCROW_LEDGER_STATES = [
  "draft",
  "pending",
  "held",
  "released",
  "partially_released",
  "refunded",
  "disputed",
  "cancelled",
  "expired",
];

export const SETTLEMENT_WORKFLOW_STEPS = [
  "capture_review",
  "ledger_posting",
  "fee_calculation",
  "supplier_earnings",
  "reconciliation",
  "payout_review",
  "reporting",
];

export const REVENUE_REQUIRED_KEYS = [
  "REVENUE_OWNER_NAME",
  "REVENUE_OWNER_EMAIL",
  "MARKETPLACE_FEE_POLICY_URL",
  "COMMISSION_POLICY_URL",
  "PAYMENT_LIFECYCLE_POLICY_URL",
  "REFUND_LIFECYCLE_POLICY_URL",
  "DEPOSIT_LIFECYCLE_POLICY_URL",
  "ESCROW_LEDGER_POLICY_URL",
  "ESCROW_STATE_MACHINE_POLICY_URL",
  "SETTLEMENT_WORKFLOW_POLICY_URL",
  "RECONCILIATION_OWNER",
  "FINANCIAL_REPORTING_OWNER",
  "TAX_GCT_POLICY_URL",
  "PAYOUT_POLICY_URL",
  "TRANSACTION_AUDIT_POLICY_URL",
];

export const REVENUE_DOMAINS = [
  {
    id: "payments_architecture",
    label: "Payments architecture",
    required: ["MARKETPLACE_FEE_POLICY_URL", "COMMISSION_POLICY_URL", "PAYMENT_LIFECYCLE_POLICY_URL", "REFUND_LIFECYCLE_POLICY_URL", "TRANSACTION_AUDIT_POLICY_URL"],
  },
  {
    id: "deposit_escrow_architecture",
    label: "Deposit and escrow architecture",
    required: ["DEPOSIT_LIFECYCLE_POLICY_URL", "ESCROW_LEDGER_POLICY_URL", "ESCROW_STATE_MACHINE_POLICY_URL", "SETTLEMENT_WORKFLOW_POLICY_URL"],
  },
  {
    id: "financial_controls",
    label: "Financial controls",
    required: ["RECONCILIATION_OWNER", "FINANCIAL_REPORTING_OWNER", "TAX_GCT_POLICY_URL", "PAYOUT_POLICY_URL"],
  },
];

function hasConfiguredValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder");
}

function domainStatus(env, domain) {
  const missing = domain.required.filter((key) => !hasConfiguredValue(env[key]));
  return {
    ...domain,
    missing,
    ready: missing.length === 0,
    status: missing.length ? "inputs_missing" : "ready_for_provider_review",
  };
}

export function getRevenueReadiness(env = process.env) {
  const missing = REVENUE_REQUIRED_KEYS.filter((key) => !hasConfiguredValue(env[key]));
  const domains = REVENUE_DOMAINS.map((domain) => domainStatus(env, domain));
  const score = Math.round(((REVENUE_REQUIRED_KEYS.length - missing.length) / REVENUE_REQUIRED_KEYS.length) * 100);

  return {
    kind: "revenueActivation",
    provider: "provider_ready_revenue_controls",
    required: REVENUE_REQUIRED_KEYS,
    missing,
    ready: missing.length === 0,
    status: missing.length ? "revenue_activation_inputs_missing" : "ready_for_sandbox_revenue_review",
    score,
    domains,
    paymentLifecycleStates: PAYMENT_LIFECYCLE_STATES,
    depositLifecycleStates: DEPOSIT_LIFECYCLE_STATES,
    escrowLedgerStates: ESCROW_LEDGER_STATES,
    settlementWorkflowSteps: SETTLEMENT_WORKFLOW_STEPS,
    paymentArchitectureStatus: domains.find((domain) => domain.id === "payments_architecture")?.status || "inputs_missing",
    escrowArchitectureStatus: domains.find((domain) => domain.id === "deposit_escrow_architecture")?.status || "inputs_missing",
    financialControlsStatus: domains.find((domain) => domain.id === "financial_controls")?.status || "inputs_missing",
    transactionAuditStatus: hasConfiguredValue(env.TRANSACTION_AUDIT_POLICY_URL) ? "audit_policy_documented" : "audit_policy_missing",
    taxGctStatus: hasConfiguredValue(env.TAX_GCT_POLICY_URL) ? "tax_gct_policy_documented" : "tax_gct_policy_missing",
    payoutReadinessStatus: hasConfiguredValue(env.PAYOUT_POLICY_URL) ? "payout_policy_documented" : "payout_policy_missing",
    reconciliationStatus: hasConfiguredValue(env.RECONCILIATION_OWNER) ? "reconciliation_owner_assigned" : "reconciliation_owner_missing",
    financialReportingStatus: hasConfiguredValue(env.FINANCIAL_REPORTING_OWNER) ? "financial_reporting_owner_assigned" : "financial_reporting_owner_missing",
    stripeActive: false,
    paypalActive: false,
    wipayActive: false,
    fygaroActive: false,
    ncbGatewayActive: false,
    realEscrowAccountActive: false,
    realMoneyMovementActive: false,
    realSettlementActive: false,
    productionSuitable: false,
    message: missing.length
      ? `Revenue activation architecture is missing required inputs: ${missing.join(", ")}. No live provider, escrow, settlement, refund, payout, or bank-transfer flow is active.`
      : "Revenue activation architecture is ready for sandbox/provider review. Live money movement, settlement, escrow, refunds, payouts, and bank transfers remain disabled.",
  };
}
