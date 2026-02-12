-- ============================================================
-- Notifications table for in-app sale alerts
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
-- ============================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', 
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Server (service role) can insert notifications for any user
-- The service role key bypasses RLS, so no INSERT policy needed for server.
-- But if anon key is used, we need a policy:
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 3. Add push_token to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles (push_token) WHERE push_token IS NOT NULL;

-- 4. Enable realtime on notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE 'Added notifications to supabase_realtime';
  ELSE
    RAISE NOTICE 'notifications already in supabase_realtime — skipped';
  END IF;
END $$;

-- 5. Also ensure orders + order_items are in realtime (needed for sales badge updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    RAISE NOTICE 'Added orders to supabase_realtime';
  ELSE
    RAISE NOTICE 'orders already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    RAISE NOTICE 'Added order_items to supabase_realtime';
  ELSE
    RAISE NOTICE 'order_items already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
    RAISE NOTICE 'Added products to supabase_realtime';
  ELSE
    RAISE NOTICE 'products already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'saved_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE saved_products;
    RAISE NOTICE 'Added saved_products to supabase_realtime';
  ELSE
    RAISE NOTICE 'saved_products already in supabase_realtime — skipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shorts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shorts;
    RAISE NOTICE 'Added shorts to supabase_realtime';
  ELSE
    RAISE NOTICE 'shorts already in supabase_realtime — skipped';
  END IF;
END $$;
