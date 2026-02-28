-- Removed invalid foreign key attempt. 
-- lessons table is linked to modules, not courses directly.

-- Create User Skills table for persistent profile data
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    category TEXT NOT NULL, -- language, frontend, backend, science, etc.
    proficiency_level INTEGER DEFAULT 0, -- 0-100
    source_courses_count INTEGER DEFAULT 0,
    last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique skills per user
    UNIQUE(user_id, skill_name)
);

-- Enable RLS
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_skills' AND policyname = 'Users can view own skills'
    ) THEN
        CREATE POLICY "Users can view own skills" ON user_skills FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_skills' AND policyname = 'Users can insert own skills'
    ) THEN
        CREATE POLICY "Users can insert own skills" ON user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_skills' AND policyname = 'Users can update own skills'
    ) THEN
        CREATE POLICY "Users can update own skills" ON user_skills FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_skills' AND policyname = 'Users can delete own skills'
    ) THEN
        CREATE POLICY "Users can delete own skills" ON user_skills FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
