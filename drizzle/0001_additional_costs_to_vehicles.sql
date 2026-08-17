ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS additional_costs integer NOT NULL DEFAULT 0;

