-- ACCEL microtask: Core rental PostgreSQL repository adapter constraints.
-- Prepared SQL only. Do not execute against production until A4 evidence,
-- backup/restore validation, RLS tests, and release approval are accepted.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_rental_idempotency_actor_action_key
  ON public.core_rental_idempotency_records(actor_id, action, idempotency_key)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_customer_idempotency_active
  ON public.bookings(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_no_core_rental_blocking_overlap'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_no_core_rental_blocking_overlap
      EXCLUDE USING gist (
        asset_id WITH =,
        tstzrange(start_at::timestamptz, end_at::timestamptz, '[)') WITH &&
      )
      WHERE (
        deleted_at IS NULL
        AND status IN ('pending', 'approved', 'confirmed', 'checked_in', 'active', 'extension_requested')
      );
  END IF;
END $$;
