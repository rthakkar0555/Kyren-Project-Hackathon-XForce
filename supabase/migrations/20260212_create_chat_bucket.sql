-- Create a storage bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket

-- 1. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- 2. Allow public access to view files (since it's a public bucket, strictly speaking this is redundant for 'public' buckets but good for explicit control if we turn 'public' off later, though for now we rely on the bucket being public)
-- Actually, for public buckets, we don't need a SELECT policy for anon if the bucket is public.
-- But let's add one for authenticated users just in case.
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- 3. Allow users to update/delete their own files (optional, but good for cleanup)
CREATE POLICY "Users can update their own chat attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid() = owner);
