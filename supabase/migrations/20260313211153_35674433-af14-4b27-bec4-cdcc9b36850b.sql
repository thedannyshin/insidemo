
-- Create a public bucket for cached street view images
INSERT INTO storage.buckets (id, name, public)
VALUES ('streetview-cache', 'streetview-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to cached images
CREATE POLICY "Public read access for streetview cache"
ON storage.objects FOR SELECT
USING (bucket_id = 'streetview-cache');

-- Allow service role to insert/update cached images (edge function uses service role)
CREATE POLICY "Service role insert for streetview cache"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'streetview-cache');

CREATE POLICY "Service role update for streetview cache"
ON storage.objects FOR UPDATE
USING (bucket_id = 'streetview-cache');
