import { isSupplierRole } from "./bookingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const SUPPLIER_PROFILE_STORAGE_KEY = "rentashub_supplier_profiles";

export const SUPPLIER_TYPES = ["individual", "company", "broker", "fleet owner", "equipment owner", "property owner"];
export const VERIFICATION_STATUSES = ["not_started", "pending", "verified", "rejected", "needs_more_info"];
export const VERIFICATION_DOCUMENTS = [
  "ID document",
  "Business registration",
  "Proof of address",
  "Insurance document",
  "Asset ownership proof",
  "Operator certification",
];

export const DEFAULT_SUPPLIER_PROFILE = {
  supplierId: "",
  businessName: "",
  contactPerson: "",
  phone: "",
  email: "",
  businessAddress: "",
  serviceAreas: "",
  supplierType: "individual",
  bio: "",
  logoPhoto: { name: "logo/photo upload-ready placeholder", status: "placeholder" },
  businessHours: "",
  emergencyContact: "",
  publicSummary: "",
  verificationStatus: "not_started",
  verificationDocuments: {},
  updatedAt: "",
};

export function loadSupplierProfiles(storage) {
  if (!storage) return [];
  const raw = storage.getItem(SUPPLIER_PROFILE_STORAGE_KEY);
  if (!raw) {
    storage.setItem(SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveSupplierProfiles(storage, profiles) {
  if (!storage) return profiles;
  storage.setItem(SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

export function createEmptySupplierProfile(user = {}) {
  return {
    ...DEFAULT_SUPPLIER_PROFILE,
    supplierId: user.id || "",
    businessName: user.business_name || user.full_name || "",
    contactPerson: user.full_name || "",
    email: user.email || "",
    verificationDocuments: VERIFICATION_DOCUMENTS.reduce((docs, doc) => ({
      ...docs,
      [doc]: { submitted: false, name: `${doc} upload-ready placeholder`, status: "placeholder" },
    }), {}),
  };
}

export function getSupplierProfile(storage, supplierId, user = {}) {
  return loadSupplierProfiles(storage).find((profile) => profile.supplierId === supplierId) || createEmptySupplierProfile({ ...user, id: supplierId });
}

export function canManageSupplierProfile(user, supplierId) {
  return Boolean(user && isSupplierRole(user.role) && user.id === supplierId);
}

export function canViewPublicSupplierProfile(user, profile) {
  if (!profile) return false;
  if (!user) return true;
  const role = normalizeRole(user.role);
  return ["customer", "guest", "user", "supplier", "vendor", "broker", "admin"].includes(role);
}

export function calculateProfileCompleteness(profile = {}) {
  const fields = ["businessName", "contactPerson", "phone", "email", "businessAddress", "serviceAreas", "supplierType", "bio", "businessHours", "emergencyContact", "publicSummary"];
  const complete = fields.filter((field) => String(profile[field] || "").trim()).length;
  return Math.round((complete / fields.length) * 100);
}

export function upsertSupplierProfile(storage, user, input) {
  if (!canManageSupplierProfile(user, user?.id)) {
    return { valid: false, error: "Only suppliers can update their own supplier profile." };
  }
  const existing = getSupplierProfile(storage, user.id, user);
  const nextProfile = {
    ...existing,
    ...input,
    supplierId: user.id,
    supplierType: SUPPLIER_TYPES.includes(input.supplierType) ? input.supplierType : existing.supplierType,
    logoPhoto: input.logoPhoto || existing.logoPhoto,
    verificationDocuments: existing.verificationDocuments,
    updatedAt: new Date().toISOString(),
  };
  const profiles = loadSupplierProfiles(storage);
  const nextProfiles = profiles.some((profile) => profile.supplierId === user.id)
    ? profiles.map((profile) => (profile.supplierId === user.id ? nextProfile : profile))
    : [nextProfile, ...profiles];
  saveSupplierProfiles(storage, nextProfiles);
  return { valid: true, profile: nextProfile, profiles: nextProfiles };
}

export function submitVerification(storage, user, selectedDocuments = {}) {
  if (!canManageSupplierProfile(user, user?.id)) {
    return { valid: false, error: "Only suppliers can submit verification for their own profile." };
  }
  const existing = getSupplierProfile(storage, user.id, user);
  const documents = VERIFICATION_DOCUMENTS.reduce((docs, doc) => ({
    ...docs,
    [doc]: {
      ...(existing.verificationDocuments?.[doc] || {}),
      submitted: Boolean(selectedDocuments[doc]),
      name: selectedDocuments[doc] ? `${doc} upload-ready placeholder` : existing.verificationDocuments?.[doc]?.name || `${doc} upload-ready placeholder`,
      status: selectedDocuments[doc] ? "submitted_placeholder" : existing.verificationDocuments?.[doc]?.status || "placeholder",
    },
  }), {});
  const nextProfile = {
    ...existing,
    verificationStatus: "pending",
    verificationDocuments: documents,
    updatedAt: new Date().toISOString(),
  };
  const profiles = loadSupplierProfiles(storage);
  saveSupplierProfiles(storage, profiles.some((profile) => profile.supplierId === user.id)
    ? profiles.map((profile) => (profile.supplierId === user.id ? nextProfile : profile))
    : [nextProfile, ...profiles]);
  createNotification(storage, {
    recipientId: user.id,
    type: "verification_submitted",
    title: "Verification submitted",
    body: "Your supplier verification checklist was submitted for simulated local review.",
    relatedRoute: "/verification/status",
  });
  return { valid: true, profile: nextProfile };
}

export function simulateVerificationStatus(storage, supplierId, status = "needs_more_info") {
  if (!VERIFICATION_STATUSES.includes(status)) return { valid: false, error: "Choose a valid verification status." };
  const profile = getSupplierProfile(storage, supplierId);
  const nextProfile = { ...profile, verificationStatus: status, updatedAt: new Date().toISOString() };
  const profiles = loadSupplierProfiles(storage);
  saveSupplierProfiles(storage, profiles.some((item) => item.supplierId === supplierId)
    ? profiles.map((item) => (item.supplierId === supplierId ? nextProfile : item))
    : [nextProfile, ...profiles]);
  createNotification(storage, {
    recipientId: supplierId,
    type: "verification_status_changed",
    title: "Verification status updated",
    body: `Supplier verification status is now ${status}. This is simulated local review only.`,
    relatedRoute: "/verification/status",
  });
  return { valid: true, profile: nextProfile };
}

export function getSupplierPublicSummary(storage, supplierId) {
  const profile = getSupplierProfile(storage, supplierId);
  return {
    supplierId,
    businessName: profile.businessName || "Supplier",
    publicSummary: profile.publicSummary || profile.bio || "Supplier profile summary has not been completed yet.",
    serviceAreas: profile.serviceAreas || "Service areas not set",
    supplierType: profile.supplierType,
    verificationStatus: profile.verificationStatus || "not_started",
    completeness: calculateProfileCompleteness(profile),
  };
}

export function isSupplierVerified(storage, supplierId) {
  return getSupplierProfile(storage, supplierId).verificationStatus === "verified";
}
