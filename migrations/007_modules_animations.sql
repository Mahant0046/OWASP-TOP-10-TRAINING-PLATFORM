-- Migration: 007_modules_animations.sql
-- Description: Create tables for learning modules and animations management
-- Date: 2025-01-05

-- Learning modules table to store all module information
CREATE TABLE IF NOT EXISTS learning_modules (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'OWASP Top 10',
    difficulty VARCHAR(20) DEFAULT 'Medium',
    points INTEGER DEFAULT 100,
    xp_reward INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'available', -- available, locked, coming-soon, maintenance
    lab_available BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    icon VARCHAR(100) DEFAULT 'fas fa-shield-alt',
    color VARCHAR(20) DEFAULT '#3B82F6',
    estimated_time INTEGER DEFAULT 30, -- in minutes
    prerequisites TEXT[], -- Array of prerequisite module IDs
    learning_objectives TEXT[],
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Animations table to store animation content and metadata
CREATE TABLE IF NOT EXISTS animations (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    animation_type VARCHAR(50) DEFAULT 'interactive', -- interactive, video, slideshow, simulation
    file_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    duration INTEGER DEFAULT 0, -- in seconds
    difficulty VARCHAR(20) DEFAULT 'Medium',
    interactive_elements JSONB, -- Store interactive elements configuration
    script_content TEXT, -- Animation script or narration
    learning_points TEXT[],
    controls_config JSONB, -- Animation controls configuration
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE
);

-- Module sections table for structured module content
CREATE TABLE IF NOT EXISTS module_sections (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) NOT NULL,
    section_type VARCHAR(50) NOT NULL, -- overview, documentation, animation, lab, quiz, summary
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_time INTEGER DEFAULT 10, -- in minutes
    points INTEGER DEFAULT 10,
    unlock_criteria JSONB, -- Criteria to unlock this section
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE
);

-- User module progress table (enhanced)
CREATE TABLE IF NOT EXISTS user_module_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(10) NOT NULL,
    section_id INTEGER REFERENCES module_sections(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent INTEGER DEFAULT 0, -- in seconds
    attempts INTEGER DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, module_id, section_id),
    FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE
);

-- Animation interactions table to track user interactions
CREATE TABLE IF NOT EXISTS animation_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    animation_id INTEGER NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- click, hover, drag, input, completion
    interaction_data JSONB, -- Store interaction details
    timestamp_in_animation INTEGER, -- When in animation this occurred (seconds)
    session_id VARCHAR(100), -- To group interactions by session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Module dependencies table for prerequisite management
CREATE TABLE IF NOT EXISTS module_dependencies (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(10) NOT NULL,
    prerequisite_module_id VARCHAR(10) NOT NULL,
    dependency_type VARCHAR(50) DEFAULT 'required', -- required, recommended, optional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_module_id) REFERENCES learning_modules(module_id) ON DELETE CASCADE,
    UNIQUE(module_id, prerequisite_module_id)
);

-- Learning paths table for structured learning sequences
CREATE TABLE IF NOT EXISTS learning_paths (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    estimated_duration INTEGER DEFAULT 0, -- in minutes
    modules JSONB NOT NULL, -- Array of module IDs in order
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learning_modules_module_id ON learning_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_status ON learning_modules(status);
CREATE INDEX IF NOT EXISTS idx_learning_modules_active ON learning_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_animations_module_id ON animations(module_id);
CREATE INDEX IF NOT EXISTS idx_animations_published ON animations(is_published);
CREATE INDEX IF NOT EXISTS idx_module_sections_module_id ON module_sections(module_id);
CREATE INDEX IF NOT EXISTS idx_module_sections_type ON module_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_user_id ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_module_id ON user_module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progress_completed ON user_module_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_animation_interactions_user_id ON animation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_animation_interactions_animation_id ON animation_interactions(animation_id);
CREATE INDEX IF NOT EXISTS idx_module_dependencies_module_id ON module_dependencies(module_id);

-- Add comments for documentation
COMMENT ON TABLE learning_modules IS 'Stores all learning module information and configuration';
COMMENT ON TABLE animations IS 'Stores animation content and metadata for modules';
COMMENT ON TABLE module_sections IS 'Structured sections within each learning module';
COMMENT ON TABLE user_module_progress IS 'Tracks detailed user progress through modules and sections';
COMMENT ON TABLE animation_interactions IS 'Logs user interactions with animations for analytics';
COMMENT ON TABLE module_dependencies IS 'Defines prerequisite relationships between modules';
COMMENT ON TABLE learning_paths IS 'Predefined learning sequences and curricula';

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON learning_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animations_updated_at BEFORE UPDATE ON animations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
