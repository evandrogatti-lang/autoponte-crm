BEGIN;

CREATE TABLE IF NOT EXISTS public.vehicle_evidence_observations (
  id text PRIMARY KEY,
  vehicle_id text NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'inspectionStatus', 'documentStatus', 'vehicleCondition',
    'mechanical', 'structural', 'wear', 'provenance_maintenance'
  )),
  value_jsonb jsonb NOT NULL,
  value_hash text NOT NULL,
  source text NOT NULL CHECK (source IN ('document', 'inspection', 'manufacturer', 'photo_ai')),
  confidence integer NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  verified boolean NOT NULL DEFAULT false,
  external_ref text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by text NOT NULL,
  verified_by text NOT NULL DEFAULT '',
  captured_at timestamptz NOT NULL,
  verified_at timestamptz,
  supersedes_observation_id text REFERENCES public.vehicle_evidence_observations(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (submitted_by <> ''),
  CHECK (verified = false OR (verified_at IS NOT NULL AND verified_by <> '')),
  CHECK (supersedes_observation_id IS NULL OR supersedes_observation_id <> id)
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_evidence_observations_external_identity_unique
  ON public.vehicle_evidence_observations(vehicle_id, evidence_type, source, external_ref)
  WHERE external_ref <> '';
CREATE INDEX IF NOT EXISTS vehicle_evidence_observations_vehicle_type_captured_idx
  ON public.vehicle_evidence_observations(vehicle_id, evidence_type, captured_at);
CREATE INDEX IF NOT EXISTS vehicle_evidence_observations_vehicle_idx
  ON public.vehicle_evidence_observations(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_evidence_observations_supersedes_idx
  ON public.vehicle_evidence_observations(supersedes_observation_id);

ALTER TABLE public.vehicle_data_provenance
  ADD COLUMN IF NOT EXISTS observation_id text REFERENCES public.vehicle_evidence_observations(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS vehicle_data_provenance_observation_idx
  ON public.vehicle_data_provenance(observation_id);

COMMIT;
