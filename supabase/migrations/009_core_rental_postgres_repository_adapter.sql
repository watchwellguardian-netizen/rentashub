-- ACCEL microtask: Core rental PostgreSQL repository adapter constraints.
-- Prepared SQL only. Do not execute against production until A4 evidence,
-- backup/restore validation, RLS tests, and release approval are accepted.
-- Rollback note: these constraints should be removed through a compensating
-- migration after data-quality review; do not drop production constraints ad hoc.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_core_rental_status_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_core_rental_status_check
      CHECK (status IN ('pending', 'approved', 'confirmed', 'checked_in', 'active', 'extension_requested', 'completed', 'cancelled', 'declined', 'disputed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_core_rental_amounts_non_negative'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_core_rental_amounts_non_negative
      CHECK (subtotal >= 0 AND deposit_amount >= 0 AND total_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_core_rental_currency_code_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_core_rental_currency_code_check
      CHECK (currency ~ '^[A-Z]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_core_rental_time_window_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_core_rental_time_window_check
      CHECK (start_at IS NULL OR end_at IS NULL OR start_at::timestamptz < end_at::timestamptz);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assets_core_rental_amounts_non_negative'
      AND conrelid = 'public.assets'::regclass
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_core_rental_amounts_non_negative
      CHECK ((price_rate IS NULL OR price_rate >= 0) AND (deposit_amount IS NULL OR deposit_amount >= 0));
  END IF;
END $$;
