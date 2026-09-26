/*
# TJ's 22nd Birthday Wall — Database Schema

## Overview
Creates the data model for a secret surprise birthday app where friends leave
messages, photos, and voice notes for TJ. TJ has a private wall view to see
all contributions, heart-react to them, and leave replies.

## New Tables

### `messages`
Stores each friend's birthday contribution.
- `id` (uuid, primary key)
- `pin` (text, unique, not null) — 4-digit code the contributor uses to access their message
- `sender_name` (text, not null) — "Who are you?" identity field
- `message` (text) — written birthday wish
- `photo_path` (text) — storage path for uploaded photo
- `voice_path` (text) — storage path for recorded voice message
- `hearted` (boolean, default false) — TJ's heart reaction toggle
- `reply` (text) — TJ's personal reply to this contributor
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `messages`.
- This is a no-auth app (PIN-based access, no Supabase sign-in screen).
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because the data is intentionally shared among all birthday wall participants.
- The 4-digit PIN provides soft access control at the application layer.

## Storage
- Creates a public storage bucket `birthday-media` for photo and voice uploads.
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin text UNIQUE NOT NULL,
  sender_name text NOT NULL,
  message text,
  photo_path text,
  voice_path text,
  hearted boolean NOT NULL DEFAULT false,
  reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-media', 'birthday-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow public read and authenticated/anon upload
DROP POLICY IF EXISTS "anon_read_bucket" ON storage.objects;
CREATE POLICY "anon_read_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'birthday-media');

DROP POLICY IF EXISTS "anon_write_bucket" ON storage.objects;
CREATE POLICY "anon_write_bucket" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'birthday-media');

DROP POLICY IF EXISTS "anon_update_bucket" ON storage.objects;
CREATE POLICY "anon_update_bucket" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'birthday-media') WITH CHECK (bucket_id = 'birthday-media');

DROP POLICY IF EXISTS "anon_delete_bucket" ON storage.objects;
CREATE POLICY "anon_delete_bucket" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'birthday-media');
