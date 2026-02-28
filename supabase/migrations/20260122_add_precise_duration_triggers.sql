-- 0. Ensure courses.estimated_hours is distinct and supports decimals
ALTER TABLE courses 
ALTER COLUMN estimated_hours TYPE FLOAT USING estimated_hours::FLOAT;

-- 1. Add duration_minutes to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

-- 2. Function to calculate lesson duration based on content word count
-- Rule: 200 words per minute (Average reading speed)
CREATE OR REPLACE FUNCTION calculate_lesson_duration()
RETURNS TRIGGER AS $$
DECLARE
    word_count INTEGER;
BEGIN
    IF NEW.content IS NULL THEN
        NEW.duration_minutes := 0;
    ELSE
        -- Split by whitespace to count words, handling empty strings
        word_count := array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
        IF word_count IS NULL THEN word_count := 0; END IF;
        
        -- Min 1 minute for any meaningful content (e.g. > 10 words)
        -- otherwise 0 for very short placeholder
        IF word_count < 10 THEN
             NEW.duration_minutes := 0;
        ELSE
             NEW.duration_minutes := GREATEST(1, CEIL(word_count::FLOAT / 200));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update duration on lesson content change
DROP TRIGGER IF EXISTS update_lesson_duration ON lessons;
CREATE TRIGGER update_lesson_duration
    BEFORE INSERT OR UPDATE OF content
    ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION calculate_lesson_duration();

-- 3. Function to update Course total estimated_hours
-- Sums up all lesson durations for the course (via modules)
CREATE OR REPLACE FUNCTION update_course_total_hours()
RETURNS TRIGGER AS $$
DECLARE
    relevant_course_id UUID;
    total_mins INTEGER;
BEGIN
    -- Find course_id via module table
    -- Since lessons are linked to modules, and modules to courses
    IF TG_OP = 'DELETE' THEN
        SELECT course_id INTO relevant_course_id FROM modules WHERE id = OLD.module_id;
    ELSE
        SELECT course_id INTO relevant_course_id FROM modules WHERE id = NEW.module_id;
    END IF;

    -- If no related course found (orphan lesson), exit
    IF relevant_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate total duration for this course
    -- Sum duration of all lessons in all modules of this course
    SELECT COALESCE(SUM(l.duration_minutes), 0)
    INTO total_mins
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = relevant_course_id;

    -- Update course
    UPDATE courses
    SET estimated_hours = (total_mins::FLOAT / 60.0)
    WHERE id = relevant_course_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update course hours when lessons change
DROP TRIGGER IF EXISTS update_course_hours_on_lesson_change ON lessons;
CREATE TRIGGER update_course_hours_on_lesson_change
    AFTER INSERT OR UPDATE OF duration_minutes OR DELETE
    ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_course_total_hours();

-- 4. Backfill: Force calculation for existing data
-- This is heavier, so we do it carefully. Updating ID to itself is a no-op but triggers triggers.
UPDATE lessons SET id = id WHERE content IS NOT NULL;
