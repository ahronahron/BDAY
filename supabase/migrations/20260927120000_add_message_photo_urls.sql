ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT ARRAY[]::text[];