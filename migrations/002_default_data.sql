-- Default Data Migration for OWASP Training Platform
-- Migration: 002_default_data.sql
-- Description: Insert default users, admins, and achievements

-- Insert default demo user (password: demo)
INSERT INTO users (username, name, email, password_hash, xp, joined_date) 
VALUES ('demo', 'Security Learner', 'demo@example.com', 
        '356a192b7913b04c54574d18c28d46e6395428ab', 0, '2025-01-15')
ON CONFLICT (username) DO NOTHING;

-- Insert default admin users
-- Admin user (password: admin123)
INSERT INTO admins (username, name, password_hash, role) 
VALUES ('admin', 'Administrator', 
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, xp_reward, requirements, is_hidden) VALUES
-- Learning Achievements
('First Steps', 'Complete your first documentation reading', '🎯', 'learning', 25, 'read_first_doc', FALSE),
('Knowledge Seeker', 'Read 5 documentation modules', '📚', 'learning', 50, 'read_5_docs', FALSE),
('Documentation Master', 'Read all 10 OWASP documentation modules', '📖', 'learning', 100, 'read_all_docs', FALSE),

-- Lab Achievements
('Lab Rookie', 'Complete your first lab exercise', '🧪', 'labs', 50, 'complete_first_lab', FALSE),
('Lab Warrior', 'Complete 5 lab exercises', '⚔️', 'labs', 100, 'complete_5_labs', FALSE),
('Lab Master', 'Complete all available lab exercises', '🏆', 'labs', 200, 'complete_all_labs', FALSE),

-- Assessment Achievements
('Quiz Starter', 'Pass your first assessment', '✅', 'assessments', 25, 'pass_first_quiz', FALSE),
('Assessment Ace', 'Pass 5 assessments with 80%+ score', '🎓', 'assessments', 75, 'pass_5_assessments', FALSE),
('Perfect Score', 'Get 100% on any assessment', '💯', 'assessments', 100, 'perfect_score', FALSE),

-- Module Completion
('Access Control Expert', 'Complete A01 - Broken Access Control module', '🔐', 'modules', 100, 'complete_A01', FALSE),
('Crypto Expert', 'Complete A02 - Cryptographic Failures module', '🔒', 'modules', 100, 'complete_A02', FALSE),
('Injection Hunter', 'Complete A03 - Injection module', '💉', 'modules', 100, 'complete_A03', FALSE),
('OWASP Champion', 'Complete all 10 OWASP modules', '🏅', 'modules', 500, 'complete_all_modules', FALSE),

-- Engagement Achievements
('Speed Learner', 'Maintain a 7-day learning streak', '🔥', 'engagement', 75, '7_day_streak', FALSE),
('Dedicated Student', 'Maintain a 30-day learning streak', '📅', 'engagement', 200, '30_day_streak', FALSE),
('Level Up', 'Reach Level 5', '⭐', 'progression', 50, 'reach_level_5', FALSE),
('Rising Star', 'Reach Level 10', '🌟', 'progression', 100, 'reach_level_10', FALSE),
('Security Expert', 'Reach Level 20', '👑', 'progression', 250, 'reach_level_20', FALSE),

-- Special Achievements
('Early Bird', 'Complete an activity before 9 AM', '🌅', 'special', 25, 'early_bird', FALSE),
('Night Owl', 'Complete an activity after 10 PM', '🦉', 'special', 25, 'night_owl', FALSE),
('Weekend Warrior', 'Complete activities on both Saturday and Sunday', '⚡', 'special', 50, 'weekend_warrior', FALSE),
('Completionist', 'Achieve 100% completion on any module', '💎', 'special', 150, '100_percent_module', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Initialize user levels and streaks for existing users
INSERT INTO user_levels (user_id, level, current_xp, total_xp)
SELECT id, 1, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_streaks (user_id, current_streak, longest_streak)
SELECT id, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;
