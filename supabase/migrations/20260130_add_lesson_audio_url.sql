-- Add summary_audio_url to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS summary_audio_url TEXT;

-- Create storage bucket if not exists (handled via SQL or Dashboard, usually SQL for reproducible setup)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read of lesson audio
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'lesson-audio' );

-- Policy to allow authenticated users to upload (or service role)
-- For now, we use service role in API, so explicit policy might not be strictly needed for upload if RLS disabled or using service key.
-- But generally good practice:
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'lesson-audio' );
