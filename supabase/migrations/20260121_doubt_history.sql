-- Create doubt_history table for AI Doubt Assistant feature
CREATE TABLE IF NOT EXISTS doubt_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  corrected_question TEXT,
  detected_subject TEXT NOT NULL,
  quick_answer TEXT NOT NULL,
  step_by_step_solution TEXT NOT NULL,
  final_answer TEXT NOT NULL,
  related_concepts TEXT[] NOT NULL,
  practice_question TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doubt_history_user_id ON doubt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_doubt_history_created_at ON doubt_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doubt_history_subject ON doubt_history(detected_subject);

-- Enable Row Level Security
ALTER TABLE doubt_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own doubt history"
  ON doubt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own doubts"
  ON doubt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doubts"
  ON doubt_history FOR DELETE
  USING (auth.uid() = user_id);
