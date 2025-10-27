-- Migration to enhance missions_unified workflow and archiving

-- Add additional logistics fields
ALTER TABLE missions_unified ADD COLUMN logistics_notes TEXT;
ALTER TABLE missions_unified ADD COLUMN logistics_payload TEXT;
ALTER TABLE missions_unified ADD COLUMN airline_name TEXT;
ALTER TABLE missions_unified ADD COLUMN flight_number TEXT;
ALTER TABLE missions_unified ADD COLUMN ticket_reference TEXT;
ALTER TABLE missions_unified ADD COLUMN travel_agency TEXT;
ALTER TABLE missions_unified ADD COLUMN accommodation_details TEXT;
ALTER TABLE missions_unified ADD COLUMN local_transport_details TEXT;
ALTER TABLE missions_unified ADD COLUMN budget_summary TEXT;
ALTER TABLE missions_unified ADD COLUMN validation_history TEXT;
ALTER TABLE missions_unified ADD COLUMN documents_rejection_reason TEXT;

-- Table for archived missions
CREATE TABLE IF NOT EXISTS mission_archives (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_id TEXT NOT NULL,
    mission_reference TEXT NOT NULL,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_by TEXT NOT NULL,
    archive_payload TEXT,
    documents_snapshot TEXT,
    FOREIGN KEY (mission_id) REFERENCES missions_unified(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mission_archives_mission ON mission_archives(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_archives_reference ON mission_archives(mission_reference);

-- Table dedicated to documents generated for missions_unified
CREATE TABLE IF NOT EXISTS mission_unified_documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    mission_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    generated_by TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mission_id) REFERENCES missions_unified(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mission_unified_documents_mission ON mission_unified_documents(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_unified_documents_type ON mission_unified_documents(document_type);
