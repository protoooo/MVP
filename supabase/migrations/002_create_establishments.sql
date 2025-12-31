-- Create establishments table for Washtenaw County inspections
CREATE TABLE IF NOT EXISTS establishments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT,
    inspection_date DATE,
    severity TEXT,
    violations TEXT[],
    notes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_establishments_name ON establishments(name);
CREATE INDEX IF NOT EXISTS idx_establishments_inspection_date ON establishments(inspection_date);
CREATE INDEX IF NOT EXISTS idx_establishments_severity ON establishments(severity);
CREATE INDEX IF NOT EXISTS idx_establishments_type ON establishments(type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_establishments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_establishments_updated_at_trigger
    BEFORE UPDATE ON establishments
    FOR EACH ROW
    EXECUTE FUNCTION update_establishments_updated_at();

-- Add county column for future multi-county support
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS county TEXT DEFAULT 'washtenaw';
CREATE INDEX IF NOT EXISTS idx_establishments_county ON establishments(county);
