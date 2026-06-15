import { useParams } from "react-router-dom";
import MarketplaceSearch from "./MarketplaceSearch.jsx";
import { CATEGORY_DESCRIPTIONS, getCategoryById } from "../lib/assetListing.js";

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const category = getCategoryById(categorySlug);

  return (
    <>
      <section className="page category-intro">
        <div className="panel">
          <p className="eyebrow">Category</p>
          <h1>{category.label}</h1>
          <p>{CATEGORY_DESCRIPTIONS[category.id]}</p>
        </div>
      </section>
      <MarketplaceSearch categorySlug={category.id} />
    </>
  );
}
