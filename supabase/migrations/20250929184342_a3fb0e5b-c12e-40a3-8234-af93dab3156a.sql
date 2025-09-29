-- Remove the foreign key constraint from profiles to auth.users
-- This allows us to create temporary profiles for unauthenticated users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Add a comment to explain why we removed it
COMMENT ON TABLE public.profiles IS 'User profiles table. Does not have FK to auth.users to allow temporary users for demo purposes.';