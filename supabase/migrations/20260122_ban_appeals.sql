-- Ban Appeals System
-- Migration: 20260122_ban_appeals.sql

-- Create ban appeals table
CREATE TABLE IF NOT EXISTS ban_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  appeal_reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_pending_appeal UNIQUE (user_id, status)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ban_appeals_status ON ban_appeals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_user ON ban_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_reviewed ON ban_appeals(reviewed_by);

-- Enable Row Level Security
ALTER TABLE ban_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own appeals
CREATE POLICY "Users can view own appeals"
  ON ban_appeals FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own appeals (only if banned and no pending appeal exists)
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

-- Trigger to enforce single pending appeal per user
CREATE TRIGGER enforce_single_pending_appeal
  BEFORE INSERT OR UPDATE ON ban_appeals
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_appeal();
