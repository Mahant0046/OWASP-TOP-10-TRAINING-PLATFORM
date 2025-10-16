-- PostgreSQL Schema Migration for OWASP Training Platform
-- Migration: 001_initial_schema.sql
-- Description: Create all initial tables with proper PostgreSQL data types

-- Enable UUID extension for better primary keys (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    xp INTEGER DEFAULT 0,
    joined_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    xp_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, module_id)
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    requirements VARCHAR(255),
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Learning activities table
CREATE TABLE IF NOT EXISTS learning_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0,
    score INTEGER,
    xp_earned INTEGER DEFAULT 0,
    data JSONB
);

-- User streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    UNIQUE(user_id)
);

-- User levels table
CREATE TABLE IF NOT EXISTS user_levels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    level_up_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_activities_user_id ON learning_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_activities_module_id ON learning_activities(module_id);
CREATE INDEX IF NOT EXISTS idx_learning_activities_activity_type ON learning_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);

-- Create a view for user statistics (optional but useful)
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.name,
    u.email,
    u.xp,
    u.joined_date,
    ul.level,
    ul.total_xp,
    us.current_streak,
    us.longest_streak,
    COUNT(DISTINCT up.module_id) as modules_completed,
    COUNT(DISTINCT ua.achievement_id) as achievements_earned,
    COUNT(DISTINCT la.id) as total_activities
FROM users u
LEFT JOIN user_levels ul ON u.id = ul.user_id
LEFT JOIN user_streaks us ON u.id = us.user_id
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN learning_activities la ON u.id = la.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.username, u.name, u.email, u.xp, u.joined_date, ul.level, ul.total_xp, us.current_streak, us.longest_streak;

-- Comments for documentation
COMMENT ON TABLE users IS 'Main users table storing user account information';
COMMENT ON TABLE user_progress IS 'Tracks module completion progress for users';
COMMENT ON TABLE admins IS 'Administrator accounts with different roles';
COMMENT ON TABLE activity_log IS 'Logs all user activities for monitoring and analytics';
COMMENT ON TABLE achievements IS 'Available achievements in the gamification system';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have earned';
COMMENT ON TABLE learning_activities IS 'Detailed log of all learning activities';
COMMENT ON TABLE user_streaks IS 'Tracks daily learning streaks for users';
COMMENT ON TABLE user_levels IS 'User level and XP progression data';
COMMENT ON VIEW user_stats IS 'Comprehensive user statistics view';
