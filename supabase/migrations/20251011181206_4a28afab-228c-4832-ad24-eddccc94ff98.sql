-- Add foreign key relationship between deployment_records and generated_pages
ALTER TABLE deployment_records
ADD CONSTRAINT fk_deployment_page
FOREIGN KEY (page_id) REFERENCES generated_pages(id)
ON DELETE CASCADE;