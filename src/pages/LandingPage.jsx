import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bot, Building2, ChartNoAxesCombined, Search, ShieldCheck, Store, Users } from "lucide-react";
import Button from "../components/Button.jsx";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "../lib/brand.js";
import { LANDING_CATEGORY_CARDS, LANDING_TRUST_BADGES } from "../lib/landingContent.js";
import { setPageMeta } from "../lib/seo.js";
import { useAuth } from "../state/AuthContext.jsx";

const roleFlows = [
  { icon: Search, title: "Customers", steps: ["Search trusted assets", "Request booking or offer", "Inspect, review, and build trust"] },
  { icon: Store, title: "Suppliers", steps: ["Create business profile", "List assets with rules", "Manage requests and reputation"] },
  { icon: Building2, title: "Brokers", steps: ["Review wanted demand", "Match buyers and sellers", "Track brokerage leads"] },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setPageMeta({
      title: `${APP_NAME} - ${APP_TAGLINE}`,
      description: APP_DESCRIPTION,
    });
  }, []);

  const listRoute = user ? "/list-asset" : "/login";

  return (
    <main className="landing-public">
      <section className="landing-public-hero">
        <div className="landing-public-copy">
          <p className="eyebrow">RentasHub Marketplace</p>
          <h1>{APP_NAME}</h1>
          <p className="landing-public-tagline">{APP_TAGLINE}</p>
          <p>{APP_DESCRIPTION}</p>
          <div className="landing-actions">
            <Button onClick={() => navigate("/search")}>Search Marketplace</Button>
            <Button variant="secondary" onClick={() => navigate(listRoute)}>List Your Asset</Button>
          </div>
        </div>
        <aside className="floating-trust-card" aria-label="RentasHub trust readiness">
          <ShieldCheck size={34} aria-hidden="true" />
          <strong>Trust-ready marketplace layer</strong>
          <span>Reviews, inspections, verification status, claims foundations, and risk scoring are built for pilot review. Live provider activation remains pending.</span>
        </aside>
      </section>

      <section className="stats-bar" aria-label="RentasHub market opportunity stats">
        <div><strong>$4.2B+</strong><span>market opportunity tracked</span></div>
        <div><strong>14k+</strong><span>supplier universe target</span></div>
        <div><strong>98.8%</strong><span>trust standard target</span></div>
      </section>

      <section className="landing-section">
        <div className="section-kicker">
          <p className="eyebrow">Marketplace Categories</p>
          <h2>One platform for rental, sale, trade, auction, swap, and brokerage demand</h2>
        </div>
        <div className="category-card-grid">
          {LANDING_CATEGORY_CARDS.map((category) => {
            const Icon = category.icon;
            return (
              <button className="category-card" type="button" key={category.slug} onClick={() => navigate(`/marketplace/${category.slug}`)}>
                <Icon size={28} aria-hidden="true" />
                <strong>{category.title}</strong>
                <span>{category.copy}</span>
                <em>Explore <ArrowRight size={14} aria-hidden="true" /></em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-kicker">
          <p className="eyebrow">How It Works</p>
          <h2>Designed around the three marketplace roles</h2>
        </div>
        <div className="role-flow-grid">
          {roleFlows.map((flow) => {
            const Icon = flow.icon;
            return (
              <article className="role-flow-card" key={flow.title}>
                <Icon size={30} aria-hidden="true" />
                <h3>{flow.title}</h3>
                <ol>{flow.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section trust-layer-section">
        <div className="section-kicker">
          <p className="eyebrow">Trust & Safety Layer</p>
          <h2>Readiness badges without false live claims</h2>
        </div>
        <div className="trust-badge-grid">
          {LANDING_TRUST_BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <article className="trust-badge-card" key={badge.label}>
                <Icon size={24} aria-hidden="true" />
                <strong>{badge.label}</strong>
                <span>{badge.detail}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section split-value-section">
        <div className="supplier-value-copy">
          <p className="eyebrow">Supplier Value</p>
          <h2>Turn idle assets into managed marketplace inventory</h2>
          <p>Suppliers can prepare listings, rules, photos metadata, verification status, messages, rental requests, earnings placeholders, and trust-building workflows.</p>
          <Button onClick={() => navigate(listRoute)}>List Your Asset</Button>
        </div>
        <div className="performance-card-mockup">
          <span>Supplier Performance</span>
          <strong>86</strong>
          <p>Profile completeness, listing quality, response behavior, reviews, and inspection outcomes feed the local trust model.</p>
          <div className="mini-bars"><i /><i /><i /><i /></div>
        </div>
      </section>

      <section className="landing-section customer-ai-section">
        <div>
          <p className="eyebrow">Customer Value</p>
          <h2>Find better-fit assets with AI-assisted search</h2>
          <p>Use natural language prompts like “I need a 10-ton excavator in Kingston for 3 days” to map intent into marketplace filters. This remains local assistant behavior until live AI integration is activated.</p>
        </div>
        <button className="ai-teaser-card" type="button" onClick={() => navigate("/ai/search")}>
          <Bot size={30} aria-hidden="true" />
          <strong>Ask RentasHub AI</strong>
          <span>Compare assets, explain trust scores, and suggest rental paths.</span>
        </button>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>{APP_NAME}</strong>
          <span>{APP_TAGLINE}</span>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/trust">Trust</Link>
          <Link to="/protection">Protection</Link>
          <Link to="/ai">AI Help</Link>
        </nav>
      </footer>

      <div className="mobile-bottom-cta">
        <button type="button" onClick={() => navigate("/search")}><Search size={18} aria-hidden="true" />Search</button>
        <button type="button" onClick={() => navigate(listRoute)}><BadgeCheck size={18} aria-hidden="true" />List</button>
        <button type="button" onClick={() => navigate("/marketplace")}><ChartNoAxesCombined size={18} aria-hidden="true" />Browse</button>
      </div>
    </main>
  );
}
