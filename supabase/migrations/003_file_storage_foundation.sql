-- RentasHub Module 25 file storage and upload foundation contract.
-- This stores metadata only. Binary files belong in object storage later.

ALTER TABLE file_metadata ADD COLUMN stored_file_name TEXT;
ALTER TABLE file_metadata ADD COLUMN original_file_name TEXT;
ALTER TABLE file_metadata ADD COLUMN file_size INTEGER;
ALTER TABLE file_metadata ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE file_metadata ADD COLUMN checksum TEXT;
ALTER TABLE file_metadata ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_file_metadata_owner_id ON file_metadata(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_entity ON file_metadata(entity_type, entity_id);
