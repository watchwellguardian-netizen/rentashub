const now = "2026-06-07T00:00:00.000Z";

export const seedData = {
  users: [
    { id: "customer-demo", name: "Maya Customer", email: "maya@example.test", role: "customer", status: "active", created_at: now, updated_at: now },
    { id: "supplier-demo", name: "Dwayne Supplier", email: "dwayne@example.test", role: "supplier", status: "active", created_at: now, updated_at: now },
    { id: "broker-demo", name: "Nia Broker", email: "nia@example.test", role: "broker", status: "active", created_at: now, updated_at: now },
    { id: "admin-demo", name: "Admin User", email: "admin@example.test", role: "admin", status: "active", created_at: now, updated_at: now },
  ],
  roles: [
    { id: "role-customer", name: "customer", description: "Can browse, book, message, review, and create wanted requests.", created_at: now },
    { id: "role-supplier", name: "supplier", description: "Can manage own listings, bookings, earnings, and supplier profile.", created_at: now },
    { id: "role-broker", name: "broker", description: "Can manage brokerage leads and exchange opportunities.", created_at: now },
    { id: "role-admin", name: "admin", description: "Controlled admin oversight role.", created_at: now },
  ],
  asset_categories: [
    { id: "cat-cars", slug: "cars", name: "Cars", parent_id: null, created_at: now },
    { id: "cat-trucks", slug: "trucks", name: "Trucks", parent_id: null, created_at: now },
    { id: "cat-heavy-equipment", slug: "heavy-equipment", name: "Heavy Equipment", parent_id: null, created_at: now },
    { id: "cat-event-spaces", slug: "event-spaces", name: "Event Spaces", parent_id: null, created_at: now },
  ],
  supplier_profiles: [
    {
      id: "supplier-profile-demo",
      supplier_id: "supplier-demo",
      business_name: "Kingston Reliable Rentals",
      supplier_type: "equipment owner",
      service_areas_json: JSON.stringify(["Kingston", "St. Andrew"]),
      profile_json: JSON.stringify({ phone: "555-0100", verificationStatus: "verified" }),
      created_at: now,
      updated_at: now,
    },
  ],
  assets: [
    {
      id: "asset-demo-excavator",
      owner_id: "supplier-demo",
      title: "10-ton excavator",
      category: "heavy-equipment",
      subcategory: "excavator",
      description: "Demo heavy equipment listing for backend persistence tests.",
      location: "Kingston",
      rental_type: "daily",
      price_rate: 450,
      deposit_amount: 1200,
      listing_type: "rent_or_buy",
      sale_price: 88000,
      trade_value: 82000,
      availability_status: "available",
      verification_status: "verified",
      metadata_json: JSON.stringify({ operatorRequired: true }),
      created_at: now,
      updated_at: now,
    },
  ],
  bookings: [
    {
      id: "booking-demo-approved",
      asset_id: "asset-demo-excavator",
      customer_id: "customer-demo",
      supplier_id: "supplier-demo",
      status: "approved",
      payment_status: "unpaid",
      start_at: "2026-07-01T09:00:00.000Z",
      end_at: "2026-07-03T17:00:00.000Z",
      total_amount: 1350,
      metadata_json: JSON.stringify({ source: "seed" }),
      created_at: now,
      updated_at: now,
    },
  ],
  protection_plans: [
    { id: "protection-demo-damage", plan_type: "damage_waiver", name: "Simulated Damage Waiver", description: "Development placeholder only.", fee_rate: 0.08, status: "simulated", created_at: now },
  ],
  trust_scores: [
    { id: "trust-supplier-demo", subject_id: "supplier-demo", subject_type: "supplier", score: 82, factors_json: JSON.stringify({ verification: "verified" }), risk_flags_json: JSON.stringify([]), calculated_at: now },
  ],
  audit_logs: [
    { id: "audit-seed-1", actor_id: "system", action: "seed", entity_type: "database", entity_id: "seed-data", metadata_json: JSON.stringify({ module: 21 }), created_at: now },
  ],
};
