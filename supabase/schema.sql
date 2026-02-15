-- WMB Coaching Quiz Application Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Quiz definitions
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{
    "primaryColor": "#3b82f6",
    "backgroundColor": "#ffffff",
    "buttonStyle": "rounded",
    "logoUrl": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Possible outcomes/results for a quiz
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  email_content TEXT,  -- Rich HTML content for email body
  is_lead BOOLEAN DEFAULT FALSE,  -- Flag to mark this result as a lead
  min_score DECIMAL(10,2) DEFAULT 0,  -- Minimum score threshold to get this result
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions within a quiz
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer options for each question
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Links answers to results with weighting
CREATE TABLE answer_result_weights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(answer_id, result_id)
);

-- Users (populated after Stytch/Google auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stytch_user_id TEXT UNIQUE,
  google_id TEXT,
  email TEXT,
  name TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks each quiz attempt (funnel tracking)
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_token TEXT,
  status TEXT CHECK (status IN ('viewed', 'started', 'completed')) DEFAULT 'viewed',
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_lead BOOLEAN DEFAULT FALSE,
  lead_score DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual question responses
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- Final calculated results for a session
CREATE TABLE session_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  score DECIMAL(10,2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answer_result_weights_answer_id ON answer_result_weights(answer_id);
CREATE INDEX idx_answer_result_weights_result_id ON answer_result_weights(result_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_status ON quiz_sessions(status);
CREATE INDEX idx_quiz_responses_session_id ON quiz_responses(session_id);
CREATE INDEX idx_session_results_session_id ON session_results(session_id);
CREATE INDEX idx_quizzes_slug ON quizzes(slug);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to quizzes table
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
-- For this single-admin app, we use service role for admin operations
-- and anon key for public quiz access

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_result_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_results ENABLE ROW LEVEL SECURITY;

-- Public read access for published quizzes
CREATE POLICY "Public can view published quizzes" ON quizzes
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public can view quiz results for published quizzes" ON quiz_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes WHERE quizzes.id = quiz_results.quiz_id AND quizzes.is_published = TRUE
    )
  );

CREATE POLICY "Public can view questions for published quizzes" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.is_published = TRUE
    )
  );

CREATE POLICY "Public can view answers for published quizzes" ON answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN quizzes ON quizzes.id = questions.quiz_id
      WHERE questions.id = answers.question_id AND quizzes.is_published = TRUE
    )
  );

CREATE POLICY "Public can view weights for published quizzes" ON answer_result_weights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM answers
      JOIN questions ON questions.id = answers.question_id
      JOIN quizzes ON quizzes.id = questions.quiz_id
      WHERE answers.id = answer_result_weights.answer_id AND quizzes.is_published = TRUE
    )
  );

-- Public can create and update their own sessions
CREATE POLICY "Public can create sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can view own sessions" ON quiz_sessions
  FOR SELECT USING (TRUE);

CREATE POLICY "Public can update own sessions" ON quiz_sessions
  FOR UPDATE USING (TRUE);

-- Public can create responses
CREATE POLICY "Public can create responses" ON quiz_responses
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can view own responses" ON quiz_responses
  FOR SELECT USING (TRUE);

-- Public can create session results
CREATE POLICY "Public can create session results" ON session_results
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can view own session results" ON session_results
  FOR SELECT USING (TRUE);

-- Users table - service role manages this
CREATE POLICY "Service role manages users" ON users
  FOR ALL USING (TRUE);

-- Service role has full access (for admin operations)
-- This is handled by using the service_role key in admin API routes
