-- Drop the existing RLS policy for generated_pages
DROP POLICY IF EXISTS "Users can manage their own pages" ON generated_pages;

-- Create new policies with better demo support
CREATE POLICY "Users can view their own pages and demo pages"
ON generated_pages
FOR SELECT
USING (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can insert their own pages"
ON generated_pages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can update their own pages"
ON generated_pages
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

CREATE POLICY "Users can delete their own pages"
ON generated_pages
FOR DELETE
USING (
  auth.uid() = user_id 
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);