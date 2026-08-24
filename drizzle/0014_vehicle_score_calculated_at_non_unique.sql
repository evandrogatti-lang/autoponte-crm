BEGIN;

DROP INDEX IF EXISTS vehicle_scores_vehicle_type_version_calculated_unique;

CREATE INDEX IF NOT EXISTS vehicle_scores_vehicle_type_version_calculated_idx
  ON vehicle_scores (vehicle_id, score_type, version, calculated_at);

COMMIT;
