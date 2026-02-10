-- Shorts Comments & Product Attachment Migration
-- Run this in your Supabase SQL Editor AFTER the original shorts migration

-- ============================================================
-- 1. Add optional product_id to shorts table
-- ============================================================
ALTER TABLE public.shorts
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Add comment_count denormalized counter
ALTER TABLE public.shorts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_shorts_product_id ON public.shorts(product_id);

-- ============================================================
-- 2. Short comments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.short_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_comments_short_id ON public.short_comments(short_id);
CREATE INDEX IF NOT EXISTS idx_short_comments_user_id ON public.short_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_short_comments_created_at ON public.short_comments(created_at DESC);

-- ============================================================
-- 3. RLS for short_comments
-- ============================================================
ALTER TABLE public.short_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short comments are viewable by everyone"
  ON public.short_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON public.short_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.short_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. RPC functions for comment count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_short_comments(short_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts SET comment_count = comment_count + 1 WHERE id = short_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_short_comments(short_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = short_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Enable realtime for short_comments
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.short_comments;

-- ============================================================
-- 6. Enable full replica identity for shorts realtime
-- ============================================================
-- Required so Supabase Realtime broadcasts the full row on UPDATE
-- (like_count, view_count, comment_count) to ALL subscribers,
-- not just the row owner.
ALTER TABLE public.shorts REPLICA IDENTITY FULL;
