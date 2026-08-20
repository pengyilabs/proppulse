-- Migration: Template redesign - org branding + uploaded sign templates
-- 2026-08-20

-- Add branding fields to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en' CHECK (default_language IN ('en', 'fr', 'zh')),
  ADD COLUMN IF NOT EXISTS default_platform TEXT DEFAULT 'facebook' CHECK (default_platform IN ('facebook', 'wechat'));

-- Rebuild templates table for uploaded sign designs
-- First backup existing data if any
CREATE TABLE IF NOT EXISTS templates_backup AS SELECT * FROM templates;

-- Drop old policies that reference listing_id
DROP POLICY IF EXISTS "Members can view org templates" ON templates;
DROP POLICY IF EXISTS "Members can insert templates" ON templates;

-- Recreate templates table
ALTER TABLE templates
  ALTER COLUMN name SET NOT NULL,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'uploaded' CHECK (type IN ('uploaded', 'generated')),
  DROP COLUMN IF EXISTS listing_id,
  DROP COLUMN IF EXISTS preview_url;

-- Ensure design_data has a default
ALTER TABLE templates
  ALTER COLUMN design_data SET DEFAULT '{}'::jsonb;

-- Recreate policies for new templates structure
CREATE POLICY "Members can view org templates"
  ON templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = templates.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert templates"
  ON templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete org templates"
  ON templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = templates.org_id
      AND organization_members.user_id = auth.uid()
    )
  );