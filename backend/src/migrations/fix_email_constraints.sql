-- Migration to fix email CHECK constraints that may cause pattern matching errors
-- This removes any CHECK constraints on the email field that might be too restrictive

-- Remove any existing CHECK constraints on the users.email column
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find all CHECK constraints on the users table that involve the email column
    FOR constraint_rec IN 
        SELECT DISTINCT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = 'users' 
        AND tc.constraint_type = 'CHECK'
        AND ccu.column_name = 'email'
    LOOP
        -- Drop the constraint
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped CHECK constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Ensure email column allows standard email format
-- The application layer will handle email validation using the regex:
-- /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
