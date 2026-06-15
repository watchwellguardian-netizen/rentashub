import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, RotateCcw, Search } from "lucide-react";
import AssetCard from "../components/AssetCard.jsx";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { trustAdapter } from "../lib/adapters/trustAdapter.js";
import { ASSET_CATEGORIES, AVAILABILITY_STATUSES, MARKETPLACE_LISTING_LABELS, MARKETPLACE_LISTING_TYPES, RENTAL_TYPES, SORT_OPTIONS, applyAiSearchSuggestion, createEmptySearchFilters, searchAssetListings } from "../lib/assetListing.js";
import { APP_NAME } from "../lib/brand.js";

export default function MarketplaceSearch({ categorySlug = null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState(() => createEmptySearchFilters({
    keyword: searchParams.get("q") || "",
    category: categorySlug || "all",
  }));
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = categorySlug ? `${APP_NAME} - Category` : `${APP_NAME} - Marketplace`;
  }, [categorySlug]);

  useEffect(() => {
    let active = true;
    try {
      setLoading(true);
      Promise.resolve(assetAdapter.list(window.localStorage))
        .then((loaded) => {
          if (active) setListings(loaded);
        })
        .catch((err) => {
          if (active) setError(err.message || "We could not load marketplace listings. Please refresh and try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch {
      setError("We could not load marketplace listings. Please refresh and try again.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (categorySlug) setFilters((current) => ({ ...current, category: categorySlug }));
  }, [categorySlug]);

  const category = ASSET_CATEGORIES.find((item) => item.id === filters.category);
  const subcategories = category ? category.subcategories : [];
  const filteredResults = useMemo(() => {
    return searchAssetListings(listings, filters);
  }, [filters, listings]);

  useEffect(() => {
    let active = true;
    if (filters.sortBy === "trust") {
      Promise.resolve(trustAdapter.rankListings(window.localStorage, filteredResults))
        .then((ranked) => {
          if (active) setResults(ranked);
        })
        .catch(() => {
          if (active) setResults(filteredResults);
        });
    } else {
      setResults(filteredResults);
    }
    return () => {
      active = false;
    };
  }, [filteredResults, filters.sortBy]);

  const setFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "category" ? { subcategory: "all" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters(createEmptySearchFilters({ category: categorySlug || "all" }));
    setAiMessage("");
  };

  const askAi = (event) => {
    event.preventDefault();
    const suggestion = applyAiSearchSuggestion(aiPrompt);
    setFilters((current) => ({ ...current, keyword: aiPrompt, ...suggestion.filters }));
    setAiMessage(suggestion.message);
  };

  if (loading) return <main className="page center-page">Loading marketplace search...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow">{error}</section></main>;

  return (
    <main className="page marketplace-page">
      <section className="hero-panel">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>{categorySlug ? `${category?.label || "Category"} Listings` : "RentasHub Marketplace"}</h1>
        <p>Find rentals and brokerage assets using simple filters. Booking remains a controlled placeholder until the booking module.</p>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Bot size={18} aria-hidden="true" /> Ask AI to help find the right rental</span></div>
        <form className="search-row" onSubmit={askAi}>
          <label className="visually-hidden" htmlFor="ai-search">Natural language search</label>
          <input id="ai-search" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Example: I need a small excavator with operator under 50000" />
          <Button type="submit"><Bot size={18} aria-hidden="true" /> Ask AI</Button>
        </form>
        {aiMessage ? <p className="muted">{aiMessage}</p> : null}
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Search size={18} aria-hidden="true" /> Filters</span><button className="link-button" onClick={resetFilters}><RotateCcw size={14} aria-hidden="true" /> Reset filters</button></div>
        <div className="filter-grid">
          <label>Keyword<input value={filters.keyword} onChange={(event) => setFilter("keyword", event.target.value)} placeholder="SUV, excavator, venue..." /></label>
          <label>Category<select value={filters.category} onChange={(event) => setFilter("category", event.target.value)} disabled={Boolean(categorySlug)}><option value="all">All categories</option>{ASSET_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Subcategory<select value={filters.subcategory} onChange={(event) => setFilter("subcategory", event.target.value)}><option value="all">All subcategories</option>{subcategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Location<input value={filters.location} onChange={(event) => setFilter("location", event.target.value)} placeholder="Kingston, Montego Bay..." /></label>
          <label>Rental type<select value={filters.rentalType} onChange={(event) => setFilter("rentalType", event.target.value)}><option value="all">All rental types</option>{RENTAL_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Min price<input type="number" value={filters.minPrice} onChange={(event) => setFilter("minPrice", event.target.value)} /></label>
          <label>Max price<input type="number" value={filters.maxPrice} onChange={(event) => setFilter("maxPrice", event.target.value)} /></label>
          <label>Availability<select value={filters.availabilityStatus} onChange={(event) => setFilter("availabilityStatus", event.target.value)}><option value="all">Any status</option>{AVAILABILITY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Delivery/pickup<select value={filters.deliveryPickupOptions} onChange={(event) => setFilter("deliveryPickupOptions", event.target.value)}><option value="all">Any option</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></label>
          <label>Operator required<select value={filters.operatorRequired} onChange={(event) => setFilter("operatorRequired", event.target.value)}><option value="all">Either</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label>Verification<select value={filters.verificationStatus} onChange={(event) => setFilter("verificationStatus", event.target.value)}><option value="all">Any verification</option><option value="verified">Verified</option><option value="pending review">Pending review</option><option value="draft">Draft</option><option value="needs revision">Needs revision</option></select></label>
          <label>Marketplace type<select value={filters.listingType} onChange={(event) => setFilter("listingType", event.target.value)}><option value="all">Rent, buy, sell, trade, auction, swap, brokerage</option><option value="buy">Buy</option><option value="sell">Sell</option><option value="trade">Trade</option><option value="swap">Swap</option><option value="brokerage">Brokerage</option>{MARKETPLACE_LISTING_TYPES.map((item) => <option key={item} value={item}>{MARKETPLACE_LISTING_LABELS[item]}</option>)}</select></label>
          <label>Sort by<select value={filters.sortBy} onChange={(event) => setFilter("sortBy", event.target.value)}>{SORT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>{results.length} result{results.length === 1 ? "" : "s"}</span></div>
        {results.length === 0 ? (
          <div className="empty-state"><strong>No assets found</strong><p>Try a broader keyword, lower price filter, or reset filters.</p></div>
        ) : (
          <div className="asset-list">
            {results.map((listing) => <AssetCard key={listing.id} listing={listing} onView={() => navigate(`/asset/${listing.id}`)} />)}
          </div>
        )}
      </section>
    </main>
  );
}
