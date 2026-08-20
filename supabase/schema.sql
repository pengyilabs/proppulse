-- PropPulse Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────
-- Organizations
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_preferences JSONB DEFAULT '{}'::jsonb,
  approval_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Organization Members
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'broker')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Listings (Real Estate Properties)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2),
  location TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_footage INTEGER,
  images TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  language_variants JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org listings"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = listings.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage listings"
  ON listings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = listings.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Templates (AI-Generated Design Templates)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  name TEXT,
  design_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

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

-- ────────────────────────────────────────────────────────────────────────────
-- Posts
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES auth.users(id),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed', 'rejected')
  ),
  scheduled_date TIMESTAMPTZ,
  platform TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  rejection_feedback TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = posts.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Brokers can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = org_id
      AND organization_members.user_id = auth.uid()
    )
    AND broker_id = auth.uid()
  );

CREATE POLICY "Brokers can update their own draft posts"
  ON posts FOR UPDATE
  USING (
    broker_id = auth.uid()
    AND status IN ('draft', 'pending_approval')
  );

CREATE POLICY "Admins can update any post in their org"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = posts.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Social Accounts
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  page_id TEXT,
  page_name TEXT,
  credentials JSONB DEFAULT '{}'::jsonb,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_org_platform_unique UNIQUE (org_id, platform);
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org social accounts"
  ON social_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = social_accounts.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage social accounts"
  ON social_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = social_accounts.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Post Insights
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE post_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view post insights for org posts"
  ON post_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      JOIN organization_members ON organization_members.org_id = posts.org_id
      WHERE posts.id = post_insights.post_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Storage Bucket for Listing Images
-- ────────────────────────────────────────────────────────────────────────────
-- Run these separately in Supabase Storage SQL editor:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);

-- CREATE POLICY "Anyone can view listing images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'listings');

-- CREATE POLICY "Authenticated users can upload listing images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can delete their own listing images"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'listings' AND auth.role() = 'authenticated');