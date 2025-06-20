-- Create auth schema and users table for local development
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    avatar TEXT
);

-- Enums (with DO block to handle existing types)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'format_enum') THEN
        CREATE TYPE format_enum AS ENUM ('png', 'gif', 'spritesheet');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
        CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collection_status_enum') THEN
        CREATE TYPE collection_status_enum AS ENUM ('draft', 'published', 'archived');
    END IF;
END$$;

-- Remove user_roles and user_data tables since we're using Supabase auth

-- Core Categorization Tables (Create these first)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS character_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS character_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    available_for_official BOOLEAN DEFAULT true,
    available_for_fan BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS source_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    release_year INTEGER,
    description TEXT,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_type_id UUID REFERENCES character_types(id),
    name TEXT NOT NULL,
    description TEXT,
    is_predefined BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ
);

-- Main Content Tables
CREATE TABLE IF NOT EXISTS sprite_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    category_id UUID REFERENCES categories(id),
    character_id UUID REFERENCES characters(id),
    character_style_id UUID REFERENCES character_styles(id),
    source_game_id UUID REFERENCES source_games(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    frame_count INTEGER,
    frame_rate INTEGER,
    license_type TEXT,
    format format_enum,
    is_custom BOOLEAN DEFAULT false,
    status approval_status_enum DEFAULT 'pending',
    total_views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    status collection_status_enum DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_id UUID REFERENCES collections(id),
    sprite_sheet_id UUID REFERENCES sprite_sheets(id),
    display_order INTEGER,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, sprite_sheet_id)
);

CREATE TABLE IF NOT EXISTS collaborators (
    sprite_sheet_id UUID REFERENCES sprite_sheets(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sprite_sheet_id, user_id)
);

CREATE TABLE IF NOT EXISTS tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    sprite_sheet_id UUID REFERENCES sprite_sheets(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    difficulty_level TEXT,
    estimated_duration INTEGER,
    prerequisites TEXT,
    view_count INTEGER DEFAULT 0,
    status approval_status_enum DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    sprite_sheet_id UUID NOT NULL REFERENCES sprite_sheets(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, sprite_sheet_id)
);

CREATE TABLE IF NOT EXISTS sprite_sheet_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprite_sheet_id UUID NOT NULL REFERENCES sprite_sheets(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sprite_sheet_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprite_sheet_id UUID NOT NULL REFERENCES sprite_sheets(id),
    user_id UUID REFERENCES auth.users(id),
    viewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprite_sheet_id UUID NOT NULL REFERENCES sprite_sheets(id),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    status approval_status_enum NOT NULL,
    feedback TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprite_sheet_id UUID NOT NULL REFERENCES sprite_sheets(id),
    previous_version_id UUID REFERENCES sprite_sheets(id),
    changes_made TEXT,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sprite_tags (
    sprite_sheet_id UUID REFERENCES sprite_sheets(id),
    tag_id UUID REFERENCES tags(id),
    PRIMARY KEY (sprite_sheet_id, tag_id)
);

CREATE TABLE IF NOT EXISTS tutorial_tags (
    tutorial_id UUID REFERENCES tutorials(id),
    tag_id UUID REFERENCES tags(id),
    PRIMARY KEY (tutorial_id, tag_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    action_count INTEGER DEFAULT 1,
    last_action TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reset_at TIMESTAMPTZ NOT NULL
);

-- Continue with other tables...

-- Add avatar column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar TEXT;
    END IF;
END $$; 