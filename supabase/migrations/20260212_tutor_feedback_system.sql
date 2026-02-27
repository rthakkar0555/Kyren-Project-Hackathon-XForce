-- Create tutor_reviews table
CREATE TABLE IF NOT EXISTS tutor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tutor_id, student_id) -- One review per tutor-student pair
);

-- Enable RLS
ALTER TABLE tutor_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for tutor_reviews
CREATE POLICY "Public reviews are viewable by everyone"
    ON tutor_reviews FOR SELECT
    USING (true);

CREATE POLICY "Students can insert their own reviews"
    ON tutor_reviews FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own reviews"
    ON tutor_reviews FOR UPDATE
    USING (auth.uid() = student_id);

-- Add missing columns to tutor_profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutor_profiles' AND column_name = 'total_reviews') THEN
        ALTER TABLE tutor_profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- Function to update tutor rating and stats
CREATE OR REPLACE FUNCTION update_tutor_stats()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating NUMERIC(3, 2);
    review_count INTEGER;
    unique_student_count INTEGER;
BEGIN
    -- Calculate new average rating and total reviews
    SELECT 
        COALESCE(AVG(rating), 0), 
        COUNT(*) 
    INTO 
        avg_rating, 
        review_count
    FROM tutor_reviews
    WHERE tutor_id = NEW.tutor_id;

    -- Calculate unique students guided (based on reviews + accepted connections)
    -- For now, let's base it on reviews as "completed mentorship" implies a review/rating
    -- Or we can count successful connections. The prompt says "if students metorship is done", so a review is a good signal of completion.
    SELECT COUNT(DISTINCT student_id)
    INTO unique_student_count
    FROM tutor_reviews
    WHERE tutor_id = NEW.tutor_id;

    -- Update tutor_profiles
    UPDATE tutor_profiles
    SET 
        rating = avg_rating,
        total_reviews = review_count,
        students_guided_count = unique_student_count,
        updated_at = NOW()
    WHERE user_id = NEW.tutor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new reviews
DROP TRIGGER IF EXISTS on_review_added ON tutor_reviews;
CREATE TRIGGER on_review_added
    AFTER INSERT OR UPDATE OR DELETE ON tutor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_tutor_stats();
