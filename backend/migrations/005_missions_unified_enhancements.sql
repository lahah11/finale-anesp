-- Migration to enhance missions_unified workflow and archiving

ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS logistics_notes TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS logistics_payload JSONB;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS airline_name TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS ticket_reference TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS travel_agency TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS accommodation_details TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS local_transport_details TEXT;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS budget_summary JSONB;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS validation_history JSONB;
ALTER TABLE missions_unified ADD COLUMN IF NOT EXISTS documents_rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS mission_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
    mission_reference TEXT NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    archive_payload JSONB,
    documents_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS idx_mission_archives_mission ON mission_archives(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_archives_reference ON mission_archives(mission_reference);

CREATE TABLE IF NOT EXISTS mission_unified_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions_unified(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mission_unified_documents_mission ON mission_unified_documents(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_unified_documents_type ON mission_unified_documents(document_type);
