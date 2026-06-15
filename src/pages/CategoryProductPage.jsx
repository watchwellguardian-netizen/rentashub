import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { getCategoryById } from "../lib/assetListing.js";
import { CATEGORY_PRODUCT_CONTENT } from "../lib/landingContent.js";
import { setPageMeta } from "../lib/seo.js";

const bookingSteps = ["Search and compare", "Request booking or offer", "Confirm inspection-ready details", "Review and update trust signals"];

export default function CategoryProductPage() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const content = CATEGORY_PRODUCT_CONTENT[categorySlug];
  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (!content) return;
    setPageMeta({
      title: `${content.title} Marketplace`,
      description: content.description,
    });
    let active = true;
    Promise.resolve(assetAdapter.list(window.localStorage))
      .then((items) => {
        if (active) setListings(items.filter((item) => item.category === categorySlug).slice(0, 3));
      })
      .catch(() => {
        if (active) setListings([]);
      });
    return () => {
      active = false;
    };
  }, [categorySlug, content]);

  const category = useMemo(() => getCategoryById(categorySlug), [categorySlug]);

  if (!content) return <Navigate to="/marketplace" replace />;

  const Icon = content.icon;

  return (
    <main className="page product-page">
      <section className="product-hero">
        <div className="product-hero-copy">
          <p className="breadcrumb"><Link to="/">Home</Link> / <Link to="/marketplace">Marketplace</Link> / {content.title}</p>
          <span className="product-icon"><Icon size={28} aria-hidden="true" /></span>
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <div className="landing-actions">
            <Button onClick={() => navigate(`/search?category=${categorySlug}`)}>Search {content.title}</Button>
            <Button variant="secondary" onClick={() => navigate("/list-asset")}>List Your Asset</Button>
          </div>
        </div>
        <img className="product-hero-image" src={content.heroImage} alt={`${content.title} marketplace`} />
      </section>

      <section className="product-section">
        <div>
          <p className="eyebrow">Category Benefits</p>
          <h2>Built for {content.title.toLowerCase()} decisions</h2>
        </div>
        <div className="feature-grid">
          {content.benefits.map((benefit) => <article className="feature-card" key={benefit}>{benefit}</article>)}
        </div>
      </section>

      <section className="product-section two-panel">
        <div className="panel soft-panel">
          <h2>Who Uses This</h2>
          <div className="tag-row">{content.users.map((user) => <span className="status-badge neutral" key={user}>{user}</span>)}</div>
        </div>
        <div className="panel soft-panel">
          <h2>Category Fields</h2>
          <div className="tag-row">{category.subcategories.slice(0, 6).map((item) => <span className="status-badge" key={item}>{item}</span>)}</div>
        </div>
      </section>

      <section className="product-section">
        <div className="section-heading"><span>Featured assets</span><Button variant="secondary" onClick={() => navigate(`/search?category=${categorySlug}`)}>Open full search</Button></div>
        {listings.length === 0 ? <div className="empty-state"><strong>No featured assets yet</strong><p>Supplier listings in this category will appear here after they are created.</p></div> : (
          <div className="feature-grid">
            {listings.map((listing) => (
              <article className="asset-card product-card" key={listing.id}>
                <div>
                  <span className="status-badge neutral">{listing.availabilityStatus}</span>
                  <h3>{listing.title}</h3>
                  <p>{listing.location} / {listing.subcategory}</p>
                  <p>JMD {Number(listing.priceRate || 0).toLocaleString()} per {listing.rentalType}</p>
                </div>
                <Button onClick={() => navigate(`/asset/${listing.id}`)}>View asset</Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="product-section two-panel">
        <div className="panel supplier-value-panel">
          <p className="eyebrow">For Suppliers</p>
          <h2>Turn inventory into managed opportunity</h2>
          <p>{content.supplierValue}</p>
          <Button onClick={() => navigate("/list-asset")}>Start listing</Button>
        </div>
        <div className="panel customer-value-panel">
          <p className="eyebrow">For Customers</p>
          <h2>Find the right asset with fewer dead ends</h2>
          <p>{content.customerValue}</p>
          <Button variant="secondary" onClick={() => navigate("/ai/search")}>Ask AI Search</Button>
        </div>
      </section>

      <section className="product-section">
        <p className="eyebrow">Trust & Safety</p>
        <h2>Readiness controls without false live claims</h2>
        <div className="feature-grid">
          {["Supplier verification status", "Inspection-ready bookings", "Reviews and trust scoring", "Claims and dispute foundations"].map((item) => <article className="feature-card" key={item}>{item}</article>)}
        </div>
      </section>

      <section className="product-section">
        <p className="eyebrow">Booking Flow</p>
        <h2>Four clear steps</h2>
        <div className="flow-grid">
          {bookingSteps.map((step, index) => <article className="flow-card" key={step}><strong>{index + 1}</strong><span>{step}</span></article>)}
        </div>
      </section>

      <section className="product-section">
        <p className="eyebrow">FAQ</p>
        <h2>Common questions</h2>
        <div className="faq-list">
          {content.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="final-cta">
        <h2>Start with {content.title}</h2>
        <p>Search the marketplace or list an asset when you are ready.</p>
        <div className="landing-actions">
          <Button onClick={() => navigate(`/search?category=${categorySlug}`)}>Search Marketplace</Button>
          <Button variant="secondary" onClick={() => navigate("/list-asset")}>List Your Asset</Button>
        </div>
      </section>
    </main>
  );
}
