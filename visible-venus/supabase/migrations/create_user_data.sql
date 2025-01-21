-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a function to get the current authenticated user ID
CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS UUID AS $$
BEGIN
    -- This will need to be set in your connection context
    RETURN current_setting('app.current_user_id')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a table for user data
CREATE TABLE user_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for better query performance
CREATE INDEX idx_user_data_user_id ON user_data(user_id);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Basic security policies
CREATE POLICY user_data_isolation_policy ON user_data
    USING (user_id = get_auth_user_id());

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY; 