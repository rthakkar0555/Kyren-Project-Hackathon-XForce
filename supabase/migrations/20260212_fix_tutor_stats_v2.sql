-- Ensure columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutor_profiles' AND column_name = 'students_guided_count') THEN
        ALTER TABLE tutor_profiles ADD COLUMN students_guided_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutor_profiles' AND column_name = 'total_reviews') THEN
        ALTER TABLE tutor_profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- 1. Create a helper function to update a specific tutor's stats
CREATE OR REPLACE FUNCTION recalc_tutor_stats(target_tutor_id UUID)
RETURNS VOID AS $$
DECLARE
    _avg_rating NUMERIC(3, 2);
    _review_count INTEGER;
    _student_count INTEGER;
BEGIN
    -- Calculate Ratings from Reviews
    SELECT 
        COALESCE(AVG(rating), 0), 
        COUNT(*)
    INTO 
        _avg_rating, 
        _review_count
    FROM tutor_reviews
    WHERE tutor_id = target_tutor_id;

    -- Calculate Students Guided from Connections (Active or Ended)
    SELECT COUNT(DISTINCT student_id)
    INTO _student_count
    FROM peer_connections
    WHERE tutor_id = target_tutor_id
    AND status IN ('active', 'ended');

    -- Update the Profile
    UPDATE tutor_profiles
    SET 
        rating = _avg_rating,
        total_reviews = _review_count,
        students_guided_count = _student_count,
        updated_at = NOW()
    WHERE user_id = target_tutor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger Function that calls the helper
CREATE OR REPLACE FUNCTION trigger_update_tutor_stats()
RETURNS TRIGGER AS $$
DECLARE
    _tutor_id UUID;
BEGIN
    -- Determine the relevant tutor_id
    IF TG_TABLE_NAME = 'tutor_reviews' THEN
        IF TG_OP = 'DELETE' THEN
            _tutor_id := OLD.tutor_id;
        ELSE
            _tutor_id := NEW.tutor_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'peer_connections' THEN
        IF TG_OP = 'DELETE' THEN
            _tutor_id := OLD.tutor_id;
        ELSE
            _tutor_id := NEW.tutor_id;
        END IF;
    END IF;

    -- Update stats for this tutor
    PERFORM recalc_tutor_stats(_tutor_id);

    RETURN NULL; -- Trigger is AFTER, so return value ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Triggers

-- Clean up possibly conflicting old triggers or functions
DROP TRIGGER IF EXISTS on_connection_update ON peer_connections;
DROP FUNCTION IF EXISTS update_tutor_stats CASCADE;

-- On Reviews (Insert, Update, Delete)
DROP TRIGGER IF EXISTS on_review_change ON tutor_reviews;
CREATE TRIGGER on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON tutor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_tutor_stats();

-- On Connections (Insert, Update, Delete)
-- We want to count 'active' or 'ended' connections as "students guided"
DROP TRIGGER IF EXISTS on_connection_change ON peer_connections;
CREATE TRIGGER on_connection_change
    AFTER INSERT OR UPDATE OR DELETE ON peer_connections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_tutor_stats();

-- 4. Backfill existing data
DO $$
DECLARE
    tutor_rec RECORD;
BEGIN
    FOR tutor_rec IN SELECT user_id FROM tutor_profiles LOOP
        PERFORM recalc_tutor_stats(tutor_rec.user_id);
    END LOOP;
END $$;
