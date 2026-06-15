import { CATEGORY_BRAND_LABELS } from "./brand.js";

export const ASSET_LISTINGS_STORAGE_KEY = "rentashub_asset_listings";

export const ASSET_CATEGORIES = [
  {
    id: "cars",
    label: CATEGORY_BRAND_LABELS.cars,
    subcategories: ["Compact", "Sedan", "SUV", "7-seater", "Luxury", "Electric"],
    specificFields: ["make", "model", "year", "plateVin", "seats", "fuelType", "transmission"],
  },
  {
    id: "trucks",
    label: CATEGORY_BRAND_LABELS.trucks,
    subcategories: ["Pickup", "Box Truck", "Flatbed", "Dump Truck", "Refrigerated", "Tow Truck"],
    specificFields: ["make", "model", "year", "plateVin", "capacity", "boxSize", "commercialUse", "driverIncluded"],
  },
  {
    id: "heavy-equipment",
    label: CATEGORY_BRAND_LABELS["heavy-equipment"],
    subcategories: ["Excavator", "Backhoe", "Bulldozer", "Loader", "Forklift", "Crane"],
    specificFields: ["equipmentType", "operatingWeight", "operatorRequired", "engineHours"],
  },
  {
    id: "small-tools-machines",
    label: CATEGORY_BRAND_LABELS["small-tools-machines"],
    subcategories: ["Cutting", "Drilling", "Compaction", "Cleaning", "Power Tools", "Gardening"],
    specificFields: ["powerType", "condition", "accessoriesIncluded"],
  },
  {
    id: "event-spaces",
    label: CATEGORY_BRAND_LABELS["event-spaces"],
    subcategories: ["Hall", "Outdoor Venue", "Conference Room", "Studio", "Restaurant", "Private Yard"],
    specificFields: ["capacity", "amenities", "parking", "noiseRules", "eventType"],
  },
  {
    id: "real-estate",
    label: CATEGORY_BRAND_LABELS["real-estate"],
    subcategories: ["Apartment", "House", "Commercial", "Land", "Office", "Short-term Rental"],
    specificFields: ["bedrooms", "bathrooms", "squareFootage", "leaseSaleRentalOption"],
  },
  {
    id: "trailers",
    label: CATEGORY_BRAND_LABELS.trailers,
    subcategories: ["Utility", "Car Hauler", "Enclosed", "Flatbed", "Boat Trailer", "Food Trailer"],
    specificFields: ["capacity", "dimensions", "commercialUse"],
  },
  {
    id: "storage-containers",
    label: CATEGORY_BRAND_LABELS["storage-containers"],
    subcategories: ["Storage Unit", "Shipping Container", "Cold Storage", "Portable Storage", "Secure Locker"],
    specificFields: ["dimensions", "accessRules", "securityFeatures"],
  },
  {
    id: "specialty-assets",
    label: CATEGORY_BRAND_LABELS["specialty-assets"],
    subcategories: ["Boat", "Generator", "Stage", "Lighting", "Agriculture", "Other"],
    specificFields: ["condition", "accessoriesIncluded", "usageNotes"],
  },
];

export const RENTAL_TYPES = ["hourly", "daily", "weekly", "monthly", "long-term"];
export const MARKETPLACE_LISTING_TYPES = ["rental", "sale", "trade", "swap", "brokerage", "rent_or_buy", "rent_or_trade"];
export const MARKETPLACE_LISTING_LABELS = {
  rental: "Available for Rent",
  sale: "Available for Sale",
  trade: "Available for Trade",
  swap: "Available for Swap",
  brokerage: "Broker-assisted transaction",
  rent_or_buy: "Available for Rent or Buy",
  rent_or_trade: "Available for Rent or Trade",
};
export const AVAILABILITY_STATUSES = ["available", "pending approval", "paused", "maintenance", "unavailable"];
export const VERIFICATION_STATUSES = ["draft", "pending review", "verified", "needs revision"];
export const SORT_OPTIONS = ["relevance", "price", "newest", "category", "trust"];
export const PROTECTION_REQUIREMENTS = ["required", "optional", "not_offered"];

export const CATEGORY_DESCRIPTIONS = {
  cars: "Cars for daily travel, tourism, family trips, business use, and personal transport.",
  trucks: "Trucks for logistics, moving, construction, delivery, and commercial jobs.",
  "heavy-equipment": "Heavy equipment for jobsites, contractors, construction, agriculture, and infrastructure work.",
  "small-tools-machines": "Small tools and machines for home projects, tradespeople, repairs, and light construction.",
  "event-spaces": "Event spaces for meetings, celebrations, pop-ups, training sessions, and private gatherings.",
  "real-estate": "Real estate rental, lease, sale, brokerage, and property discovery listings.",
  trailers: "Trailers for hauling vehicles, goods, equipment, food service, and specialty transport.",
  "storage-containers": "Storage and container spaces for secure, temporary, business, and jobsite storage.",
  "specialty-assets": "Specialty assets that do not fit ordinary rental categories, including boats, generators, stages, and lighting.",
};

export const EMPTY_ASSET_FORM = {
  title: "",
  category: "cars",
  subcategory: "",
  description: "",
  location: "",
  rentalType: "daily",
  priceRate: "",
  depositRequirement: "",
  deliveryPickupOptions: "pickup",
  availabilityStatus: "available",
  photos: [],
  ownerSupplierId: "",
  insuranceRequirement: "",
  protectionRequirement: "optional",
  damagePolicy: "",
  cancellationPolicy: "",
  safetyInstructions: "",
  usageInstructions: "",
  operatorRequired: false,
  verificationStatus: "draft",
  listingType: "rental",
  salePrice: "",
  tradeValue: "",
  swapInterested: false,
  wantedCategories: [],
  brokerAssistRequired: false,
  negotiationAllowed: true,
  categoryFields: {},
};

export const SEED_LISTINGS = [
  {
    id: "asset-seed-supplier-1",
    title: "7-seater SUV for airport and family rentals",
    category: "cars",
    subcategory: "7-seater",
    description: "Clean, comfortable SUV suitable for families, airport pickup, and weekend travel.",
    location: "Kingston",
    rentalType: "daily",
    priceRate: 18000,
    depositRequirement: "JMD 30000 refundable deposit",
    deliveryPickupOptions: "pickup or delivery",
    availabilityStatus: "available",
    photos: [{ id: "photo-placeholder-1", name: "front-view-placeholder.jpg", status: "placeholder" }],
    ownerSupplierId: "review-supplier",
    supplierName: "Review Supplier",
    insuranceRequirement: "Valid driver's license and renter insurance required.",
    protectionRequirement: "required",
    damagePolicy: "Renter is responsible for new damage verified at return inspection.",
    cancellationPolicy: "Free cancellation up to 24 hours before pickup.",
    safetyInstructions: "Seat belts required for all passengers.",
    usageInstructions: "No off-road use without written approval.",
    operatorRequired: false,
    verificationStatus: "verified",
    listingType: "rent_or_buy",
    salePrice: 2200000,
    tradeValue: 2100000,
    swapInterested: true,
    wantedCategories: ["trucks", "real-estate"],
    brokerAssistRequired: false,
    negotiationAllowed: true,
    categoryFields: {
      make: "Toyota",
      model: "Noah",
      year: "2021",
      plateVin: "VIN placeholder",
      seats: "7",
      fuelType: "Gasoline",
      transmission: "Automatic",
    },
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
  },
  {
    id: "asset-seed-other-supplier",
    title: "Mini excavator with operator option",
    category: "heavy-equipment",
    subcategory: "Excavator",
    description: "Compact excavator for small jobsites, drainage, trenching, and landscaping work.",
    location: "Spanish Town",
    rentalType: "daily",
    priceRate: 42000,
    depositRequirement: "JMD 80000 deposit or approved business account.",
    deliveryPickupOptions: "delivery only",
    availabilityStatus: "pending approval",
    photos: [],
    ownerSupplierId: "supplier-two",
    supplierName: "Independent Equipment Yard",
    insuranceRequirement: "Business verification and site address required.",
    protectionRequirement: "optional",
    damagePolicy: "Damage assessed by inspection checklist and service report.",
    cancellationPolicy: "Same-day cancellations may incur delivery fee.",
    safetyInstructions: "Certified operator recommended. Keep bystanders clear.",
    usageInstructions: "Do not exceed approved operating area.",
    operatorRequired: true,
    verificationStatus: "pending review",
    listingType: "brokerage",
    salePrice: 6400000,
    tradeValue: 5900000,
    swapInterested: false,
    wantedCategories: ["heavy-equipment", "trucks"],
    brokerAssistRequired: true,
    negotiationAllowed: true,
    categoryFields: {
      equipmentType: "Mini excavator",
      operatingWeight: "3.5 tons",
      operatorRequired: "Optional",
      engineHours: "1450",
    },
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
  },
];

export function getCategoryById(categoryId) {
  return ASSET_CATEGORIES.find((category) => category.id === categoryId) || ASSET_CATEGORIES[0];
}

export function createEmptyAssetForm(ownerSupplierId = "") {
  return {
    ...EMPTY_ASSET_FORM,
    ownerSupplierId,
    subcategory: ASSET_CATEGORIES[0].subcategories[0],
  };
}

export function normalizeAssetInput(input = {}) {
  const category = getCategoryById(input.category);
  return {
    ...createEmptyAssetForm(input.ownerSupplierId || ""),
    ...input,
    category: category.id,
    subcategory: input.subcategory || category.subcategories[0],
    priceRate: input.priceRate === "" ? "" : Number(input.priceRate),
    salePrice: input.salePrice === "" ? "" : Number(input.salePrice || 0),
    tradeValue: input.tradeValue === "" ? "" : Number(input.tradeValue || 0),
    swapInterested: Boolean(input.swapInterested),
    wantedCategories: Array.isArray(input.wantedCategories) ? input.wantedCategories : [],
    brokerAssistRequired: Boolean(input.brokerAssistRequired),
    negotiationAllowed: input.negotiationAllowed === undefined ? true : Boolean(input.negotiationAllowed),
    protectionRequirement: PROTECTION_REQUIREMENTS.includes(input.protectionRequirement) ? input.protectionRequirement : "optional",
    photos: Array.isArray(input.photos) ? input.photos : [],
    categoryFields: input.categoryFields || {},
  };
}

export function validateAssetListing(input = {}) {
  const listing = normalizeAssetInput(input);
  const errors = {};
  const required = [
    ["title", "Asset title is required."],
    ["category", "Category is required."],
    ["subcategory", "Subcategory is required."],
    ["description", "Description is required."],
    ["location", "Location is required."],
    ["rentalType", "Rental type is required."],
    ["priceRate", "Price/rate is required."],
    ["depositRequirement", "Deposit requirement is required."],
    ["deliveryPickupOptions", "Delivery or pickup option is required."],
    ["availabilityStatus", "Availability status is required."],
    ["ownerSupplierId", "Supplier ID is required."],
    ["insuranceRequirement", "Insurance requirement is required."],
    ["damagePolicy", "Damage policy is required."],
    ["cancellationPolicy", "Cancellation policy is required."],
    ["safetyInstructions", "Safety instructions are required."],
    ["usageInstructions", "Usage instructions are required."],
  ];

  required.forEach(([field, message]) => {
    if (listing[field] === "" || listing[field] === null || listing[field] === undefined) {
      errors[field] = message;
    }
  });

  if (!RENTAL_TYPES.includes(listing.rentalType)) errors.rentalType = "Choose a valid rental type.";
  if (!MARKETPLACE_LISTING_TYPES.includes(listing.listingType)) errors.listingType = "Choose a valid marketplace listing type.";
  if (!AVAILABILITY_STATUSES.includes(listing.availabilityStatus)) errors.availabilityStatus = "Choose a valid availability status.";
  if (!VERIFICATION_STATUSES.includes(listing.verificationStatus)) errors.verificationStatus = "Choose a valid verification status.";
  if (!PROTECTION_REQUIREMENTS.includes(listing.protectionRequirement)) errors.protectionRequirement = "Choose required, optional, or not offered.";
  if (Number.isNaN(Number(listing.priceRate)) || Number(listing.priceRate) <= 0) errors.priceRate = "Enter a price greater than 0.";
  if (["sale", "rent_or_buy"].includes(listing.listingType) && Number(listing.salePrice) <= 0) errors.salePrice = "Enter a sale price for buy/sell listings.";
  if (["trade", "swap", "rent_or_trade"].includes(listing.listingType) && Number(listing.tradeValue) <= 0) errors.tradeValue = "Enter a trade value for trade/swap listings.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    listing,
  };
}

export function createAssetListing(input) {
  const validation = validateAssetListing(input);
  if (!validation.valid) return validation;

  const now = new Date().toISOString();
  return {
    valid: true,
    errors: {},
    listing: {
      ...validation.listing,
      id: validation.listing.id || `asset-${Date.now()}`,
      supplierName: validation.listing.supplierName || "Supplier",
      createdAt: validation.listing.createdAt || now,
      updatedAt: now,
    },
  };
}

export function canEditAssetListing(user, listing) {
  if (!user || !listing) return false;
  return ["supplier", "vendor"].includes(user.role) && listing.ownerSupplierId === user.id;
}

export function canCreateAssetListing(user) {
  return Boolean(user && ["supplier", "vendor"].includes(user.role));
}

export function canViewAssetListing(user, listing) {
  if (!listing) return false;
  if (!user) return true;
  if (["customer", "guest", "user", "broker"].includes(user.role)) return true;
  if (["supplier", "vendor"].includes(user.role)) return true;
  if (user.role === "admin") return true;
  return false;
}

export function loadAssetListings(storage) {
  if (!storage) return SEED_LISTINGS;
  const raw = storage.getItem(ASSET_LISTINGS_STORAGE_KEY);
  if (!raw) {
    storage.setItem(ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(SEED_LISTINGS));
    return SEED_LISTINGS;
  }
  return JSON.parse(raw);
}

export function saveAssetListings(storage, listings) {
  if (!storage) return listings;
  storage.setItem(ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  return listings;
}

export function upsertAssetListing(storage, input) {
  const result = createAssetListing(input);
  if (!result.valid) return result;
  const listings = loadAssetListings(storage);
  const index = listings.findIndex((listing) => listing.id === result.listing.id);
  const nextListings = index >= 0
    ? listings.map((listing) => (listing.id === result.listing.id ? result.listing : listing))
    : [result.listing, ...listings];
  saveAssetListings(storage, nextListings);
  return { ...result, listings: nextListings };
}

export function getSupplierListings(storage, supplierId) {
  return loadAssetListings(storage).filter((listing) => listing.ownerSupplierId === supplierId);
}

export function getAssetListingById(storage, id) {
  return loadAssetListings(storage).find((listing) => listing.id === id) || null;
}

export function createEmptySearchFilters(overrides = {}) {
  return {
    keyword: "",
    category: "all",
    subcategory: "all",
    location: "",
    rentalType: "all",
    minPrice: "",
    maxPrice: "",
    availabilityStatus: "all",
    deliveryPickupOptions: "all",
    operatorRequired: "all",
    verificationStatus: "all",
    listingType: "all",
    sortBy: "relevance",
    ...overrides,
  };
}

function textIncludes(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function listingSearchText(listing) {
  return [
    listing.title,
    listing.description,
    listing.location,
    listing.subcategory,
    listing.supplierName,
    getCategoryById(listing.category).label,
    listing.listingType,
    MARKETPLACE_LISTING_LABELS[listing.listingType],
    ...Object.values(listing.categoryFields || {}),
  ].join(" ");
}

export function searchAssetListings(listings = [], filters = {}) {
  const activeFilters = createEmptySearchFilters(filters);
  const keyword = activeFilters.keyword.trim().toLowerCase();
  const minPrice = activeFilters.minPrice === "" ? null : Number(activeFilters.minPrice);
  const maxPrice = activeFilters.maxPrice === "" ? null : Number(activeFilters.maxPrice);

  const filtered = listings.filter((listing) => {
    if (keyword && !textIncludes(listingSearchText(listing), keyword)) return false;
    if (activeFilters.category !== "all" && listing.category !== activeFilters.category) return false;
    if (activeFilters.subcategory !== "all" && listing.subcategory !== activeFilters.subcategory) return false;
    if (activeFilters.location && !textIncludes(listing.location, activeFilters.location)) return false;
    if (activeFilters.rentalType !== "all" && listing.rentalType !== activeFilters.rentalType) return false;
    if (minPrice !== null && Number(listing.priceRate) < minPrice) return false;
    if (maxPrice !== null && Number(listing.priceRate) > maxPrice) return false;
    if (activeFilters.availabilityStatus !== "all" && listing.availabilityStatus !== activeFilters.availabilityStatus) return false;
    if (activeFilters.deliveryPickupOptions !== "all" && !textIncludes(listing.deliveryPickupOptions, activeFilters.deliveryPickupOptions)) return false;
    if (activeFilters.operatorRequired !== "all" && String(Boolean(listing.operatorRequired)) !== activeFilters.operatorRequired) return false;
    if (activeFilters.verificationStatus !== "all" && listing.verificationStatus !== activeFilters.verificationStatus) return false;
    if (activeFilters.listingType !== "all") {
      if (activeFilters.listingType === "buy" && !["sale", "rent_or_buy"].includes(listing.listingType)) return false;
      else if (activeFilters.listingType === "sell" && !["sale", "rent_or_buy"].includes(listing.listingType)) return false;
      else if (activeFilters.listingType === "trade" && !["trade", "rent_or_trade"].includes(listing.listingType)) return false;
      else if (activeFilters.listingType === "swap" && listing.listingType !== "swap") return false;
      else if (activeFilters.listingType === "brokerage" && listing.listingType !== "brokerage") return false;
      else if (!["buy", "sell", "trade", "swap", "brokerage"].includes(activeFilters.listingType) && listing.listingType !== activeFilters.listingType) return false;
    }
    return true;
  });

  return sortAssetListings(filtered, activeFilters.sortBy, keyword);
}

export function sortAssetListings(listings = [], sortBy = "relevance", keyword = "") {
  const next = [...listings];
  if (sortBy === "price") return next.sort((a, b) => Number(a.priceRate) - Number(b.priceRate));
  if (sortBy === "newest") return next.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  if (sortBy === "category") return next.sort((a, b) => getCategoryById(a.category).label.localeCompare(getCategoryById(b.category).label));
  if (keyword) {
    return next.sort((a, b) => {
      const aTitle = textIncludes(a.title, keyword) ? 0 : 1;
      const bTitle = textIncludes(b.title, keyword) ? 0 : 1;
      return aTitle - bTitle;
    });
  }
  return next;
}

export function applyAiSearchSuggestion(text = "") {
  const query = text.toLowerCase();
  const filters = {};

  for (const category of ASSET_CATEGORIES) {
    if (query.includes(category.label.toLowerCase()) || query.includes(category.id.replace(/-/g, " "))) {
      filters.category = category.id;
    }
  }
  if (query.includes("car") || query.includes("suv")) filters.category = "cars";
  if (query.includes("truck") || query.includes("driver")) filters.category = "trucks";
  if (query.includes("excavator") || query.includes("equipment")) filters.category = "heavy-equipment";
  if (query.includes("venue") || query.includes("event")) filters.category = "event-spaces";
  if (query.includes("storage") || query.includes("container")) filters.category = "storage-containers";
  if (query.includes("operator")) filters.operatorRequired = "true";
  if (query.includes("delivery")) filters.deliveryPickupOptions = "delivery";
  if (query.includes("verified")) filters.verificationStatus = "verified";
  if (query.includes("buy") || query.includes("purchase")) filters.listingType = "buy";
  if (query.includes("sell") || query.includes("sale")) filters.listingType = "sell";
  if (query.includes("trade")) filters.listingType = "trade";
  if (query.includes("swap") || query.includes("exchange")) filters.listingType = "swap";
  if (query.includes("broker")) filters.listingType = "brokerage";

  const underMatch = query.match(/under\s+(\d+)/);
  if (underMatch) filters.maxPrice = underMatch[1];

  return {
    filters,
    message: Object.keys(filters).length
      ? "I found simple filters from your request. Full AI matching will be added in the AI module."
      : "AI search is coming soon. Try using keywords and filters for now.",
  };
}
