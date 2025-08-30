-- Fix security warnings by updating existing functions with proper search_path

-- Update existing functions to have proper search_path without dropping them
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';

-- Create the new function with proper search_path
CREATE OR REPLACE FUNCTION public.update_page_sections_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create the trigger for page sections
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_page_sections_updated_at();