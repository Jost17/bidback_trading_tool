-- ROLLBACK SCRIPT for Market Breadth Data Migration
-- Created: 2025-09-04
-- 
-- This script can rollback the migration if needed
-- ONLY USE IF THERE ARE SERIOUS ISSUES WITH THE MIGRATION
--
-- To use this rollback:
-- 1. Stop the application
-- 2. Restore from backup: cp trading.db.backup.20250904_190349 trading.db
-- 
-- Alternative manual rollback (if backup is unavailable):

BEGIN TRANSACTION;

-- WARNING: This will undo the migration changes
-- Remove migration tracking from notes field
UPDATE market_breadth 
SET notes = REPLACE(notes, ' [MIGRATED: Fixed field mappings on 2025-09-04]', '')
WHERE notes LIKE '%MIGRATED%';

-- The rest would need to be restored from backup as the original wrong values
-- cannot be reliably reconstructed from the current correct values

ROLLBACK; -- Don't actually execute this - use backup restore instead

-- RECOMMENDED ROLLBACK PROCEDURE:
-- cp trading.db.backup.20250904_190349 trading.db
-- 
-- This restores the database to exactly the state before migration.