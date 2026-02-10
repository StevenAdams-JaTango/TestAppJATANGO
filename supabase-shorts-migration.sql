-- Shorts Migration for JaTango
-- Run this in your Supabase SQL Editor

-- Shorts table
CREATE TABLE IF NOT EXISTS public.shorts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT DEFAULT '',
  duration REAL DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Short likes junction table
CREATE TABLE IF NOT EXISTS public.short_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(short_id, user_id)
);

-- Tracks last-watched short per user for resume in feed
CREATE TABLE IF NOT EXISTS public.short_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  last_short_id UUID REFERENCES public.shorts(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shorts_seller_id ON public.shorts(seller_id);
CREATE INDEX IF NOT EXISTS idx_shorts_created_at ON public.shorts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_likes_short_id ON public.short_likes(short_id);
CREATE INDEX IF NOT EXISTS idx_short_likes_user_id ON public.short_likes(user_id);

-- Enable RLS
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_progress ENABLE ROW LEVEL SECURITY;

-- Shorts policies
CREATE POLICY "Shorts are viewable by everyone"
  ON public.shorts FOR SELECT
  USING (true);

CREATE POLICY "Sellers can insert own shorts"
  ON public.shorts FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own shorts"
  ON public.shorts FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own shorts"
  ON public.shorts FOR DELETE
  USING (auth.uid() = seller_id);

-- Short likes policies
CREATE POLICY "Short likes are viewable by everyone"
  ON public.short_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like shorts"
  ON public.short_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike shorts"
  ON public.short_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Short progress policies
CREATE POLICY "Users can view own progress"
  ON public.short_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.short_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.short_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_shorts_updated_at
  BEFORE UPDATE ON public.shorts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_short_progress_updated_at
  BEFORE UPDATE ON public.short_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC functions for atomic counter updates
CREATE OR REPLACE FUNCTION increment_short_likes(short_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts SET like_count = like_count + 1 WHERE id = short_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_short_likes(short_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts SET like_count = GREATEST(like_count - 1, 0) WHERE id = short_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_short_views(short_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shorts SET view_count = view_count + 1 WHERE id = short_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket policies for short-videos
-- (Run after creating the 'short-videos' bucket as public in Supabase Dashboard)
CREATE POLICY "Anyone can view short videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'short-videos');

CREATE POLICY "Authenticated users can upload short videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'short-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own short videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'short-videos' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete own short videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'short-videos' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Storage bucket policies for short-thumbnails
-- (Run after creating the 'short-thumbnails' bucket as public in Supabase Dashboard)
CREATE POLICY "Anyone can view short thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'short-thumbnails');

CREATE POLICY "Authenticated users can upload short thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'short-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own short thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'short-thumbnails' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete own short thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'short-thumbnails' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Enable realtime for shorts
ALTER PUBLICATION supabase_realtime ADD TABLE public.shorts;
