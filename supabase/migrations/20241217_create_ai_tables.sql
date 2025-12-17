-- Migration: Create AI Tables
-- Date: 2024-12-17
-- Description: Creates api_keys and generations tables for AI features

-- =============================================
-- Table: api_keys
-- Stores user API keys for various AI providers
-- =============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Chat providers
    gemini_key TEXT,
    openai_key TEXT,
    openrouter_key TEXT,

    -- Image providers
    freepik_key TEXT,

    -- Video providers
    falai_key TEXT,

    -- Voice providers
    elevenlabs_key TEXT,

    -- Payment/other integrations
    asaas_key TEXT,
    zapi_instance_id TEXT,
    zapi_token TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per user
    CONSTRAINT unique_user_api_keys UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own API keys
CREATE POLICY "Users can view own api_keys" ON public.api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own API keys
CREATE POLICY "Users can insert own api_keys" ON public.api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys
CREATE POLICY "Users can update own api_keys" ON public.api_keys
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api_keys" ON public.api_keys
    FOR DELETE
    USING (auth.uid() = user_id);


-- =============================================
-- Table: generations
-- Logs all AI generations for analytics and billing
-- =============================================
CREATE TABLE IF NOT EXISTS public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Generation type
    type TEXT NOT NULL CHECK (type IN ('chat', 'image', 'video', 'voice', 'other')),

    -- Provider and model used
    provider TEXT NOT NULL,
    model TEXT NOT NULL,

    -- Input/Output (stored as JSONB for flexibility)
    input JSONB,
    output TEXT,

    -- Usage metrics
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10, 6) DEFAULT 0,
    duration_ms INTEGER,

    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_provider ON public.generations(provider);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at);
CREATE INDEX IF NOT EXISTS idx_generations_user_type ON public.generations(user_id, type);

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own generations
CREATE POLICY "Users can view own generations" ON public.generations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own generations (via edge functions)
CREATE POLICY "Users can insert own generations" ON public.generations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to generations" ON public.generations
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');


-- =============================================
-- Storage Bucket: generations
-- For storing generated media files
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('generations', 'generations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view generated files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'generations');

CREATE POLICY "Authenticated users can upload generated files" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'generations'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own generated files" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'generations'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );


-- =============================================
-- Function: Update timestamp trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to api_keys
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================
-- View: User usage statistics
-- =============================================
CREATE OR REPLACE VIEW public.user_generation_stats AS
SELECT
    user_id,
    type,
    provider,
    COUNT(*) as total_generations,
    SUM(tokens_used) as total_tokens,
    SUM(cost_estimate) as total_cost,
    DATE_TRUNC('month', created_at) as month
FROM public.generations
WHERE status = 'completed'
GROUP BY user_id, type, provider, DATE_TRUNC('month', created_at);


-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT, INSERT ON public.generations TO authenticated;
GRANT SELECT ON public.user_generation_stats TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.generations TO service_role;
