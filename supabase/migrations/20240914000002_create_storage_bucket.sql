-- Create storage bucket for NFT metadata
INSERT INTO storage.buckets (id, name, public)
VALUES ('metadata', 'metadata', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies to allow anonymous access to the metadata bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'metadata');

CREATE POLICY "Allow anonymous uploads to metadata bucket" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'metadata');

CREATE POLICY "Allow anonymous updates to metadata bucket" ON storage.objects
FOR UPDATE TO anon, authenticated
USING (bucket_id = 'metadata');

CREATE POLICY "Allow anonymous deletes from metadata bucket" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'metadata');