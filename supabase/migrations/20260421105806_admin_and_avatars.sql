-- Ensure admin role for the owner
INSERT INTO public.user_roles (user_id, role)
VALUES ('783ff4e9-a484-4a71-ad02-d876bd35f75d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policies for avatars bucket
DO $$ BEGIN
  -- Public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatars public read' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatars public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  -- Authenticated upload to own folder
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatars users can upload own' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatars users can upload own" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  -- Update own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatars users can update own' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatars users can update own" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;

  -- Delete own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatars users can delete own' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Avatars users can delete own" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
