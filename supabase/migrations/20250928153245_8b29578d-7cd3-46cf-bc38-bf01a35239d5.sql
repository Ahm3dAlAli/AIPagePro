-- Remove duplicate profiles using ROW_NUMBER
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM profiles
)
DELETE FROM profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Drop the existing foreign key constraint to auth.users if it exists  
ALTER TABLE generated_pages DROP CONSTRAINT IF EXISTS generated_pages_user_id_fkey;

-- Add a new foreign key constraint to the profiles table
ALTER TABLE generated_pages 
ADD CONSTRAINT generated_pages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;