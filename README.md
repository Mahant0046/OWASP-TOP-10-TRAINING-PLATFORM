# OWASP Training Platform - PostgreSQL Edition

A comprehensive cybersecurity training platform based on the OWASP Top 10 vulnerabilities, now powered by PostgreSQL for enhanced performance and scalability.

## 🚀 Features

### Core Learning Platform
- **Interactive Labs**: Hands-on exercises for each OWASP Top 10 vulnerability
- **Comprehensive Documentation**: Detailed explanations and learning materials
- **Assessment System**: Quizzes and evaluations to test knowledge
- **Progress Tracking**: Monitor learning progress across all modules

### Advanced Gamification System
- **Complete Learning Flow Tracking**: Start module button activates gamification
- **Activity-Based XP Rewards**: Documentation (50), Animation (25), Labs (75), Assessment (50)
- **Badge System**: 10 unique badges for OWASP Top 10 module completion
- **XP & Leveling**: 11 progressive levels with bonus rewards for high performance
- **Module Completion Bonuses**: Extra 100 XP + badge when all activities finished
- **Real-time Progress Tracking**: Instant feedback and achievement celebrations
- **Sequential Learning Flow**: Documentation unlocks other activities
- **Achievement System**: Comprehensive badges with visual notifications
- **Learning Streaks**: Daily activity tracking with bonus rewards
- **Leaderboards**: Competitive learning environment

### Administrative Features
- **User Management**: Complete admin panel for user oversight
- **Progress Analytics**: Detailed statistics and reporting
- **Module Management**: Content administration capabilities
- **Activity Logging**: Comprehensive audit trails
- **Progress Reset System**: Individual and system-wide user progress reset
- **Learning Flow Control**: Sequential activity unlocking and XP management

## 🗄️ Database Migration to PostgreSQL

This version has been migrated from SQLite to PostgreSQL for:
- **Better Performance**: Optimized for concurrent users
- **Advanced Features**: JSONB, proper timestamps, better indexing
- **Scalability**: Production-ready database architecture
- **Data Integrity**: Enhanced constraints and relationships

## 📋 Prerequisites

### System Requirements
- Python 3.8+
- PostgreSQL 12+
- 2GB RAM minimum
- 1GB disk space

### Required Python Packages
```bash
pip install -r requirements.txt
```

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd owasp-training-platform
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. PostgreSQL Setup

#### Install PostgreSQL
- **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`
- **macOS**: `brew install postgresql`

#### Create Database and User
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE owasp_training;
CREATE USER owasp_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE owasp_training TO owasp_user;
\c owasp_training
GRANT ALL ON SCHEMA public TO owasp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO owasp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO owasp_user;
\q
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=owasp_training
DB_USER=owasp_user
DB_PASSWORD=your_secure_password
FLASK_SECRET_KEY=your-super-secret-key
```

### 5. Initialize Database
```bash
python init_postgresql.py
```

### 6. Start the Application
```bash
python app.py
```

Visit `http://localhost:8855` to access the platform.

## 🔐 Default Accounts

### Regular User
- **Username**: `demo`
- **Password**: `demo`

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`

## 📚 OWASP Top 10 Modules

1. **A01 - Broken Access Control**: IDOR vulnerabilities
2. **A02 - Cryptographic Failures**: Weak hashing demonstrations
3. **A03 - Injection**: SQL injection examples
4. **A04 - Insecure Design**: Business logic flaws
5. **A05 - Security Misconfiguration**: Default credentials
6. **A06 - Vulnerable Components**: Outdated library simulation
7. **A07 - Authentication Failures**: Weak authentication
8. **A08 - Software Integrity Failures**: Unsigned code execution
9. **A09 - Logging Failures**: Missing security monitoring
10. **A10 - Server-Side Request Forgery**: SSRF demonstrations

## 🎮 Gamification System

### XP Rewards
- **Documentation Reading**: 50 XP (+ bonuses for time spent)
- **Lab Completion**: 75 XP (+ performance bonuses)
- **Assessment Passing**: 50+ XP (score-based)
- **Animation Viewing**: 25 XP
- **Daily Streaks**: +10 XP bonus

### Achievement Categories
- **Learning**: First steps, knowledge seeker, documentation master
- **Labs**: Lab rookie, lab warrior, lab master
- **Assessments**: Quiz starter, assessment ace, perfect score
- **Modules**: Vulnerability-specific expert badges
- **Engagement**: Streak achievements, level milestones
- **Special**: Time-based and completion achievements

### Level Progression
11 levels with increasing XP requirements:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 300 XP
- Level 5: 1,000 XP
- Level 10: 6,600 XP
- Level 20: 53,000 XP

## 🔧 Migration from SQLite

If you have existing SQLite data:

### Automatic Migration
```bash
python migrate_sqlite_to_postgresql.py
```

This will transfer:
- All user accounts and progress
- Admin accounts and roles
- Activity logs and gamification data
- Achievements and learning activities

### Manual Migration Steps
1. Ensure PostgreSQL database is set up
2. Run the migration script
3. Verify data integrity
4. Update application configuration
5. Test all functionality

## 🏗️ Project Structure

```
owasp-training-platform/
├── app.py                          # Main Flask application
├── config.py                       # Configuration management
├── database_postgresql.py          # PostgreSQL database module
├── data.py                         # Module definitions
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment template
├── migrations/                     # Database migrations
│   ├── 001_initial_schema.sql     # Schema creation
│   └── 002_default_data.sql       # Default data
├── static/                         # Static assets
│   ├── css/                       # Stylesheets
│   ├── js/                        # JavaScript files
│   └── images/                    # Images and icons
├── templates/                      # HTML templates
│   ├── admin/                     # Admin panel templates
│   ├── labs/                      # Lab exercise templates
│   └── *.html                     # Main templates
├── docs/                          # Documentation files
└── scripts/                       # Utility scripts
```

## 🔍 API Endpoints

### Gamification APIs
- `GET /api/gamification/profile` - User gamification data
- `GET /api/gamification/leaderboard` - Leaderboard data
- `POST /api/gamification/award-xp` - Award XP to user
- `POST /api/gamification/complete-activity` - Complete learning activity
- `POST /api/track-doc-reading` - Track documentation reading

### User APIs
- `GET /api/progress` - User progress data
- `POST /login` - User authentication
- `POST /signup` - User registration

### Admin APIs
- `GET /admin/users` - User management
- `POST /admin/users/<username>/delete` - Delete user
- `POST /admin/users/<username>/reset-progress` - Reset progress

## 🧪 Testing

### Run Basic Tests
```bash
python -c "from database_postgresql import get_all_users; print(f'Users: {len(get_all_users())}')"
```

### Test Gamification
```bash
python -c "from database_postgresql import get_user_gamification_data; print(get_user_gamification_data(1))"
```

### Performance Testing
Use tools like `ab` or `wrk` to test concurrent user handling:
```bash
ab -n 1000 -c 10 http://localhost:8855/
```

## 🚀 Production Deployment

### Environment Configuration
```env
FLASK_DEBUG=False
FLASK_SECRET_KEY=production-secret-key
DB_PASSWORD=strong-production-password
```

### Security Considerations
- Use SSL/TLS for database connections
- Implement proper firewall rules
- Regular security updates
- Database backup strategy
- Monitor application logs

### Performance Optimization
- Enable PostgreSQL connection pooling
- Configure appropriate indexes
- Monitor query performance
- Use caching where appropriate

## 📊 Monitoring & Analytics

### Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor query performance
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC;
```

### Application Metrics
- User registration trends
- Module completion rates
- Achievement unlock statistics
- Learning streak analytics

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL service status
   - Verify credentials in `.env`
   - Ensure database exists

2. **Migration Failures**
   - Check SQLite database exists
   - Verify PostgreSQL permissions
   - Review migration logs

3. **Performance Issues**
   - Monitor database connections
   - Check query execution plans
   - Review server resources

### Debug Mode
Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔄 User Progress Reset System

The platform includes comprehensive user progress reset functionality:

### Individual User Reset
- **Admin Panel**: Users → [Username] → Reset button
- **Resets**: XP, level, modules, activities, achievements, streaks

### System-Wide Reset (Super Admin)
- **Admin Panel**: Users → "Reset All Progress" button
- **Script**: `python reset_all_progress.py`
- **Safety**: Double/triple confirmation required

### Learning Flow XP System
- **Documentation**: 50 XP
- **Animation**: 25 XP  
- **Lab**: 75 XP
- **Quiz**: 50 XP (+25 bonus for 80%+ score)
- **Module Completion**: 100 XP bonus
- **Total per module**: ~325 XP

### Verification
```bash
python verify_reset_system.py
```

See `USER_PROGRESS_SYSTEM.md` for detailed documentation.

## 🎮 Gamification System

The platform features a complete gamification system that tracks learning flow and rewards progress:

### How It Works
1. **Click "Start Module"** → Gamification tracking begins
2. **Complete Documentation** → Earn 50 XP, unlock other activities  
3. **Watch Animation** → Earn 25 XP
4. **Complete Interactive Lab** → Earn 75 XP
5. **Pass Assessment** → Earn 50 XP (+25 bonus for 80%+ score)
6. **Module Completion** → Earn 100 XP bonus + unique badge

### Badge Collection
Earn unique badges for each OWASP Top 10 module:
- 🔐 **Access Control Master** (A01)
- 🔑 **Crypto Guardian** (A02)  
- 💉 **Injection Hunter** (A03)
- 🏗️ **Design Architect** (A04)
- ⚙️ **Configuration Expert** (A05)
- 🧩 **Component Auditor** (A06)
- 🛡️ **Identity Guardian** (A07)
- 📜 **Integrity Keeper** (A08)
- 📊 **Monitoring Specialist** (A09)
- 🌐 **SSRF Defender** (A10)

### XP Economy
- **Per Module**: 300-425 XP (depending on performance)
- **Full Platform**: 4,250 XP maximum
- **Level Progression**: 11 levels from 0 to 6,600+ XP
- **Badge Bonuses**: +100 XP per badge earned

### Testing & Verification
```bash
python test_gamification_system.py
```

See `GAMIFICATION_USER_GUIDE.md` for complete usage instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup
```bash
git clone <your-fork>
cd owasp-training-platform
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
python init_postgresql.py
python app.py
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OWASP Foundation for security guidance
- Flask community for the web framework
- PostgreSQL team for the database system
- Contributors and testers

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the migration guide
3. Check existing issues on GitHub
4. Create a new issue with detailed information

---

**Note**: This is an educational platform designed for learning purposes. The vulnerabilities demonstrated should never be implemented in production systems.
