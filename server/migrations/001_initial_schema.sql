-- RentasHub Module 21 initial persistence contract.
-- SQL is intentionally PostgreSQL-compatible while the local dev adapter remains dependency-free.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  location TEXT,
  rental_type TEXT,
  price_rate REAL,
  deposit_amount REAL,
  listing_type TEXT NOT NULL DEFAULT 'rental',
  sale_price REAL,
  trade_value REAL,
  availability_status TEXT NOT NULL DEFAULT 'available',
  verification_status TEXT NOT NULL DEFAULT 'not_started',
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  start_at TEXT,
  end_at TEXT,
  total_amount REAL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  condition_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_ledger (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  asset_id TEXT,
  customer_id TEXT,
  supplier_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  subtotal REAL DEFAULT 0,
  deposit REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  supplier_earnings REAL DEFAULT 0,
  total REAL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_threads (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  asset_id TEXT,
  participant_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_profiles (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  supplier_type TEXT NOT NULL,
  service_areas_json TEXT,
  profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS verification_records (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  status TEXT NOT NULL,
  checklist_json TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  response_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  asset_id TEXT,
  opened_by TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  offer_type TEXT NOT NULL,
  offer_amount REAL,
  proposal_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS wanted_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  request_title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  budget_range TEXT,
  location TEXT,
  urgency TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS brokerage_leads (
  id TEXT PRIMARY KEY,
  broker_id TEXT,
  source_id TEXT,
  lead_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notes_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS trust_scores (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  factors_json TEXT,
  risk_flags_json TEXT,
  calculated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS protection_plans (
  id TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fee_rate REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'simulated',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS protection_selections (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'selected',
  fee_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  asset_id TEXT,
  claimant_id TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  details_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_metadata (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'placeholder',
  storage_key TEXT,
  status TEXT NOT NULL DEFAULT 'metadata_only',
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  schema_version TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
