-- Migration Script: Add Passcode Support to Existing Database
-- Run this if you already have the compliance schema and need to add passcode support
-- Date: 2024-12-30

-- ============================================================================
-- STEP 1: Add passcode column to analysis_sessions
-- ============================================================================

-- Add passcode column (nullable at first)
ALTER TABLE analysis_sessions 
ADD COLUMN IF NOT EXISTS passcode TEXT;

-- Add upload_completed column
ALTER TABLE analysis_sessions 
ADD COLUMN IF NOT EXISTS upload_completed BOOLEAN DEFAULT false;

-- Add pdf_url column
ALTER TABLE analysis_sessions 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- ============================================================================
-- STEP 2: Generate passcodes for existing sessions
-- ============================================================================

-- Function to generate a 5-digit passcode
CREATE OR REPLACE FUNCTION generate_unique_passcode()
RETURNS TEXT AS $$
DECLARE
  new_passcode TEXT;
  passcode_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 5-digit number
    new_passcode := LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    
    -- Check if it already exists
    SELECT EXISTS(
      SELECT 1 FROM analysis_sessions WHERE passcode = new_passcode
    ) INTO passcode_exists;
    
    -- If unique, return it
    IF NOT passcode_exists THEN
      RETURN new_passcode;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing rows with unique passcodes
UPDATE analysis_sessions 
SET passcode = generate_unique_passcode()
WHERE passcode IS NULL;

-- ============================================================================
-- STEP 3: Make passcode NOT NULL and UNIQUE
-- ============================================================================

-- Now make passcode NOT NULL
ALTER TABLE analysis_sessions 
ALTER COLUMN passcode SET NOT NULL;

-- Add unique constraint
ALTER TABLE analysis_sessions 
ADD CONSTRAINT analysis_sessions_passcode_unique UNIQUE (passcode);

-- ============================================================================
-- STEP 4: Create index on passcode
-- ============================================================================

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_passcode 
ON analysis_sessions(passcode);

-- ============================================================================
-- STEP 5: Verify migration
-- ============================================================================

-- Check that all sessions have passcodes
DO $$
DECLARE
  null_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Check for NULL passcodes
  SELECT COUNT(*) INTO null_count
  FROM analysis_sessions
  WHERE passcode IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % sessions with NULL passcode', null_count;
  END IF;
  
  -- Check for duplicate passcodes
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT passcode, COUNT(*) as cnt
    FROM analysis_sessions
    GROUP BY passcode
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate passcodes', duplicate_count;
  END IF;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'All sessions have unique passcodes';
END $$;

-- ============================================================================
-- STEP 6: Clean up
-- ============================================================================

-- Drop the temporary function (optional, but recommended)
DROP FUNCTION IF EXISTS generate_unique_passcode();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View sample sessions with passcodes
SELECT id, passcode, type, status, upload_completed, created_at
FROM analysis_sessions
ORDER BY created_at DESC
LIMIT 5;

-- Count sessions by status
SELECT status, COUNT(*) 
FROM analysis_sessions 
GROUP BY status;

-- Verify passcode uniqueness
SELECT 
  COUNT(*) as total_sessions,
  COUNT(DISTINCT passcode) as unique_passcodes,
  COUNT(*) = COUNT(DISTINCT passcode) as all_unique
FROM analysis_sessions;
