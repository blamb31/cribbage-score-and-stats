-- ==========================================
-- Supabase Database Schema for Cribbage App
-- Matches local storage structures in game.service.ts
-- ==========================================

-- 1. Players Profile Table (Matches PlayerProfile interface)
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,                                     -- Support existing random string IDs (7 chars)
    name TEXT NOT NULL,                                      -- Display name
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner user
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- maps to PlayerProfile.created
    CONSTRAINT players_user_id_name_key UNIQUE (user_id, name) -- Unique per user
);

-- Enable RLS (Row-Level Security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Secure RLS Policy for Players
CREATE POLICY "Users can manage their own players" ON players 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);


-- 2. Games History Table (Matches CompletedGame interface)
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,                                     -- Support existing generated string IDs
    mode INTEGER NOT NULL CHECK (mode IN (2, 3, 4)),         -- 2, 3, or 4 players
    player1_name TEXT NOT NULL,                              -- CompletedGame.player1Name
    player2_name TEXT NOT NULL,                              -- CompletedGame.player2Name
    player3_name TEXT,                                       -- CompletedGame.player3Name (optional)
    player4_name TEXT,                                       -- CompletedGame.player4Name (optional)
    player1_score INTEGER NOT NULL,                          -- CompletedGame.player1Score
    player2_score INTEGER NOT NULL,                          -- CompletedGame.player2Score
    player3_score INTEGER,                                   -- CompletedGame.player3Score (optional)
    player4_score INTEGER,                                   -- CompletedGame.player4Score (optional)
    winner INTEGER NOT NULL CHECK (winner IN (1, 2, 3, 4)),  -- 1 | 2 | 3 | 4
    played_at TIMESTAMP WITH TIME ZONE NOT NULL,             -- CompletedGame.date
    duration_ms INTEGER NOT NULL,                            -- CompletedGame.duration
    excluded BOOLEAN NOT NULL DEFAULT false,                 -- CompletedGame.excluded
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner user
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for Games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Secure RLS Policy for Games
CREATE POLICY "Users can manage their own games" ON games 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);


-- 3. Granular Score Logs Table (Matches ScoreLog interface)
CREATE TABLE IF NOT EXISTS score_logs (
    id TEXT PRIMARY KEY,                                     -- ScoreLog.id
    game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE, -- foreign key linking to games
    player_index INTEGER NOT NULL CHECK (player_index IN (1, 2, 3, 4)), -- ScoreLog.player
    delta INTEGER NOT NULL,                                  -- ScoreLog.delta
    new_score INTEGER NOT NULL,                              -- ScoreLog.newScore
    reason TEXT NOT NULL,                                    -- ScoreLog.reason
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL              -- ScoreLog.timestamp
);

-- Enable RLS for Score Logs
ALTER TABLE score_logs ENABLE ROW LEVEL SECURITY;

-- Secure RLS Policy for Score Logs
CREATE POLICY "Users can manage their own score logs" ON score_logs 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = score_logs.game_id AND games.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = score_logs.game_id AND games.user_id = auth.uid()
        )
    );


-- 4. Active Game State Table (For keeping sync of active sessions, matches GameState interface)
CREATE TABLE IF NOT EXISTS active_game_states (
    user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL,                                    -- Stores the entire GameState as JSON
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for Active Game States
ALTER TABLE active_game_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own active game state" ON active_game_states 
    FOR ALL USING (auth.uid() = user_id);
