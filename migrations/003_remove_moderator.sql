-- Migration: 003_remove_moderator.sql
-- Description: Remove moderator role and consolidate to admin only

-- Delete moderator account
DELETE FROM admins WHERE username = 'moderator';

-- Update any remaining moderator roles to admin
UPDATE admins SET role = 'admin' WHERE role IN ('moderator', 'super_admin');

-- Update role default constraint
ALTER TABLE admins ALTER COLUMN role SET DEFAULT 'admin';
