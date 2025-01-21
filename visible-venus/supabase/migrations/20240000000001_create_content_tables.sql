-- Main Content Tables
CREATE TABLE sprite_sheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
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
    format format_enum NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    status approval_status_enum DEFAULT 'pending',
    total_views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    status collection_status_enum DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT unique_collection_name_per_user UNIQUE(user_id, name)
);

-- Create triggers for updated_at
CREATE TRIGGER update_sprite_sheets_updated_at
    BEFORE UPDATE ON sprite_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE sprite_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Modify RLS policies to use verify_user_token
CREATE POLICY "Users can view their own sprite sheets" ON sprite_sheets
    FOR SELECT USING (
        user_id = verify_user_token() 
        OR status = 'approved'
    );

CREATE POLICY "Users can view their own collections" ON collections
    FOR SELECT USING (
        user_id = verify_user_token() 
        OR is_public = true
    ); 