import asyncio
import os

import asyncpg
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment.")

# asyncpg expects 'postgresql://' instead of 'postgresql+asyncpg://'
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

migration_sql = """
-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table if we are migrating dimensions
DROP TABLE IF EXISTS resume_chunks CASCADE;

-- Create the resume_chunks table
CREATE TABLE IF NOT EXISTS resume_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_id TEXT,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE resume_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view own resume chunks" ON resume_chunks;
DROP POLICY IF EXISTS "Users can insert own resume chunks" ON resume_chunks;
DROP POLICY IF EXISTS "Users can delete own resume chunks" ON resume_chunks;

-- Create RLS policies
CREATE POLICY "Users can view own resume chunks"
    ON resume_chunks FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own resume chunks"
    ON resume_chunks FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete own resume chunks"
    ON resume_chunks FOR DELETE
    USING (auth.uid() = profile_id);

-- Create IVFFlat index for faster vector similarity search
-- Adjust lists based on expected data size (lists = roughly rows / 1000 for up to 1M rows)
CREATE INDEX IF NOT EXISTS resume_chunks_embedding_idx ON resume_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a function to search for resume chunks
DROP FUNCTION IF EXISTS match_resume_chunks(VECTOR, UUID, INT);
DROP FUNCTION IF EXISTS match_resume_chunks;

CREATE OR REPLACE FUNCTION match_resume_chunks(
    query_embedding VECTOR(384),
    match_profile_id UUID,
    match_count INT DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    source_id UUID,
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        resume_chunks.id,
        resume_chunks.source,
        resume_chunks.source_id,
        resume_chunks.chunk_text,
        1 - (resume_chunks.embedding <=> query_embedding) AS similarity
    FROM resume_chunks
    WHERE resume_chunks.profile_id = match_profile_id
    ORDER BY resume_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
"""


async def run_migration():
    print(f"Connecting to {DATABASE_URL.split('@')[-1]}...")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        print("Executing migration SQL...")
        await conn.execute(migration_sql)
        print("Migration applied successfully!")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
