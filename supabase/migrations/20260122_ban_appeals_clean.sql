-- Clean up existing ban_appeals table and recreate it properly
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own appeals" ON ban_appeals;
DROP POLICY IF EXISTS "Banned users can submit appeals" ON ban_appeals;
DROP POLICY IF EXISTS "Service role can manage appeals" ON ban_appeals;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS enforce_single_pending_appeal ON ban_appeals;
DROP FUNCTION IF EXISTS check_pending_appeal();

-- Drop existing table
DROP TABLE IF EXISTS ban_appeals CASCADE;

-- Now create everything fresh
CREATE TABLE ban_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  appeal_reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_ban_appeals_status ON ban_appeals(status, created_at DESC);
CREATE INDEX idx_ban_appeals_user ON ban_appeals(user_id);
CREATE INDEX idx_ban_appeals_reviewed ON ban_appeals(reviewed_by);

-- Enable RLS
ALTER TABLE ban_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own appeals"
  ON ban_appeals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Banned users can submit appeals"
  ON ban_appeals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON ban_appeals TO authenticated;
GRANT ALL ON ban_appeals TO service_role;

-- Function to prevent multiple pending appeals
CREATE OR REPLACE FUNCTION check_pending_appeal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    IF EXISTS (
      SELECT 1 FROM ban_appeals 
      WHERE user_id = NEW.user_id 
      AND status = 'pending' 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'User already has a pending appeal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER enforce_single_pending_appeal
  BEFORE INSERT OR UPDATE ON ban_appeals
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_appeal();
