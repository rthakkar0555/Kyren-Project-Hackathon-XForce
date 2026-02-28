-- API Usage Tracking System
-- Migration: 20260122_api_usage_tracking.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- API usage logs (detailed per-call tracking)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  service_name TEXT NOT NULL, -- 'openai_gpt', 'openai_tts', 'gemini', 'youtube', 'tesseract'
  model_name TEXT, -- 'gpt-4o-mini', 'tts-1', 'gemini-pro', etc.
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 6) DEFAULT 0,
  request_metadata JSONB DEFAULT '{}'::jsonb, -- Store additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing summary (aggregated by user/service/month)
CREATE TABLE IF NOT EXISTS api_billing_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  month DATE NOT NULL, -- First day of month
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_name, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_logs(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_summary_user_month ON api_billing_summary(user_id, month DESC);

-- Enable Row Level Security
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_billing_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs
-- Users can view their own logs
CREATE POLICY "Users can view own API usage logs"
  ON api_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert logs
CREATE POLICY "Service role can insert API usage logs"
  ON api_usage_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for api_billing_summary
-- Users can view their own billing summary
CREATE POLICY "Users can view own billing summary"
  ON api_billing_summary FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage billing summary
CREATE POLICY "Service role can manage billing summary"
  ON api_billing_summary FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update billing summary
CREATE OR REPLACE FUNCTION update_billing_summary()
RETURNS TRIGGER AS $$
DECLARE
  month_start DATE;
BEGIN
  -- Get first day of the month
  month_start := DATE_TRUNC('month', NEW.created_at)::DATE;
  
  -- Upsert billing summary
  INSERT INTO api_billing_summary (
    user_id,
    service_name,
    month,
    total_calls,
    total_tokens,
    total_cost_usd,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.service_name,
    month_start,
    1,
    NEW.total_tokens,
    NEW.estimated_cost_usd,
    NOW()
  )
  ON CONFLICT (user_id, service_name, month)
  DO UPDATE SET
    total_calls = api_billing_summary.total_calls + 1,
    total_tokens = api_billing_summary.total_tokens + NEW.total_tokens,
    total_cost_usd = api_billing_summary.total_cost_usd + NEW.estimated_cost_usd,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update billing summary
CREATE TRIGGER trigger_update_billing_summary
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_summary();

-- Grant permissions
GRANT SELECT ON api_usage_logs TO authenticated;
GRANT SELECT ON api_billing_summary TO authenticated;
