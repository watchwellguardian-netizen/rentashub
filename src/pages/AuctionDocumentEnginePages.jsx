import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import Button from "../components/Button.jsx";
import {
  DOCUMENT_ENGINE_TYPES,
  generateAuctionDocumentRecord,
  getDocumentDashboard,
  getDocumentLibraryForAuction,
} from "../lib/auctionDocumentEngine.js";
import { useAuth } from "../state/AuthContext.jsx";

function Status({ children, tone = "neutral" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function DocumentCard({ document, action }) {
  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <Status>{document.status?.replaceAll("_", " ") || "template ready"}</Status>
          <Status>{document.legalStatus?.replaceAll("_", " ") || "legal approval inactive"}</Status>
        </div>
        <h3>{document.title || document.type?.replaceAll("_", " ")}</h3>
        <p className="muted">{document.note || document.sourceSummary || "Simulation-safe document placeholder."}</p>
        {document.documentBody ? <ul>{document.documentBody.slice(0, 3).map((line) => <li key={line}>{line}</li>)}</ul> : null}
        <p>PDF: {document.pdfStatus?.replaceAll("_", " ") || "placeholder only"} / E-signature: {document.eSignatureStatus?.replaceAll("_", " ") || "not active"}</p>
      </div>
      {action}
    </article>
  );
}

export function AuctionDocumentEnginePage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [library, setLibrary] = useState(() => getDocumentLibraryForAuction(window.localStorage, auctionId));
  const [message, setMessage] = useState("");
  if (!library) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const generate = (type) => {
    const result = generateAuctionDocumentRecord(window.localStorage, user, auctionId, type);
    setMessage(result.valid ? `${type.replaceAll("_", " ")} generated as a placeholder.` : result.error);
    setLibrary(getDocumentLibraryForAuction(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">Auction document generation engine</p>
        <h1>{library.auction.title}</h1>
        <p>Generate controlled document placeholders for auction invoices, Notice of Sale, sale confirmation, inspection exports, transport quotes, financing referrals, escrow statements, and seller proceeds.</p>
        <p className="muted">No legal certification, e-signature, binding PDF, tax filing, title guarantee, or live document provider is active.</p>
        <p className="muted">Includes Transport quote / booking document placeholder and Financing referral summary placeholder workflows.</p>
        <div className="card-actions"><Link className="button" to={`/auction/${auctionId}`}>Return to auction</Link><Link className="button secondary" to={`/auction/${auctionId}/documents`}>Legacy document library</Link></div>
      </section>
      <section className="panel wide">
        {message ? <p className="success-text">{message}</p> : null}
        <div className="metric-grid">
          <div><strong>{library.templates.length}</strong><span>Templates</span></div>
          <div><strong>{library.generated.length}</strong><span>Generated placeholders</span></div>
          <div><strong>{library.marketplaceSources.length}</strong><span>Marketplace sources</span></div>
          <div><strong>0</strong><span>Legal approvals</span></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Generate documents</span></div>
        <div className="asset-list">
          {library.templates.map((template) => (
            <DocumentCard
              key={template.type}
              document={template}
              action={<Button onClick={() => generate(template.type)}><FileText size={18} aria-hidden="true" /> Generate placeholder</Button>}
            />
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Generated document placeholders</span></div>
        <div className="asset-list">{library.generated.length ? library.generated.map((document) => <DocumentCard key={document.documentId} document={document} />) : <div className="empty-state"><strong>No generated placeholders yet</strong><p>Choose a document template to create a local generated record.</p></div>}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Marketplace source records</span></div>
        <div className="asset-list">{library.marketplaceSources.length ? library.marketplaceSources.map((source) => <article className="asset-card" key={`${source.sourceType}-${source.sourceId}`}><div><Status>{source.sourceType.replaceAll("_", " ")}</Status><h3>{source.label}</h3><p className="muted">Source-ready for document placeholder composition.</p></div></article>) : <div className="empty-state"><strong>No inspection, transport, or financing source records yet</strong></div>}</div>
      </section>
    </main>
  );
}

function DocumentDashboard({ scope, title, subtitle }) {
  const { user } = useAuth();
  const data = useMemo(() => getDocumentDashboard(window.localStorage, user, scope), [scope, user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">Auction document dashboard</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <p className="muted">{data.notice}</p>
      </section>
      <section className="panel wide">
        <div className="metric-grid">
          <div><strong>{data.counts.auctions}</strong><span>Auction lots</span></div>
          <div><strong>{data.counts.generated}</strong><span>Generated placeholders</span></div>
          <div><strong>{data.counts.templates}</strong><span>Template types</span></div>
          <div><strong>{data.counts.placeholders}</strong><span>Legacy placeholders</span></div>
          <div><strong>{data.counts.legalCertified}</strong><span>Legal approvals</span></div>
          <div><strong>{data.counts.eSigned}</strong><span>E-signatures</span></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span><ShieldCheck size={18} aria-hidden="true" /> Compliance document queue</span></div>
        <div className="asset-list">
          {data.auctions.map((auction) => (
            <article className="asset-card" key={auction.id}>
              <div>
                <Status>{auction.status.replaceAll("_", " ")}</Status>
                <h3>{auction.title}</h3>
                <p>{auction.lotNumber} / {auction.sellerName}</p>
                <p className="muted">Notice of Sale, invoice, sale confirmation, escrow statement, inspection, transport, and financing summary placeholders are available.</p>
              </div>
              <Link className="button" to={`/auction/${auction.id}/document-engine`}>Open document engine</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Document types covered</span></div>
        <div className="badge-row">{DOCUMENT_ENGINE_TYPES.map((type) => <Status key={type}>{type.replaceAll("_", " ")}</Status>)}</div>
      </section>
    </main>
  );
}

export function AdminAuctionDocumentsPage() {
  return <DocumentDashboard scope="admin" title="Admin compliance document dashboard" subtitle="Review generated placeholders, compliance document queues, and auction source records without legal certification or e-signature activation." />;
}

export function SupplierAuctionDocumentsPage() {
  return <DocumentDashboard scope="supplier" title="Supplier auction document dashboard" subtitle="Prepare seller-side document placeholders for auction lots, proceeds, Notice of Sale, inspection, transport, and financing records." />;
}

export function BuyerAuctionDocumentsPage() {
  return <DocumentDashboard scope="buyer" title="Buyer auction document access" subtitle="Access buyer-visible document placeholders for auction lots, invoices, sale confirmation, escrow statement, inspection exports, and transport/financing summaries." />;
}
