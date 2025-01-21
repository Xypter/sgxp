-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE collection_status_enum AS ENUM ('draft', 'published', 'archived');
CREATE TYPE format_enum AS ENUM ('png', 'gif', 'sprite_sheet', 'animated_sprite');

-- Create a function to validate Supabase JWT tokens
CREATE OR REPLACE FUNCTION verify_user_token() RETURNS uuid AS $$
DECLARE
    _user_id uuid;
BEGIN
    -- This will be set by your application middleware
    _user_id := current_setting('request.jwt.claim.sub', true)::uuid;
    RETURN _user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core Categorization Tables
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_category_name UNIQUE(name)
);

CREATE TABLE character_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_character_type_name UNIQUE(name)
);

CREATE TABLE character_styles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    available_for_official BOOLEAN DEFAULT true,
    available_for_fan BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_character_style_name UNIQUE(name)
);

CREATE TABLE source_games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    release_year INTEGER,
    description TEXT,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_game_name UNIQUE(name)
);

CREATE TABLE characters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    character_type_id UUID REFERENCES character_types(id),
    name TEXT NOT NULL,
    description TEXT,
    is_predefined BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_character_name_per_type UNIQUE(name, character_type_id)
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add basic RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Allow read access for all authenticated users" ON categories
    FOR SELECT USING (verify_user_token() IS NOT NULL);

CREATE POLICY "Allow read access for all authenticated users" ON character_types
    FOR SELECT USING (verify_user_token() IS NOT NULL);

CREATE POLICY "Allow read access for all authenticated users" ON character_styles
    FOR SELECT USING (verify_user_token() IS NOT NULL);

CREATE POLICY "Allow read access for all authenticated users" ON source_games
    FOR SELECT USING (verify_user_token() IS NOT NULL);

CREATE POLICY "Allow read access for all authenticated users" ON characters
    FOR SELECT USING (verify_user_token() IS NOT NULL); 