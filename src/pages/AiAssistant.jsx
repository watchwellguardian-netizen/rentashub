import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { ASSET_CATEGORIES } from "../lib/assetListing.js";
import { AI_ASSISTANT_NOTICE, adviseRentalChoice, createBrokerAssistantMatches, generateMarketInsights, runAiSearchAssistant, suggestListingContent } from "../lib/aiAssistant.js";
import { acceptListingRecommendation, auditListingRecommendation, getAiListingAssistantDashboard } from "../lib/aiListingAssistantEngine.js";
import { acceptValuationRecommendation, auditValuationRecommendation, getAiValuationDashboard } from "../lib/aiValuationEngine.js";
import { APP_NAME } from "../lib/brand.js";
import { useAuth } from "../state/AuthContext.jsx";

const AI_NAV = [
  ["/ai", "AI Home"],
  ["/ai/search", "AI Search"],
  ["/ai/listing-assistant", "Listing Assistant"],
  ["/ai/valuation", "Valuation Engine"],
  ["/ai/rental-advisor", "Rental Advisor"],
  ["/ai/broker-assistant", "Broker Assistant"],
  ["/ai/market-insights", "Market Insights"],
];

function AiShell({ title, children }) {
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>{title}</h1>
        <p>{AI_ASSISTANT_NOTICE}</p>
      </section>
      <section className="panel wide">
        <div className="navrail admin-nav">{AI_NAV.map(([route, label]) => <NavLink key={route} to={route} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{label}</NavLink>)}</div>
      </section>
      {children}
    </main>
  );
}

export function AiHome() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = `${APP_NAME} - AI Marketplace Assistant`;
  }, []);
  return (
    <AiShell title="AI Marketplace Assistant">
      <section className="panel wide">
        <div className="action-grid">
          {AI_NAV.slice(1).map(([route, label]) => <button className="action-card" type="button" key={route} onClick={() => navigate(route)}><strong>{label}</strong><span>Open local assistant workflow.</span></button>)}
        </div>
      </section>
    </AiShell>
  );
}

export function AiSearchPage() {
  const [query, setQuery] = useState("I need a 10-ton excavator in Kingston for 3 days");
  const [result, setResult] = useState(null);
  useEffect(() => {
    document.title = `${APP_NAME} - AI Search`;
    setResult(runAiSearchAssistant(window.localStorage, query));
  }, []);
  const submit = (event) => {
    event.preventDefault();
    setResult(runAiSearchAssistant(window.localStorage, query));
  };
  return (
    <AiShell title="AI Search Assistant">
      <form className="panel wide form-grid" onSubmit={submit}>
        <label className="form-span">Describe what you need<textarea value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="form-actions"><Button type="submit">Find suggestions</Button></div>
      </form>
      {result ? (
        <section className="panel wide">
          <div className="section-heading"><span>{result.summary}</span></div>
          <div className="profile-grid">
            <div><span>Category</span><strong>{result.parsed.filters.category}</strong></div>
            <div><span>Location</span><strong>{result.parsed.filters.location || "Any"}</strong></div>
            <div><span>Rental type</span><strong>{result.parsed.filters.rentalType}</strong></div>
            <div><span>Duration</span><strong>{result.parsed.duration.units || "Not specified"}</strong></div>
          </div>
          <div className="asset-list">{result.suggestions.map(({ listing, trust }) => <article className="asset-card" key={listing.id}><div><span className="status-badge">Trust {trust.asset.score}/100</span><h3>{listing.title}</h3><p>{listing.location} / {listing.subcategory}</p><p>Supplier trust: {trust.supplier.score}/100</p></div></article>)}</div>
        </section>
      ) : null}
    </AiShell>
  );
}

export function AiListingAssistantPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ assetName: "Mini excavator", category: "heavy-equipment", location: "Kingston", priceRate: "45000" });
  const [suggestion, setSuggestion] = useState(() => suggestListingContent(form));
  const [dashboard, setDashboard] = useState(() => getAiListingAssistantDashboard(window.localStorage, user, "supplier"));
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.title = `${APP_NAME} - AI Listing Assistant`;
  }, []);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    setSuggestion(suggestListingContent(form));
  };
  const auditListing = (listing, analysis) => {
    const record = auditListingRecommendation(window.localStorage, user, listing, analysis);
    setMessage(`Recommendation audit recorded for ${record.listingTitle}.`);
    setDashboard(getAiListingAssistantDashboard(window.localStorage, user, "supplier"));
  };
  const acceptLatest = (recommendationId) => {
    const result = acceptListingRecommendation(window.localStorage, user, recommendationId);
    setMessage(result.valid ? "Recommendation acceptance tracked locally." : result.error);
    setDashboard(getAiListingAssistantDashboard(window.localStorage, user, "supplier"));
  };
  return (
    <AiShell title="AI Listing Assistant">
      <form className="panel wide form-grid" onSubmit={submit}>
        <label>Asset name<input value={form.assetName} onChange={(event) => setField("assetName", event.target.value)} /></label>
        <label>Category<select value={form.category} onChange={(event) => setField("category", event.target.value)}>{ASSET_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
        <label>Location<input value={form.location} onChange={(event) => setField("location", event.target.value)} /></label>
        <label>Price/rate<input type="number" value={form.priceRate} onChange={(event) => setField("priceRate", event.target.value)} /></label>
        <div className="form-actions"><Button type="submit">Generate suggestions</Button></div>
      </form>
      <section className="panel wide">
        <div className="section-heading"><span>Suggested listing content</span></div>
        <h3>{suggestion.title}</h3>
        <p>{suggestion.description}</p>
        <p><strong>Pricing:</strong> {suggestion.pricingSuggestion}</p>
        <p><strong>Trust improvements:</strong> {suggestion.trustImprovements.join(", ")}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>AI listing readiness scorecard</span></div>
        {message ? <p className="success-text">{message}</p> : null}
        <div className="metric-grid">
          <div><strong>{dashboard.averageCompleteness}%</strong><span>Avg completeness</span></div>
          <div><strong>{dashboard.averageAuctionReadiness}%</strong><span>Avg auction readiness</span></div>
          <div><strong>{dashboard.counts.missingFields}</strong><span>Missing fields</span></div>
          <div><strong>{dashboard.counts.mediaWarnings}</strong><span>Media warnings</span></div>
          <div><strong>{dashboard.counts.accepted}</strong><span>Accepted locally</span></div>
          <div><strong>{dashboard.counts.providerActive}</strong><span>Live AI providers</span></div>
        </div>
        <p className="muted">{dashboard.notice}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>AI recommendations panel</span></div>
        <div className="asset-list">
          {dashboard.analyses.map(({ listing, analysis }) => (
            <article className="asset-card" key={listing.id}>
              <div>
                <span className="status-badge neutral">Readiness {analysis.listingCompletenessScore}%</span>
                <h3>{listing.title}</h3>
                <p>Title {analysis.titleQualityScore}% / Description {analysis.descriptionQualityScore}% / Auction readiness {analysis.auctionReadinessScore}%</p>
                <p>Category recommendation: {analysis.categoryRecommendation.recommendedCategory.replaceAll("-", " ")} ({analysis.categoryRecommendation.confidence}% confidence)</p>
                <p>Tags: {analysis.tags.join(", ") || "Add more listing detail for tag recommendations."}</p>
                <p>Reserve placeholder: {analysis.reservePriceRecommendation.suggestedRange}</p>
                <ul>{analysis.recommendations.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <Button variant="secondary" onClick={() => auditListing(listing, analysis)}>Record recommendation</Button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Recommendation acceptance tracking</span></div>
        <div className="asset-list">
          {dashboard.audit.length ? dashboard.audit.map((record) => (
            <article className="asset-card" key={record.recommendationId}>
              <div>
                <span className="status-badge neutral">{record.acceptanceStatus.replaceAll("_", " ")}</span>
                <h3>{record.listingTitle}</h3>
                <p>Completeness {record.listingCompletenessScore}% / Auction readiness {record.auctionReadinessScore}%</p>
                <p className="muted">No automated listing rewrite or external AI provider action occurs.</p>
              </div>
              <Button onClick={() => acceptLatest(record.recommendationId)}>Accept placeholder</Button>
            </article>
          )) : <div className="empty-state"><strong>No recommendation audit records yet</strong><p>Record a recommendation to track supplier acceptance locally.</p></div>}
        </div>
      </section>
    </AiShell>
  );
}

export function AdminAiListingRecommendationsPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(() => getAiListingAssistantDashboard(window.localStorage, user, "admin"));
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.title = `${APP_NAME} - Admin AI Listing Recommendations`;
  }, []);
  const recordAll = () => {
    dashboard.analyses.slice(0, 5).forEach(({ listing, analysis }) => auditListingRecommendation(window.localStorage, user, listing, analysis));
    setMessage("Local recommendation audit records generated for visible listings.");
    setDashboard(getAiListingAssistantDashboard(window.localStorage, user, "admin"));
  };
  return (
    <AiShell title="Admin AI Recommendation Audit">
      <section className="panel wide">
        {message ? <p className="success-text">{message}</p> : null}
        <div className="section-heading"><span>Recommendation audit view</span><Button onClick={recordAll}>Record sample audit</Button></div>
        <div className="metric-grid">
          <div><strong>{dashboard.counts.listings}</strong><span>Listings analyzed</span></div>
          <div><strong>{dashboard.counts.recommendations}</strong><span>Recommendations</span></div>
          <div><strong>{dashboard.counts.missingFields}</strong><span>Missing fields</span></div>
          <div><strong>{dashboard.counts.mediaWarnings}</strong><span>Media warnings</span></div>
          <div><strong>{dashboard.counts.accepted}</strong><span>Accepted locally</span></div>
          <div><strong>{dashboard.counts.providerActive}</strong><span>Live AI providers</span></div>
        </div>
        <p className="muted">{dashboard.notice}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Audit records</span></div>
        <div className="asset-list">
          {dashboard.audit.length ? dashboard.audit.map((record) => (
            <article className="asset-card" key={record.recommendationId}>
              <div>
                <span className="status-badge neutral">{record.acceptanceStatus.replaceAll("_", " ")}</span>
                <h3>{record.listingTitle}</h3>
                <p>Supplier {record.supplierId || "unknown"} / Completeness {record.listingCompletenessScore}% / Auction readiness {record.auctionReadinessScore}%</p>
                <p className="muted">Provider status: {record.providerStatus.replaceAll("_", " ")}</p>
              </div>
            </article>
          )) : <div className="empty-state"><strong>No AI recommendation audit records yet</strong><p>Run a sample local audit to populate recommendation tracking.</p></div>}
        </div>
      </section>
    </AiShell>
  );
}

export function AiValuationEnginePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(() => getAiValuationDashboard(window.localStorage, user, "supplier"));
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.title = `${APP_NAME} - AI Valuation Engine`;
  }, []);
  const recordValuation = (item, valuation) => {
    const record = auditValuationRecommendation(window.localStorage, user, item, valuation);
    setMessage(`Valuation recommendation recorded for ${record.title}.`);
    setDashboard(getAiValuationDashboard(window.localStorage, user, "supplier"));
  };
  const acceptLatest = (recommendationId) => {
    const result = acceptValuationRecommendation(window.localStorage, user, recommendationId);
    setMessage(result.valid ? "Valuation acceptance tracked locally." : result.error);
    setDashboard(getAiValuationDashboard(window.localStorage, user, "supplier"));
  };
  return (
    <AiShell title="AI Valuation Engine">
      <section className="panel wide">
        <div className="section-heading"><span>Asset valuation panel</span></div>
        {message ? <p className="success-text">{message}</p> : null}
        <div className="metric-grid">
          <div><strong>{dashboard.counts.valuations}</strong><span>Assets/lots valued</span></div>
          <div><strong>{dashboard.averageConfidence}%</strong><span>Avg confidence</span></div>
          <div><strong>JMD {dashboard.averageReserve.toLocaleString()}</strong><span>Avg reserve guidance</span></div>
          <div><strong>{dashboard.counts.missingDataIndicators}</strong><span>Missing data</span></div>
          <div><strong>{dashboard.counts.accepted}</strong><span>Accepted locally</span></div>
          <div><strong>{dashboard.counts.providerActive}</strong><span>Live valuation providers</span></div>
        </div>
        <p className="muted">{dashboard.notice}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Reserve recommendation panel</span></div>
        <div className="asset-list">
          {dashboard.valuations.map(({ item, valuation }) => (
            <article className="asset-card" key={`${valuation.sourceType}-${valuation.sourceId}`}>
              <div>
                <span className="status-badge neutral">{valuation.valuationModel}</span>
                <h3>{valuation.title}</h3>
                <p>Market JMD {valuation.estimatedMarketValue.toLocaleString()} / Wholesale JMD {valuation.estimatedWholesaleValue.toLocaleString()} / Retail JMD {valuation.estimatedRetailValue.toLocaleString()}</p>
                <p>Reserve JMD {valuation.suggestedReservePrice.toLocaleString()} / Starting bid JMD {valuation.suggestedStartingBid.toLocaleString()} / Confidence {valuation.confidenceScore}%</p>
                <p>Depreciation: {valuation.depreciationEstimate}</p>
                <p>Missing data: {valuation.missingDataIndicators.join(", ") || "Core valuation data present."}</p>
                <ul>{valuation.strategyNotes.map((note) => <li key={note}>{note}</li>)}</ul>
              </div>
              <Button variant="secondary" onClick={() => recordValuation(item, valuation)}>Record valuation</Button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Auction strategy panel</span></div>
        <div className="asset-list">
          {dashboard.audit.length ? dashboard.audit.map((record) => (
            <article className="asset-card" key={record.recommendationId}>
              <div>
                <span className="status-badge neutral">{record.acceptanceStatus.replaceAll("_", " ")}</span>
                <h3>{record.title}</h3>
                <p>Suggested reserve JMD {record.suggestedReservePrice.toLocaleString()} / Suggested starting bid JMD {record.suggestedStartingBid.toLocaleString()}</p>
                <p>Confidence {record.confidenceScore}% / Provider status: {record.providerStatus.replaceAll("_", " ")}</p>
                <p className="muted">No automated reserve setting or external valuation provider action occurs.</p>
              </div>
              <Button onClick={() => acceptLatest(record.recommendationId)}>Accept placeholder</Button>
            </article>
          )) : <div className="empty-state"><strong>No valuation audit records yet</strong><p>Record a valuation to track local supplier acceptance.</p></div>}
        </div>
      </section>
    </AiShell>
  );
}

export function AdminAiValuationAuditPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(() => getAiValuationDashboard(window.localStorage, user, "admin"));
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.title = `${APP_NAME} - Admin AI Valuation Audit`;
  }, []);
  const recordAll = () => {
    dashboard.valuations.slice(0, 5).forEach(({ item, valuation }) => auditValuationRecommendation(window.localStorage, user, item, valuation));
    setMessage("Local valuation audit records generated for visible assets and auction lots.");
    setDashboard(getAiValuationDashboard(window.localStorage, user, "admin"));
  };
  return (
    <AiShell title="Admin AI Valuation Audit">
      <section className="panel wide">
        {message ? <p className="success-text">{message}</p> : null}
        <div className="section-heading"><span>Valuation audit dashboard</span><Button onClick={recordAll}>Record sample valuations</Button></div>
        <div className="metric-grid">
          <div><strong>{dashboard.counts.assets}</strong><span>Listings</span></div>
          <div><strong>{dashboard.counts.auctions}</strong><span>Auction lots</span></div>
          <div><strong>{dashboard.counts.valuations}</strong><span>Valuations</span></div>
          <div><strong>{dashboard.averageConfidence}%</strong><span>Avg confidence</span></div>
          <div><strong>{dashboard.counts.accepted}</strong><span>Accepted locally</span></div>
          <div><strong>{dashboard.counts.providerActive}</strong><span>Live providers</span></div>
        </div>
        <p className="muted">{dashboard.notice}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Recommendation review</span></div>
        <div className="asset-list">
          {dashboard.audit.length ? dashboard.audit.map((record) => (
            <article className="asset-card" key={record.recommendationId}>
              <div>
                <span className="status-badge neutral">{record.sourceType}</span>
                <h3>{record.title}</h3>
                <p>Supplier {record.supplierId || "unknown"} / Market JMD {record.estimatedMarketValue.toLocaleString()} / Reserve JMD {record.suggestedReservePrice.toLocaleString()}</p>
                <p>Confidence {record.confidenceScore}% / {record.acceptanceStatus.replaceAll("_", " ")}</p>
              </div>
            </article>
          )) : <div className="empty-state"><strong>No valuation audit records yet</strong><p>Run a sample valuation audit to populate recommendation tracking.</p></div>}
        </div>
      </section>
    </AiShell>
  );
}

export function AiRentalAdvisorPage() {
  const listings = assetAdapter.list(window.localStorage);
  const [assetId, setAssetId] = useState(listings[0]?.id || "");
  const [compareAssetId, setCompareAssetId] = useState(listings[1]?.id || "");
  const [advice, setAdvice] = useState(() => adviseRentalChoice(window.localStorage, { assetId, compareAssetId }));
  useEffect(() => {
    document.title = `${APP_NAME} - AI Rental Advisor`;
  }, []);
  const submit = (event) => {
    event.preventDefault();
    setAdvice(adviseRentalChoice(window.localStorage, { assetId, compareAssetId }));
  };
  return (
    <AiShell title="AI Rental Advisor">
      <form className="panel wide form-grid" onSubmit={submit}>
        <label>Primary asset<select value={assetId} onChange={(event) => setAssetId(event.target.value)}>{listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
        <label>Compare with<select value={compareAssetId} onChange={(event) => setCompareAssetId(event.target.value)}>{listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
        <div className="form-actions"><Button type="submit">Compare assets</Button></div>
      </form>
      <section className="panel wide"><div className="section-heading"><span>Advisor result</span></div><p>{advice.recommendation}</p><p>{advice.pricingExplanation}</p></section>
    </AiShell>
  );
}

export function AiBrokerAssistantPage() {
  const [matches, setMatches] = useState(null);
  useEffect(() => {
    document.title = `${APP_NAME} - AI Broker Assistant`;
    setMatches(createBrokerAssistantMatches(window.localStorage));
  }, []);
  return (
    <AiShell title="AI Broker Assistant">
      <section className="panel wide">
        <div className="section-heading"><span>{matches?.summary || "Broker opportunities"}</span></div>
        <div className="asset-list">
          {(matches?.opportunities || []).map(({ request, listing, trust }) => <article className="asset-card" key={`${request.requestId}-${listing.id}`}><div><h3>{request.requestTitle}</h3><p>Suggested match: {listing.title}</p><p>Trust {trust.asset.score}/100</p></div></article>)}
          {(matches?.tradeMatches || []).map(({ listing, wantedCategories, trust }) => <article className="asset-card" key={listing.id}><div><h3>{listing.title}</h3><p>Trade/swap opportunity for {wantedCategories.join(", ") || "open categories"}</p><p>Trust {trust.asset.score}/100</p></div></article>)}
        </div>
      </section>
    </AiShell>
  );
}

export function AiMarketInsightsPage() {
  const insights = generateMarketInsights(window.localStorage);
  useEffect(() => {
    document.title = `${APP_NAME} - AI Market Insights`;
  }, []);
  return (
    <AiShell title="AI Market Insights">
      <section className="panel wide">
        <div className="section-heading"><span>Local marketplace insights</span></div>
        <div className="profile-grid">
          <div><span>Booking volume</span><strong>{insights.bookingVolume}</strong></div>
          <div><span>Popular categories</span><strong>{insights.popularCategories.map(([category]) => category).join(", ") || "Not enough data"}</strong></div>
          <div><span>Trending locations</span><strong>{insights.trendingLocations.map(([location]) => location).join(", ") || "Not enough data"}</strong></div>
          <div><span>High-demand assets</span><strong>{insights.highDemandAssets.map(([category]) => category).join(", ") || "Not enough wanted data"}</strong></div>
          <div><span>Undersupplied markets</span><strong>{insights.undersuppliedMarkets.map((item) => item.category).join(", ") || "None flagged locally"}</strong></div>
        </div>
      </section>
    </AiShell>
  );
}
