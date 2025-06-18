-- Create Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Memes table
CREATE TABLE memes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    image_url TEXT NOT NULL,
    meta JSONB DEFAULT '[]',
    caption TEXT,
    vibe_description TEXT,
    upvote_count INTEGER DEFAULT 0,
    downvote_count INTEGER DEFAULT 0,
    total_bid_amount DECIMAL(10,2) DEFAULT 0,
    username VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (username) REFERENCES users(username)
);

-- Create Bids table
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    meme_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (meme_id) REFERENCES memes(id),
    FOREIGN KEY (username) REFERENCES users(username)
);

-- Create Votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    meme_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    voted INTEGER NOT NULL CHECK (voted IN (0, 1)), -- 0 for down, 1 for up
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (meme_id) REFERENCES memes(id),
    FOREIGN KEY (username) REFERENCES users(username),
    UNIQUE(meme_id, username, is_active)
);

-- Create Bid Summaries table
CREATE TABLE bid_summaries (
    meme_id INTEGER PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL,
    username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (meme_id) REFERENCES memes(id),
    FOREIGN KEY (username) REFERENCES users(username)
);

-- Create indexes for better performance
CREATE INDEX idx_memes_username ON memes(username);
CREATE INDEX idx_memes_is_active ON memes(is_active);
CREATE INDEX idx_memes_created_at ON memes(created_at);
CREATE INDEX idx_memes_upvote_count ON memes(upvote_count);
CREATE INDEX idx_bids_meme_id ON bids(meme_id);
CREATE INDEX idx_votes_meme_id ON votes(meme_id);
CREATE INDEX idx_votes_username ON votes(username);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memes_updated_at BEFORE UPDATE ON memes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bid_summaries_updated_at BEFORE UPDATE ON bid_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/