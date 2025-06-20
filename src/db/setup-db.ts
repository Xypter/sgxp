import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client for auth
const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.PUBLIC_SUPABASE_ANON_KEY!
);

async function setupDatabase() {
  if (!process.env.POSTGRES_HOST) {
    throw new Error('POSTGRES_HOST environment variable is not set');
  }
  
  const sql = postgres(process.env.POSTGRES_HOST);
  
  try {
    // Drop all tables first
    await sql.unsafe(`
      DROP TABLE IF EXISTS 
        rate_limits, audit_logs,
        tutorial_tags, sprite_tags, tags,
        submission_history, submission_reviews,
        sprite_sheet_views, sprite_sheet_comments,
        user_favorites, tutorials, collaborators,
        collection_items, collections,
        sprite_sheets, characters,
        character_types, character_styles,
        categories, source_games CASCADE;
      
      DROP TYPE IF EXISTS format_enum CASCADE;
      DROP TYPE IF EXISTS approval_status_enum CASCADE;
      DROP TYPE IF EXISTS collection_status_enum CASCADE;
    `);

    // Create ENUMs first
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE format_enum AS ENUM ('png', 'gif', 'spritesheet');
        CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
        CREATE TYPE collection_status_enum AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create core tables first
    await sql.unsafe(`
      -- Core Categorization Tables
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
    `);

    // Create main content tables
    await sql.unsafe(`
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
    `);

    // Create collections and related tables
    await sql.unsafe(`
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
    `);

    console.log('Database schema created successfully');
  } catch (error: any) {
    console.error('Error setting up database:', error);
    console.error('Error details:', error.message);
  } finally {
    await sql.end();
  }
}

setupDatabase(); 