-- Create pdfs table for storing uploaded PDFs
CREATE TABLE IF NOT EXISTS pdfs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    cloudinary_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- processing, ready, error
    total_chunks INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats table for storing chat history with PDFs
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- user, assistant
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Existing doubt_history table remains as is

-- Enable RLS for new tables
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdfs
CREATE POLICY "Users can view their own pdfs"
    ON pdfs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pdfs"
    ON pdfs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pdfs"
    ON pdfs FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats"
    ON chats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdfs_user_id ON pdfs(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_pdf_id ON chats(pdf_id);
