-- Enhanced Quiz System: Database Schema Updates
-- This migration adds support for AI proctoring, detailed quiz attempts tracking, and auto-grading

-- 1. Create ENUM types for proctoring violations
DO $$ BEGIN
    CREATE TYPE violation_type AS ENUM (
        'multiple_faces',
        'no_face',
        'looking_away',
        'audio_detected',
        'tab_switch',
        'suspicious_behavior'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE violation_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL,
    course_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER DEFAULT 0,
    max_score INTEGER NOT NULL,
    proctoring_enabled BOOLEAN DEFAULT true,
    violations_count INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 100, -- 0-100, decreases with violations
    recording_url TEXT,
    performance_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create proctoring_violations table
CREATE TABLE IF NOT EXISTS public.proctoring_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    violation_type violation_type NOT NULL,
    severity violation_severity NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    evidence_url TEXT,
    auto_flagged BOOLEAN DEFAULT true,
    reviewed BOOLEAN DEFAULT false,
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create question_responses table
CREATE TABLE IF NOT EXISTS public.question_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    user_answer TEXT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    max_points INTEGER NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    ai_grading_feedback TEXT,
    is_correct BOOLEAN DEFAULT false,
    confidence_score INTEGER, -- For MCQ confidence (0-100)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Update quiz_questions table to support enhanced grading
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS rubric JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS quiz_attempts_user_id_idx ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_lesson_id_idx ON public.quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_course_id_idx ON public.quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS proctoring_violations_attempt_id_idx ON public.proctoring_violations(quiz_attempt_id);
CREATE INDEX IF NOT EXISTS proctoring_violations_user_id_idx ON public.proctoring_violations(user_id);
CREATE INDEX IF NOT EXISTS question_responses_attempt_id_idx ON public.question_responses(quiz_attempt_id);

-- 7. Enable Row Level Security
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for quiz_attempts
CREATE POLICY "Users can view their own quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz attempts"
    ON public.quiz_attempts FOR UPDATE
    USING (auth.uid() = user_id);

-- 9. Create RLS policies for proctoring_violations
CREATE POLICY "Users can view their own violations"
    ON public.proctoring_violations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own violations"
    ON public.proctoring_violations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 10. Create RLS policies for question_responses
CREATE POLICY "Users can view their own responses"
    ON public.question_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts
            WHERE quiz_attempts.id = question_responses.quiz_attempt_id
            AND quiz_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own responses"
    ON public.question_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quiz_attempts
            WHERE quiz_attempts.id = question_responses.quiz_attempt_id
            AND quiz_attempts.user_id = auth.uid()
        )
    );

-- 11. Create function to update trust score based on violations
CREATE OR REPLACE FUNCTION update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.quiz_attempts
    SET 
        violations_count = violations_count + 1,
        trust_score = GREATEST(0, trust_score - 
            CASE NEW.severity
                WHEN 'low' THEN 5
                WHEN 'medium' THEN 15
                WHEN 'high' THEN 30
                WHEN 'critical' THEN 50
            END
        )
    WHERE id = NEW.quiz_attempt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for trust score updates
DROP TRIGGER IF EXISTS update_trust_score_trigger ON public.proctoring_violations;
CREATE TRIGGER update_trust_score_trigger
    AFTER INSERT ON public.proctoring_violations
    FOR EACH ROW
    EXECUTE FUNCTION update_trust_score();

-- 13. Create function to calculate final score
CREATE OR REPLACE FUNCTION calculate_quiz_score(attempt_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER;
    max_total_points INTEGER;
    percentage INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(points_earned), 0),
        COALESCE(SUM(max_points), 1)
    INTO total_points, max_total_points
    FROM public.question_responses
    WHERE quiz_attempt_id = attempt_id;
    
    percentage := ROUND((total_points::DECIMAL / max_total_points) * 100);
    
    UPDATE public.quiz_attempts
    SET score = percentage
    WHERE id = attempt_id;
    
    RETURN percentage;
END;
$$ LANGUAGE plpgsql;
