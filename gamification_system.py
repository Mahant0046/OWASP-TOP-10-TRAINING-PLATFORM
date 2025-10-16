# Modern Gamification System Backend
import psycopg2
import psycopg2.extras
from datetime import datetime, date, timedelta
from database_postgresql import get_db_connection, get_dict_cursor
import json
import logging

logger = logging.getLogger(__name__)

class ModernGamificationSystem:
    """Advanced gamification system with comprehensive tracking and rewards"""
    
    def __init__(self):
        self.xp_rewards = {
            'documentation': 75,
            'animation': 50,
            'lab': 100,
            'quiz': 80,
            'assessment': 80,
            'module_completion': 150,
            'perfect_score': 50,
            'first_time': 25,
            'streak_bonus': 15,
            'speed_bonus': 20
        }
        
        self.level_thresholds = [
            0, 150, 350, 650, 1100, 1750, 2650, 3850, 5400, 7350, 9750,
            12650, 16100, 20150, 24850
        ]
        
        self.streak_multipliers = {
            3: 1.1, 7: 1.2, 14: 1.3, 30: 1.5
        }

    def initialize_system(self):
        """Initialize gamification tables and data"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Create gamification tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_gamification (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    level INTEGER DEFAULT 1,
                    current_xp INTEGER DEFAULT 0,
                    total_xp INTEGER DEFAULT 0,
                    streak INTEGER DEFAULT 0,
                    max_streak INTEGER DEFAULT 0,
                    last_activity_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                );
                
                CREATE TABLE IF NOT EXISTS achievements_new (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description TEXT NOT NULL,
                    icon VARCHAR(10) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    xp_reward INTEGER DEFAULT 0,
                    condition_type VARCHAR(50) NOT NULL,
                    condition_value JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS user_achievements_new (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    achievement_id INTEGER REFERENCES achievements_new(id) ON DELETE CASCADE,
                    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, achievement_id)
                );
                
                CREATE TABLE IF NOT EXISTS activity_completions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    module_id VARCHAR(10) NOT NULL,
                    activity_type VARCHAR(50) NOT NULL,
                    score INTEGER DEFAULT 0,
                    time_spent INTEGER DEFAULT 0,
                    xp_earned INTEGER DEFAULT 0,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS module_completions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    module_id VARCHAR(10) NOT NULL,
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_xp_earned INTEGER DEFAULT 0,
                    UNIQUE(user_id, module_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
                CREATE INDEX IF NOT EXISTS idx_activity_completions_user_id ON activity_completions(user_id);
                CREATE INDEX IF NOT EXISTS idx_module_completions_user_id ON module_completions(user_id);
            """)
            
            # Initialize achievements
            self._initialize_achievements(cursor)
            
            conn.commit()
            logger.info("✅ Modern gamification system initialized successfully")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Error initializing gamification system: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def _initialize_achievements(self, cursor):
        """Initialize achievement definitions"""
        achievements = [
            # Progress Achievements
            {
                'name': 'First Steps',
                'description': 'Complete your first activity',
                'icon': '🎯',
                'category': 'progress',
                'xp_reward': 50,
                'condition_type': 'activity_count',
                'condition_value': {'min': 1}
            },
            {
                'name': 'XP Collector',
                'description': 'Earn 1000 total XP',
                'icon': '💎',
                'category': 'progress',
                'xp_reward': 100,
                'condition_type': 'total_xp',
                'condition_value': {'min': 1000}
            },
            {
                'name': 'XP Master',
                'description': 'Earn 5000 total XP',
                'icon': '👑',
                'category': 'progress',
                'xp_reward': 200,
                'condition_type': 'total_xp',
                'condition_value': {'min': 5000}
            },
            
            # Learning Achievements
            {
                'name': 'Bookworm',
                'description': 'Read 5 documentation sections',
                'icon': '📚',
                'category': 'learning',
                'xp_reward': 75,
                'condition_type': 'activity_type_count',
                'condition_value': {'activity_type': 'documentation', 'min': 5}
            },
            {
                'name': 'Visual Learner',
                'description': 'Watch 5 animations',
                'icon': '🎬',
                'category': 'learning',
                'xp_reward': 75,
                'condition_type': 'activity_type_count',
                'condition_value': {'activity_type': 'animation', 'min': 5}
            },
            {
                'name': 'Hands-On Learner',
                'description': 'Complete 3 labs',
                'icon': '🧪',
                'category': 'learning',
                'xp_reward': 100,
                'condition_type': 'activity_type_count',
                'condition_value': {'activity_type': 'lab', 'min': 3}
            },
            
            # Mastery Achievements
            {
                'name': 'Access Control Expert',
                'description': 'Master A01 - Broken Access Control',
                'icon': '🔐',
                'category': 'mastery',
                'xp_reward': 150,
                'condition_type': 'module_completion',
                'condition_value': {'module_id': 'A01'}
            },
            {
                'name': 'OWASP Champion',
                'description': 'Complete 5 OWASP modules',
                'icon': '🏆',
                'category': 'mastery',
                'xp_reward': 300,
                'condition_type': 'module_count',
                'condition_value': {'min': 5}
            },
            {
                'name': 'Security Master',
                'description': 'Complete all 10 OWASP modules',
                'icon': '👑',
                'category': 'mastery',
                'xp_reward': 500,
                'condition_type': 'module_count',
                'condition_value': {'min': 10}
            },
            
            # Performance Achievements
            {
                'name': 'Perfectionist',
                'description': 'Score 100% on an assessment',
                'icon': '💯',
                'category': 'performance',
                'xp_reward': 100,
                'condition_type': 'perfect_score',
                'condition_value': {'min': 1}
            },
            {
                'name': 'Consistent Learner',
                'description': 'Maintain a 7-day streak',
                'icon': '🔥',
                'category': 'performance',
                'xp_reward': 150,
                'condition_type': 'streak',
                'condition_value': {'min': 7}
            }
        ]
        
        for achievement in achievements:
            # Convert condition_value dict to JSON string
            achievement_data = achievement.copy()
            achievement_data['condition_value'] = json.dumps(achievement['condition_value'])
            
            cursor.execute("""
                INSERT INTO achievements_new 
                (name, description, icon, category, xp_reward, condition_type, condition_value)
                VALUES (%(name)s, %(description)s, %(icon)s, %(category)s, %(xp_reward)s, 
                        %(condition_type)s, %(condition_value)s)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    category = EXCLUDED.category,
                    xp_reward = EXCLUDED.xp_reward,
                    condition_type = EXCLUDED.condition_type,
                    condition_value = EXCLUDED.condition_value
            """, achievement_data)

    def initialize_user(self, user_id):
        """Initialize gamification data for a new user"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                INSERT INTO user_gamification (user_id, level, current_xp, total_xp, streak, max_streak)
                VALUES (%s, 1, 0, 0, 0, 0)
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id,))
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error initializing user gamification: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def complete_activity(self, user_id, module_id, activity_type, score=0, time_spent=0):
        """Record activity completion and award XP"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Initialize user if needed
            self.initialize_user(user_id)
            
            # Calculate XP
            base_xp = self.xp_rewards.get(activity_type, 0)
            bonus_xp = 0
            
            # Check if first time completing this activity type
            cursor.execute("""
                SELECT COUNT(*) as count FROM activity_completions
                WHERE user_id = %s AND activity_type = %s
            """, (user_id, activity_type))
            
            is_first_time = cursor.fetchone()['count'] == 0
            if is_first_time:
                bonus_xp += self.xp_rewards['first_time']
            
            # Perfect score bonus
            if score >= 100:
                bonus_xp += self.xp_rewards['perfect_score']
            elif score >= 90:
                bonus_xp += self.xp_rewards['perfect_score'] // 2
            
            # Get current streak for multiplier
            cursor.execute("""
                SELECT streak FROM user_gamification WHERE user_id = %s
            """, (user_id,))
            
            current_streak = cursor.fetchone()['streak']
            streak_multiplier = self._get_streak_multiplier(current_streak)
            
            total_xp = int((base_xp + bonus_xp) * streak_multiplier)
            
            # Record activity completion
            cursor.execute("""
                INSERT INTO activity_completions 
                (user_id, module_id, activity_type, score, time_spent, xp_earned)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, module_id, activity_type, score, time_spent, total_xp))
            
            # Update user gamification data
            result = self._update_user_xp(cursor, user_id, total_xp)
            
            # Update streak
            self._update_streak(cursor, user_id)
            
            # Check achievements
            new_achievements = self._check_achievements(cursor, user_id)
            
            conn.commit()
            
            return {
                'success': True,
                'xp_earned': total_xp,
                'level_up': result.get('level_up', False),
                'new_level': result.get('new_level'),
                'new_achievements': new_achievements,
                'streak_multiplier': streak_multiplier
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error completing activity: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def complete_module(self, user_id, module_id):
        """Record module completion and award bonus XP"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Check if already completed
            cursor.execute("""
                SELECT id FROM module_completions 
                WHERE user_id = %s AND module_id = %s
            """, (user_id, module_id))
            
            if cursor.fetchone():
                return {'success': False, 'message': 'Module already completed'}
            
            # Calculate total XP earned for this module
            cursor.execute("""
                SELECT COALESCE(SUM(xp_earned), 0) as total_xp
                FROM activity_completions
                WHERE user_id = %s AND module_id = %s
            """, (user_id, module_id))
            
            module_xp = cursor.fetchone()['total_xp']
            completion_bonus = self.xp_rewards['module_completion']
            
            # Record module completion
            cursor.execute("""
                INSERT INTO module_completions (user_id, module_id, total_xp_earned)
                VALUES (%s, %s, %s)
            """, (user_id, module_id, module_xp + completion_bonus))
            
            # Award completion bonus
            result = self._update_user_xp(cursor, user_id, completion_bonus)
            
            # Check achievements
            new_achievements = self._check_achievements(cursor, user_id)
            
            conn.commit()
            
            return {
                'success': True,
                'completion_bonus': completion_bonus,
                'level_up': result.get('level_up', False),
                'new_level': result.get('new_level'),
                'new_achievements': new_achievements
            }
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Error completing module: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_user_profile(self, user_id):
        """Get complete user gamification profile"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Get user gamification data
            cursor.execute("""
                SELECT ug.*, u.username, u.name
                FROM user_gamification ug
                JOIN users u ON ug.user_id = u.id
                WHERE ug.user_id = %s
            """, (user_id,))
            
            profile = cursor.fetchone()
            if not profile:
                self.initialize_user(user_id)
                return self.get_user_profile(user_id)
            
            # Get activity stats
            cursor.execute("""
                SELECT 
                    activity_type,
                    COUNT(*) as count,
                    AVG(score) as avg_score,
                    SUM(time_spent) as total_time,
                    SUM(xp_earned) as total_xp
                FROM activity_completions
                WHERE user_id = %s
                GROUP BY activity_type
            """, (user_id,))
            
            activity_stats = {row['activity_type']: dict(row) for row in cursor.fetchall()}
            
            # Get completed modules
            cursor.execute("""
                SELECT module_id, completed_at, total_xp_earned
                FROM module_completions
                WHERE user_id = %s
                ORDER BY completed_at
            """, (user_id,))
            
            completed_modules = [dict(row) for row in cursor.fetchall()]
            
            # Get earned achievements
            cursor.execute("""
                SELECT a.name, a.description, a.icon, a.category, ua.earned_at
                FROM user_achievements_new ua
                JOIN achievements_new a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                ORDER BY ua.earned_at DESC
            """, (user_id,))
            
            achievements = [dict(row) for row in cursor.fetchall()]
            
            return {
                'user_id': profile['user_id'],
                'username': profile['username'],
                'name': profile['name'],
                'level': profile['level'],
                'current_xp': profile['current_xp'],
                'total_xp': profile['total_xp'],
                'streak': profile['streak'],
                'max_streak': profile['max_streak'],
                'last_activity_date': profile['last_activity_date'].isoformat() if profile['last_activity_date'] else None,
                'next_level_xp': self._get_next_level_xp(profile['level']),
                'activity_stats': activity_stats,
                'completed_modules': completed_modules,
                'achievements': achievements
            }
            
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_leaderboard(self, limit=10):
        """Get leaderboard with top users"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                SELECT 
                    u.username,
                    u.name,
                    ug.level,
                    ug.total_xp,
                    ug.streak,
                    ug.max_streak,
                    COUNT(DISTINCT mc.module_id) as modules_completed,
                    COUNT(DISTINCT ua.achievement_id) as achievements_earned
                FROM users u
                JOIN user_gamification ug ON u.id = ug.user_id
                LEFT JOIN module_completions mc ON u.id = mc.user_id
                LEFT JOIN user_achievements_new ua ON u.id = ua.user_id
                WHERE u.is_active = TRUE
                GROUP BY u.id, u.username, u.name, ug.level, ug.total_xp, ug.streak, ug.max_streak
                ORDER BY ug.total_xp DESC, ug.level DESC
                LIMIT %s
            """, (limit,))
            
            leaderboard = []
            for i, row in enumerate(cursor.fetchall(), 1):
                entry = dict(row)
                entry['rank'] = i
                leaderboard.append(entry)
            
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def get_user_achievements(self, user_id):
        """Get user's earned achievements"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                SELECT 
                    a.name,
                    a.description,
                    a.icon,
                    a.category,
                    a.xp_reward,
                    ua.earned_at
                FROM user_achievements_new ua
                JOIN achievements_new a ON ua.achievement_id = a.id
                WHERE ua.user_id = %s
                ORDER BY ua.earned_at DESC
            """, (user_id,))
            
            achievements = [dict(row) for row in cursor.fetchall()]
            return achievements
            
        except Exception as e:
            logger.error(f"Error getting user achievements: {e}")
            raise
        finally:
            cursor.close()
            conn.close()

    def _update_user_xp(self, cursor, user_id, xp_amount):
        """Update user XP and handle level progression"""
        # Get current data
        cursor.execute("""
            SELECT level, current_xp, total_xp FROM user_gamification
            WHERE user_id = %s
        """, (user_id,))
        
        data = cursor.fetchone()
        old_level = data['level']
        new_total_xp = data['total_xp'] + xp_amount
        new_level = self._calculate_level(new_total_xp)
        
        # Calculate current XP for new level
        level_base_xp = self.level_thresholds[new_level - 1] if new_level > 1 else 0
        new_current_xp = new_total_xp - level_base_xp
        
        # Update user data
        cursor.execute("""
            UPDATE user_gamification
            SET level = %s, current_xp = %s, total_xp = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (new_level, new_current_xp, new_total_xp, user_id))
        
        return {
            'level_up': new_level > old_level,
            'old_level': old_level,
            'new_level': new_level,
            'new_total_xp': new_total_xp
        }

    def _update_streak(self, cursor, user_id):
        """Update user's learning streak"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        cursor.execute("""
            SELECT streak, max_streak, last_activity_date
            FROM user_gamification
            WHERE user_id = %s
        """, (user_id,))
        
        data = cursor.fetchone()
        current_streak = data['streak']
        max_streak = data['max_streak']
        last_activity = data['last_activity_date']
        
        if last_activity == today:
            # Already active today
            return
        elif last_activity == yesterday:
            # Consecutive day
            new_streak = current_streak + 1
        else:
            # Streak broken or first activity
            new_streak = 1
        
        new_max_streak = max(max_streak, new_streak)
        
        cursor.execute("""
            UPDATE user_gamification
            SET streak = %s, max_streak = %s, last_activity_date = %s
            WHERE user_id = %s
        """, (new_streak, new_max_streak, today, user_id))

    def _check_achievements(self, cursor, user_id):
        """Check and award new achievements"""
        # Get user stats
        cursor.execute("""
            SELECT 
                ug.total_xp,
                ug.streak,
                ug.max_streak,
                COUNT(DISTINCT ac.id) as total_activities,
                COUNT(DISTINCT mc.module_id) as modules_completed,
                COUNT(CASE WHEN ac.score = 100 THEN 1 END) as perfect_scores
            FROM user_gamification ug
            LEFT JOIN activity_completions ac ON ug.user_id = ac.user_id
            LEFT JOIN module_completions mc ON ug.user_id = mc.user_id
            WHERE ug.user_id = %s
            GROUP BY ug.user_id, ug.total_xp, ug.streak, ug.max_streak
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # Get activity type counts
        cursor.execute("""
            SELECT activity_type, COUNT(*) as count
            FROM activity_completions
            WHERE user_id = %s
            GROUP BY activity_type
        """, (user_id,))
        
        activity_counts = {row['activity_type']: row['count'] for row in cursor.fetchall()}
        
        # Get already earned achievements
        cursor.execute("""
            SELECT achievement_id FROM user_achievements_new WHERE user_id = %s
        """, (user_id,))
        
        earned_ids = {row['achievement_id'] for row in cursor.fetchall()}
        
        # Check all achievements
        cursor.execute("SELECT * FROM achievements_new")
        all_achievements = cursor.fetchall()
        
        new_achievements = []
        for achievement in all_achievements:
            if achievement['id'] in earned_ids:
                continue
            
            if self._check_achievement_condition(achievement, stats, activity_counts):
                # Award achievement
                cursor.execute("""
                    INSERT INTO user_achievements_new (user_id, achievement_id)
                    VALUES (%s, %s)
                """, (user_id, achievement['id']))
                
                # Award achievement XP
                if achievement['xp_reward'] > 0:
                    self._update_user_xp(cursor, user_id, achievement['xp_reward'])
                
                new_achievements.append({
                    'name': achievement['name'],
                    'description': achievement['description'],
                    'icon': achievement['icon'],
                    'category': achievement['category'],
                    'xp_reward': achievement['xp_reward']
                })
        
        return new_achievements

    def _check_achievement_condition(self, achievement, stats, activity_counts):
        """Check if achievement condition is met"""
        condition_type = achievement['condition_type']
        condition_value = achievement['condition_value']
        
        # Parse JSON condition_value if it's a string
        if isinstance(condition_value, str):
            try:
                condition_value = json.loads(condition_value)
            except (json.JSONDecodeError, TypeError):
                return False
        
        if condition_type == 'activity_count':
            return stats['total_activities'] >= condition_value['min']
        elif condition_type == 'total_xp':
            return stats['total_xp'] >= condition_value['min']
        elif condition_type == 'activity_type_count':
            activity_type = condition_value['activity_type']
            count = activity_counts.get(activity_type, 0)
            return count >= condition_value['min']
        elif condition_type == 'module_count':
            return stats['modules_completed'] >= condition_value['min']
        elif condition_type == 'perfect_score':
            return stats['perfect_scores'] >= condition_value['min']
        elif condition_type == 'streak':
            return stats['max_streak'] >= condition_value['min']
        elif condition_type == 'module_completion':
            # This would need additional logic to check specific module
            return False
        
        return False

    def _calculate_level(self, total_xp):
        """Calculate level based on total XP"""
        for i in range(len(self.level_thresholds) - 1, -1, -1):
            if total_xp >= self.level_thresholds[i]:
                return i + 1
        return 1

    def _get_next_level_xp(self, current_level):
        """Get XP required for next level"""
        if current_level < len(self.level_thresholds):
            return self.level_thresholds[current_level]
        return self.level_thresholds[-1] + 1000

    def _get_streak_multiplier(self, streak):
        """Get streak multiplier based on current streak"""
        for days in sorted(self.streak_multipliers.keys(), reverse=True):
            if streak >= days:
                return self.streak_multipliers[days]
        return 1.0

# Initialize global gamification system
gamification_system = ModernGamificationSystem()

def init_gamification_system():
    """Initialize the gamification system"""
    try:
        gamification_system.initialize_system()
        logger.info("✅ Modern gamification system initialized")
    except Exception as e:
        logger.error(f"❌ Error initializing gamification system: {e}")
        raise
