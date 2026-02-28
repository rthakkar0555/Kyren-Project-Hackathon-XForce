-- Video Progress Tracking Table
-- Tracks individual video completion for each user

CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL, -- YouTube video ID
    video_title TEXT NOT NULL,
    watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one progress record per user per video
    UNIQUE(user_id, lesson_id, video_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_lesson ON video_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_completed ON video_progress(user_id, is_completed);

-- RLS Policies
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own video progress
CREATE POLICY "Users can view own video progress"
    ON video_progress FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own video progress
CREATE POLICY "Users can insert own video progress"
    ON video_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own video progress
CREATE POLICY "Users can update own video progress"
    ON video_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_progress_updated_at
    BEFORE UPDATE ON video_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_video_progress_updated_at();
