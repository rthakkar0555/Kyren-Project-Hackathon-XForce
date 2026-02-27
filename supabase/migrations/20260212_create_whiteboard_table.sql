-- Create table to store whiteboard state per connection
CREATE TABLE IF NOT EXISTS whiteboard_states (
    connection_id UUID PRIMARY KEY REFERENCES peer_connections(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_editor UUID REFERENCES auth.users(id)
);

-- Realtime needs to be enabled for this table to support rapid syncing if we use Postgres Changes (though Broadcast is usually better for direct interaction)
ALTER TABLE whiteboard_states ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view whiteboard of their connection" ON whiteboard_states
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM peer_connections pc
        WHERE pc.id = whiteboard_states.connection_id
        AND (pc.student_id = auth.uid() OR pc.tutor_id = auth.uid())
    )
);

CREATE POLICY "Users can update whiteboard of their connection" ON whiteboard_states
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM peer_connections pc
        WHERE pc.id = whiteboard_states.connection_id
        AND (pc.student_id = auth.uid() OR pc.tutor_id = auth.uid())
    )
);

CREATE POLICY "Users can insert whiteboard of their connection" ON whiteboard_states
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM peer_connections pc
        WHERE pc.id = whiteboard_states.connection_id
        AND (pc.student_id = auth.uid() OR pc.tutor_id = auth.uid())
    )
);

-- Enable Realtime for whiteboard_states
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'whiteboard_states'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_states;
    END IF;
END $$;
