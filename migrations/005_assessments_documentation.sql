-- Migration: 005_assessments_documentation.sql
-- Description: Create tables for assessments and documentation management
-- Date: 2025-01-05

-- Documentation table to store all documentation content
CREATE TABLE IF NOT EXISTS documentation (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    file_path VARCHAR(500),
    author VARCHAR(100) DEFAULT 'OWASP Team',
    version VARCHAR(20) DEFAULT '1.0',
    difficulty VARCHAR(20) DEFAULT 'Medium',
    estimated_read_time INTEGER DEFAULT 15, -- in minutes
    tags TEXT[], -- PostgreSQL array for tags
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id)
);

-- Assessment questions table
CREATE TABLE IF NOT EXISTS assessment_questions (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
    options JSONB, -- Store options as JSON for flexibility
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    points INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User assessment attempts table
CREATE TABLE IF NOT EXISTS user_assessment_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(10) NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_taken INTEGER DEFAULT 0, -- in seconds
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    answers JSONB, -- Store user answers as JSON
    UNIQUE(user_id, module_id, attempt_number)
);

-- User documentation progress table
CREATE TABLE IF NOT EXISTS user_documentation_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(10) NOT NULL,
    documentation_id INTEGER NOT NULL REFERENCES documentation(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent INTEGER DEFAULT 0, -- in seconds
    last_position INTEGER DEFAULT 0, -- bookmark position
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, documentation_id)
);

-- Assessment categories table for better organization
CREATE TABLE IF NOT EXISTS assessment_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'fas fa-question-circle',
    color VARCHAR(20) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documentation sections table for structured content
CREATE TABLE IF NOT EXISTS documentation_sections (
    id SERIAL PRIMARY KEY,
    documentation_id INTEGER NOT NULL REFERENCES documentation(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    section_order INTEGER DEFAULT 0,
    section_type VARCHAR(50) DEFAULT 'content', -- content, code_example, exercise, summary
    metadata JSONB, -- Additional section metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_questions_module_id ON assessment_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_active ON assessment_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_assessment_attempts_user_module ON user_assessment_attempts(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_user_assessment_attempts_completed ON user_assessment_attempts(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_documentation_progress_user_id ON user_documentation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documentation_progress_completed ON user_documentation_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_documentation_module_id ON documentation(module_id);
CREATE INDEX IF NOT EXISTS idx_documentation_published ON documentation(is_published);
CREATE INDEX IF NOT EXISTS idx_documentation_sections_doc_id ON documentation_sections(documentation_id);

-- Add comments for documentation
COMMENT ON TABLE documentation IS 'Stores all documentation content for OWASP modules';
COMMENT ON TABLE assessment_questions IS 'Stores assessment questions for each module';
COMMENT ON TABLE user_assessment_attempts IS 'Tracks user assessment attempts and scores';
COMMENT ON TABLE user_documentation_progress IS 'Tracks user progress through documentation';
COMMENT ON TABLE assessment_categories IS 'Categories for organizing assessments';
COMMENT ON TABLE documentation_sections IS 'Structured sections within documentation';

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE ON documentation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_questions_updated_at BEFORE UPDATE ON assessment_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
