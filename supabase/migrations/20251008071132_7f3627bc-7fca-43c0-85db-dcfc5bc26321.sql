-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own component exports" ON component_exports;

-- Create separate policies for better control
CREATE POLICY "Users can view their own and demo component exports"
ON component_exports
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR 
  (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE POLICY "Users can insert their own and demo component exports"
ON component_exports
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  OR 
  (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE POLICY "Users can update their own and demo component exports"
ON component_exports
FOR UPDATE
USING (
  (auth.uid() = user_id) 
  OR 
  (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE POLICY "Users can delete their own and demo component exports"
ON component_exports
FOR DELETE
USING (
  (auth.uid() = user_id) 
  OR 
  (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
);