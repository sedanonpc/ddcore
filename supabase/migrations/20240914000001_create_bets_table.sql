-- Create bets table for storing betting data
-- This table stores all bet information including metadata as JSONB

CREATE TABLE IF NOT EXISTS bets (
  id BIGINT PRIMARY KEY,
  match_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'accepted', 'resolved')),
  created_date_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_updated_date_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  creator_username TEXT NOT NULL,
  acceptor_username TEXT,
  data JSONB NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_creator ON bets(creator_username);
CREATE INDEX IF NOT EXISTS idx_bets_acceptor ON bets(acceptor_username);
CREATE INDEX IF NOT EXISTS idx_bets_created_date ON bets(created_date_utc DESC);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_bets_status_created ON bets(status, created_date_utc DESC);

-- Add comments for documentation
COMMENT ON TABLE bets IS 'Stores all sports betting data with metadata';
COMMENT ON COLUMN bets.id IS 'Unique identifier for each bet';
COMMENT ON COLUMN bets.match_id IS 'Reference to the match being bet on';
COMMENT ON COLUMN bets.status IS 'Current status: open, accepted, or resolved';
COMMENT ON COLUMN bets.creator_username IS 'Username of the bet creator';
COMMENT ON COLUMN bets.acceptor_username IS 'Username of the bet acceptor (null for open bets)';
COMMENT ON COLUMN bets.data IS 'Complete bet metadata including match, league, and competitor info';
