import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { ADMIN_NAV, adminSimulateVerification, createAdminSnapshot } from "../lib/adminCenter.js";
import { adminModerateReview } from "../lib/reviewService.js";

function AdminShell({ title, children }) {
  return (
    <main className="page dashboard-grid admin-center">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>{title}</h1>
        <p>Admin controls use simulated/local data only. No real KYC, payment, destructive account action, or backend action is performed.</p>
      </section>
      <section className="panel wide">
        <div className="navrail admin-nav">
          {ADMIN_NAV.map((item) => <NavLink key={item.route} to={item.route} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}
        </div>
      </section>
      {children}
    </main>
  );
}

function MetricCards({ items }) {
  return <div className="metric-grid">{items.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>;
}

export function AdminDashboard() {
  const snapshot = useMemo(() => createAdminSnapshot(window.localStorage), []);
  const metrics = [
    ["Users", snapshot.overview.users],
    ["Suppliers", snapshot.overview.suppliers],
    ["Customers", snapshot.overview.customers],
    ["Listings", snapshot.overview.listings],
    ["Auctions", snapshot.overview.auctions],
    ["Auction bids", snapshot.overview.auctionBids],
    ["Bookings", snapshot.overview.bookings],
    ["Payments", snapshot.overview.payments],
    ["Pending verifications", snapshot.overview.pendingVerifications],
    ["Open inspection flags", snapshot.overview.openInspectionFlags],
    ["Reviews", snapshot.overview.reviews],
    ["Marketplace offers", snapshot.overview.marketplaceOffers],
    ["Wanted requests", snapshot.overview.wantedRequests],
    ["Broker leads", snapshot.overview.brokerLeads],
    ["Claims", snapshot.overview.claims],
    ["Trust risk items", snapshot.overview.trustRiskItems],
    ["Credential gates", snapshot.overview.credentialReadinessItems],
    ["Pilot readiness", `${snapshot.overview.pilotReadinessScore}%`],
    ["Payment readiness", `${snapshot.overview.paymentReadinessScore}%`],
    ["Escrow readiness", `${snapshot.overview.escrowReadinessScore}%`],
    ["Revenue readiness", `${snapshot.overview.revenueReadinessScore}%`],
    ["Infrastructure readiness", `${snapshot.overview.infrastructureReadinessScore}%`],
    ["Compliance readiness", `${snapshot.overview.complianceReadinessScore}%`],
    ["Security certification", `${snapshot.overview.securityCertificationScore}%`],
  ].map(([label, value]) => ({ label, value }));

  useEffect(() => {
    document.title = "RentasHub - Admin";
  }, []);

  return (
    <AdminShell title="RentasHub Admin Control Center">
      <section className="panel wide"><div className="section-heading"><span>Platform overview</span></div><MetricCards items={metrics} /></section>
      <section className="panel"><div className="section-heading"><span>Recent activity</span></div>{snapshot.recentActivity.length ? snapshot.recentActivity.map((item) => <div className="preview-item" key={item.id}><strong>{item.label}</strong><span>{item.route}</span></div>) : <div className="empty-state"><strong>No recent activity</strong></div>}</section>
      <section className="panel"><div className="section-heading"><span>Risk/attention queue</span></div>{snapshot.riskQueue.length ? snapshot.riskQueue.map((item) => <div className="preview-item" key={item.id}><strong>{item.label}</strong><span>{item.route}</span></div>) : <div className="empty-state"><strong>No risk items</strong><p>Pending verifications and flagged inspections will appear here.</p></div>}</section>
      <section className="panel wide"><div className="section-heading"><span>Credential-level readiness</span></div><p className="muted">{snapshot.credentialReadiness.notice}</p><div className="asset-list">{snapshot.credentialReadiness.workstreams.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.manualRequirement}</p></div><strong>{item.credentialStage.replaceAll("_", " ")}</strong></article>)}</div></section>
      <section className="panel wide"><div className="section-heading"><span>Security baseline readiness</span></div><div className="asset-list">{snapshot.credentialReadiness.securityBaseline.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div></section>
      <section className="panel wide"><div className="section-heading"><span>Deployment readiness</span></div><div className="asset-list">{snapshot.credentialReadiness.deploymentReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div></section>
      <section className="panel wide"><div className="section-heading"><span>Monitoring readiness</span></div><div className="asset-list">{snapshot.credentialReadiness.monitoringReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div></section>
      <section className="panel wide">
        <div className="section-heading"><span>Payment activation readiness</span><strong>{snapshot.credentialReadiness.paymentActivation.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.paymentActivation.message}</p>
        <div className="profile-grid">
          <div><span>Provider</span><strong>{snapshot.credentialReadiness.paymentActivation.providerReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Sandbox</span><strong>{snapshot.credentialReadiness.paymentActivation.sandboxReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Webhooks</span><strong>{snapshot.credentialReadiness.paymentActivation.webhookReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Merchant onboarding</span><strong>{snapshot.credentialReadiness.paymentActivation.merchantOnboardingReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Settlement</span><strong>{snapshot.credentialReadiness.paymentActivation.settlementReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Refunds</span><strong>{snapshot.credentialReadiness.paymentActivation.refundReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Chargebacks</span><strong>{snapshot.credentialReadiness.paymentActivation.chargebackReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Payouts</span><strong>{snapshot.credentialReadiness.paymentActivation.payoutReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Compliance</span><strong>{snapshot.credentialReadiness.paymentActivation.complianceReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.paymentActivation.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.paymentActivationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Escrow activation readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.escrowActivation.message}</p>
        <div className="profile-grid">
          <div><span>Provider readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.providerReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Trust account readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.trustAccountReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Legal readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.legalReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Dispute readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.disputeReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Settlement readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.settlementReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Release readiness</span><strong>{snapshot.credentialReadiness.escrowActivation.releaseReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Live funds</span><strong>{snapshot.credentialReadiness.escrowActivation.liveFundsProcessing ? "active" : "disabled"}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.escrowActivation.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.escrowActivationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
      <RevenueReadinessPanel snapshot={snapshot} />
      <section className="panel wide">
        <div className="section-heading"><span>Infrastructure activation readiness</span><strong>{snapshot.credentialReadiness.infrastructureActivation.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.infrastructureActivation.message}</p>
        <div className="profile-grid">
          <div><span>DNS status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.dnsStatus.replaceAll("_", " ")}</strong></div>
          <div><span>TLS status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.tlsStatus.replaceAll("_", " ")}</strong></div>
          <div><span>CDN status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.cdnStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Backup status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.backupStatus.replaceAll("_", " ")}</strong></div>
          <div><span>DR status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.disasterRecoveryStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Hosting status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.hostingStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Monitoring status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.monitoringStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Deployment status</span><strong>{snapshot.credentialReadiness.infrastructureActivation.deploymentStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Production traffic</span><strong>{snapshot.credentialReadiness.infrastructureActivation.productionTrafficActive ? "active" : "disabled"}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.infrastructureActivation.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.infrastructureActivationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Security hardening program</span><strong>{snapshot.credentialReadiness.securityHardening.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.securityHardening.message}</p>
        <div className="metric-grid">
          <div><span>Authentication security</span><strong>{snapshot.credentialReadiness.securityHardening.authenticationSecurityStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Application security</span><strong>{snapshot.credentialReadiness.securityHardening.applicationSecurityStatus.replaceAll("_", " ")}</strong></div>
          <div><span>API security</span><strong>{snapshot.credentialReadiness.securityHardening.apiSecurityStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Dependency security</span><strong>{snapshot.credentialReadiness.securityHardening.dependencySecurityStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Security monitoring</span><strong>{snapshot.credentialReadiness.securityHardening.securityMonitoringStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Live tooling</span><strong>{snapshot.credentialReadiness.securityHardening.productionSecurityToolingActive ? "active" : "inactive"}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.securityHardening.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.securityHardeningProgramReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
      <ComplianceReadinessPanel snapshot={snapshot} />
      <section className="panel wide">
        <div className="section-heading"><span>Security certification readiness</span><strong>{snapshot.credentialReadiness.securityCertification.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.securityCertification.message}</p>
        <div className="profile-grid">
          <div><span>OWASP status</span><strong>{snapshot.credentialReadiness.securityCertification.owaspStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Dependency audit status</span><strong>{snapshot.credentialReadiness.securityCertification.dependencyAuditStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Secrets status</span><strong>{snapshot.credentialReadiness.securityCertification.secretsStatus.replaceAll("_", " ")}</strong></div>
          <div><span>RBAC status</span><strong>{snapshot.credentialReadiness.securityCertification.rbacStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Authentication audit</span><strong>{snapshot.credentialReadiness.securityCertification.authenticationStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Storage security audit</span><strong>{snapshot.credentialReadiness.securityCertification.storageStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Payment security audit</span><strong>{snapshot.credentialReadiness.securityCertification.paymentStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Escrow security audit</span><strong>{snapshot.credentialReadiness.securityCertification.escrowStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Monitoring audit</span><strong>{snapshot.credentialReadiness.securityCertification.monitoringStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Incident response status</span><strong>{snapshot.credentialReadiness.securityCertification.incidentResponseStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Certification</span><strong>{snapshot.credentialReadiness.securityCertification.certified ? "certified" : "not certified"}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.securityCertification.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.securityCertificationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Pilot operations readiness</span><strong>{snapshot.credentialReadiness.pilotOperations.score}%</strong></div>
        <p className="muted">{snapshot.credentialReadiness.pilotOperations.message}</p>
        <div className="profile-grid">
          <div><span>Supplier onboarding</span><strong>{snapshot.credentialReadiness.pilotOperations.supplierOnboardingStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Support readiness</span><strong>{snapshot.credentialReadiness.pilotOperations.supportReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Moderation readiness</span><strong>{snapshot.credentialReadiness.pilotOperations.moderationReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Dispute escalation</span><strong>{snapshot.credentialReadiness.pilotOperations.disputeEscalationReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Verification readiness</span><strong>{snapshot.credentialReadiness.pilotOperations.verificationReadiness.replaceAll("_", " ")}</strong></div>
          <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.pilotOperations.missing.length}</strong></div>
        </div>
        <div className="asset-list">{snapshot.credentialReadiness.pilotOperationsReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
      </section>
    </AdminShell>
  );
}

function ComplianceReadinessPanel({ snapshot }) {
  return (
    <section className="panel wide">
      <div className="section-heading"><span>Privacy and compliance activation</span><strong>{snapshot.credentialReadiness.complianceActivation.score}%</strong></div>
      <p className="muted">{snapshot.credentialReadiness.complianceActivation.message}</p>
      <div className="profile-grid">
        <div><span>Privacy program</span><strong>{snapshot.credentialReadiness.complianceActivation.privacyProgramStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Jamaica DPA</span><strong>{snapshot.credentialReadiness.complianceActivation.jamaicaDpaStatus.replaceAll("_", " ")}</strong></div>
        <div><span>GDPR framework</span><strong>{snapshot.credentialReadiness.complianceActivation.gdprStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Marketplace compliance</span><strong>{snapshot.credentialReadiness.complianceActivation.marketplaceComplianceStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Audit retention</span><strong>{snapshot.credentialReadiness.complianceActivation.auditRetentionStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Legal documents</span><strong>{snapshot.credentialReadiness.complianceActivation.legalDocumentStatus.replaceAll("_", " ")}</strong></div>
        <div><span>KYC readiness</span><strong>{snapshot.credentialReadiness.complianceActivation.kycReadinessStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Live KYC vendor</span><strong>{snapshot.credentialReadiness.complianceActivation.liveKycVendorActive ? "active" : "inactive"}</strong></div>
        <div><span>Sanctions / AML</span><strong>{snapshot.credentialReadiness.complianceActivation.sanctionsScreeningActive || snapshot.credentialReadiness.complianceActivation.amlMonitoringActive ? "active" : "inactive"}</strong></div>
        <div><span>Missing gates</span><strong>{snapshot.credentialReadiness.complianceActivation.missing.length}</strong></div>
      </div>
      <div className="asset-list">{snapshot.credentialReadiness.complianceActivationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
    </section>
  );
}

function RevenueReadinessPanel({ snapshot }) {
  const revenue = snapshot.credentialReadiness.revenueActivation;
  return (
    <section className="panel wide">
      <div className="section-heading"><span>Revenue activation readiness</span><strong>{revenue.score}%</strong></div>
      <p className="muted">{revenue.message}</p>
      <div className="profile-grid">
        <div><span>Payment architecture</span><strong>{revenue.paymentArchitectureStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Escrow architecture</span><strong>{revenue.escrowArchitectureStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Financial controls</span><strong>{revenue.financialControlsStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Transaction audit</span><strong>{revenue.transactionAuditStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Tax/GCT readiness</span><strong>{revenue.taxGctStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Payout readiness</span><strong>{revenue.payoutReadinessStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Reconciliation</span><strong>{revenue.reconciliationStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Financial reporting</span><strong>{revenue.financialReportingStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Real money movement</span><strong>{revenue.liveMoneyMovementActive ? "active" : "disabled"}</strong></div>
        <div><span>Real settlements</span><strong>{revenue.realSettlementActive ? "active" : "disabled"}</strong></div>
        <div><span>Real escrow account</span><strong>{revenue.realEscrowAccountActive ? "active" : "disabled"}</strong></div>
        <div><span>Missing gates</span><strong>{revenue.missing.length}</strong></div>
      </div>
      <div className="asset-list">{snapshot.credentialReadiness.revenueActivationReadiness.map((item) => <article className="asset-card" key={item.id}><div><span className="status-badge neutral">{item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div>
    </section>
  );
}

export function AdminCompliance() {
  const snapshot = createAdminSnapshot(window.localStorage);
  return (
    <AdminShell title="Compliance readiness">
      <ComplianceReadinessPanel snapshot={snapshot} />
    </AdminShell>
  );
}

export function AdminRevenue() {
  const snapshot = createAdminSnapshot(window.localStorage);
  return (
    <AdminShell title="Revenue activation readiness">
      <RevenueReadinessPanel snapshot={snapshot} />
    </AdminShell>
  );
}

export function AdminUsers() {
  const [role, setRole] = useState("all");
  const snapshot = createAdminSnapshot(window.localStorage);
  const users = role === "all" ? snapshot.users : snapshot.users.filter((user) => user.role === role);
  return (
    <AdminShell title="User management">
      <section className="panel wide">
        <div className="section-heading"><span>Local/demo users</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="all">All roles</option><option value="customer">Customer</option><option value="supplier">Supplier</option><option value="broker">Broker</option><option value="admin">Admin</option></select></div>
        <div className="asset-list">{users.map((user) => <article className="asset-card" key={user.id}><div><h3>{user.full_name}</h3><p>{user.email} / {user.role}</p></div><Button variant="secondary" disabled title="Controlled placeholder until account suspension workflow is activated">Suspend/activate placeholder</Button></article>)}</div>
      </section>
    </AdminShell>
  );
}

export function AdminListings() {
  const [category, setCategory] = useState("all");
  const snapshot = createAdminSnapshot(window.localStorage);
  const listings = category === "all" ? snapshot.listings : snapshot.listings.filter((listing) => listing.category === category);
  return (
    <AdminShell title="Listing management">
      <section className="panel wide"><div className="section-heading"><span>All listings</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Filter by category or all" /></div><div className="asset-list">{listings.map((listing) => <article className="asset-card" key={listing.id}><div><h3>{listing.title}</h3><p>{listing.category} / {listing.availabilityStatus} / {listing.ownerSupplierId}</p></div><Button variant="secondary" disabled title="Controlled placeholder until listing moderation workflow is activated">Approve/reject/suspend placeholder</Button></article>)}</div></section>
    </AdminShell>
  );
}

export function AdminBookings() {
  const [status, setStatus] = useState("all");
  const navigate = useNavigate();
  const snapshot = createAdminSnapshot(window.localStorage);
  const bookings = status === "all" ? snapshot.bookings : snapshot.bookings.filter((booking) => booking.status === status);
  return (
    <AdminShell title="Booking management">
      <section className="panel wide"><div className="section-heading"><span>All bookings</span><input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Filter by status or all" /></div><div className="asset-list">{bookings.map((booking) => <article className="asset-card" key={booking.id}><div><h3>{booking.assetTitle}</h3><p>{booking.status} / {booking.customerName} / {booking.supplierName}</p></div><div className="card-actions"><Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}`)}>View detail</Button><Button variant="ghost" disabled title="Controlled placeholder until admin booking override workflow is activated">Admin override placeholder</Button></div></article>)}</div></section>
    </AdminShell>
  );
}

export function AdminVerifications() {
  const [snapshot, setSnapshot] = useState(() => createAdminSnapshot(window.localStorage));
  const decide = (supplierId, status) => {
    adminSimulateVerification(window.localStorage, supplierId, status);
    setSnapshot(createAdminSnapshot(window.localStorage));
  };
  return (
    <AdminShell title="Verification management">
      <section className="panel wide"><div className="section-heading"><span>Pending supplier verifications</span></div><p className="muted">Simulated/local review only. This is not legal or KYC verification.</p><div className="asset-list">{snapshot.profiles.map((profile) => <article className="asset-card" key={profile.supplierId}><div><h3>{profile.businessName || profile.supplierId}</h3><p>{profile.verificationStatus} / {profile.supplierType}</p></div><div className="card-actions"><Button onClick={() => decide(profile.supplierId, "verified")}>Approve</Button><Button variant="secondary" onClick={() => decide(profile.supplierId, "needs_more_info")}>Needs info</Button><Button variant="ghost" onClick={() => decide(profile.supplierId, "rejected")}>Reject</Button></div></article>)}</div></section>
    </AdminShell>
  );
}

export function AdminPayments() {
  const [type, setType] = useState("all");
  const snapshot = createAdminSnapshot(window.localStorage);
  const transactions = type === "all" ? snapshot.ledger : snapshot.ledger.filter((txn) => txn.type === type || txn.status === type);
  return <AdminShell title="Payments and ledger"><section className="panel wide"><div className="section-heading"><span>Simulated ledger overview</span><input value={type} onChange={(event) => setType(event.target.value)} placeholder="Filter by type/status or all" /></div><p className="muted">No real payment processing. No bank/card fields.</p><div className="asset-list">{transactions.map((txn) => <article className="asset-card" key={txn.id}><div><h3>{txn.id}</h3><p>{txn.type} / {txn.status} / JMD {Number(txn.total || 0).toLocaleString()}</p></div></article>)}</div></section></AdminShell>;
}

export function AdminMessages() {
  const snapshot = createAdminSnapshot(window.localStorage);
  return <AdminShell title="Messages overview"><section className="panel wide"><div className="section-heading"><span>Thread summaries only</span></div><p className="muted">Privacy note: full private messages are not exposed here; controlled moderation can be built later.</p><div className="asset-list">{snapshot.threads.map((thread) => <article className="asset-card" key={thread.id}><div><h3>{thread.assetTitle || thread.id}</h3><p>{thread.lastMessage} / status {thread.status}</p></div></article>)}</div></section></AdminShell>;
}

export function AdminReviews() {
  const [snapshot, setSnapshot] = useState(() => createAdminSnapshot(window.localStorage));
  const moderate = (reviewId, status) => {
    adminModerateReview(window.localStorage, reviewId, status);
    setSnapshot(createAdminSnapshot(window.localStorage));
  };
  return <AdminShell title="Review moderation"><section className="panel wide"><div className="section-heading"><span>All reviews</span></div><p className="muted">Moderation is simulated/local. No destructive deletion or legal moderation workflow is built.</p><div className="asset-list">{snapshot.reviews.map((review) => <article className="asset-card" key={review.id}><div><span className="status-badge neutral">{review.status}</span><h3>{review.title}</h3><p>{review.rating} {Number(review.rating) === 1 ? "star" : "stars"} / {review.reviewType} / {review.comment}</p></div><div className="card-actions"><Button onClick={() => moderate(review.id, "published")}>Unhide</Button><Button variant="secondary" onClick={() => moderate(review.id, "hidden")}>Hide</Button><Button variant="ghost" onClick={() => moderate(review.id, "flagged")}>Flag</Button></div></article>)}</div></section></AdminShell>;
}

export function AdminReports() {
  const snapshot = createAdminSnapshot(window.localStorage);
  return <AdminShell title="Reports"><section className="panel wide"><div className="section-heading"><span>Basic local reports</span></div><MetricCards items={[{ label: "Total listings", value: snapshot.reports.totalListings }, { label: "Simulated payment totals", value: `JMD ${snapshot.reports.simulatedPaymentTotal.toLocaleString()}` }, { label: "Supplier earnings total", value: `JMD ${snapshot.reports.supplierEarningsTotal.toLocaleString()}` }, { label: "Verification statuses", value: Object.values(snapshot.reports.verificationPipeline).reduce((a, b) => a + b, 0) }]} /><pre className="report-block">{JSON.stringify({ bookingsByStatus: snapshot.reports.bookingsByStatus, verificationPipeline: snapshot.reports.verificationPipeline }, null, 2)}</pre></section></AdminShell>;
}

export function AdminSettings() {
  const snapshot = createAdminSnapshot(window.localStorage);
  return <AdminShell title="Settings"><section className="panel wide"><div className="section-heading"><span>Controlled placeholders</span></div><div className="profile-grid">{Object.entries(snapshot.settings).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div></section></AdminShell>;
}
