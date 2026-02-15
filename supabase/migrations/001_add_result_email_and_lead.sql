-- Migration: Add email_content, is_lead, and min_score to quiz_results
-- Run this in Supabase SQL Editor if you already have the tables

ALTER TABLE quiz_results
ADD COLUMN IF NOT EXISTS email_content TEXT,
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_score DECIMAL(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN quiz_results.email_content IS 'Rich HTML content to be sent in the result email';
COMMENT ON COLUMN quiz_results.is_lead IS 'Flag indicating if this result should mark the user as a lead';
COMMENT ON COLUMN quiz_results.min_score IS 'Minimum score threshold to qualify for this result';
