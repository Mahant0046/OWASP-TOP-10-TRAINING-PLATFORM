# app.py
from flask import Flask, render_template, request, redirect, url_for, session, flash, make_response, send_from_directory, jsonify
from functools import wraps
from datetime import datetime
import hashlib, sqlite3, json, os, io, textwrap, requests, re  # requests used in SSRF lab (intentionally)
from data import DEFAULT_QUESTIONS  # Keep for fallback
from database_postgresql import get_all_learning_modules, get_learning_module_by_id
from config import Config
from database_postgresql import (
    init_database, create_user, authenticate_user, authenticate_admin,
    get_user_by_id, get_user_by_username, get_user_progress, mark_module_completed,
    get_all_users, delete_user, reset_user_progress, reset_all_users_progress, log_activity,
    create_user_enhanced, get_user_by_email, update_user_password,
    record_learning_activity, get_documentation_by_module, get_all_documentation,
    update_documentation_progress, get_user_documentation_progress, complete_learning_activity,
    get_assessment_questions, create_assessment_attempt, complete_assessment_attempt,
    get_user_assessment_attempts, get_assessment_statistics, start_module_tracking,
    award_module_badge, get_user_badges, get_module_badges,
    is_module_completed, get_next_module_id, unlock_next_module
)
from auth_security import (
    PasswordPolicy, AuthSecurity, EmailService, 
    get_client_ip, get_user_agent
)
from gamification_system import gamification_system, init_gamification_system

# Module data functions
def get_modules():
    """Get modules from database with fallback to hardcoded data"""
    try:
        db_modules = get_all_learning_modules()
        if db_modules:
            # Convert database format to expected format
            modules = []
            for module in db_modules:
                modules.append({
                    "id": module["module_id"],
                    "title": module["title"],
                    "description": module.get("description", ""),
                    "points": module.get("points", 100),
                    "difficulty": module.get("difficulty", "Medium"),
                    "status": module.get("status", "available"),
                    "labAvailable": module.get("lab_available", True),
                    "order": module.get("order_index", 0)
                })
            return modules
    except Exception as e:
        print(f"Warning: Could not load modules from database: {e}")
        # Fallback to hardcoded data
        from data import MODULES
        return MODULES
    
    # If no modules found, return hardcoded data
    from data import MODULES
    return MODULES

def get_module_by_id(module_id):
    """Get single module by ID from database with fallback"""
    try:
        db_module = get_learning_module_by_id(module_id)
        if db_module:
            return {
                "id": db_module["module_id"],
                "title": db_module["title"],
                "description": db_module.get("description", ""),
                "points": db_module.get("points", 100),
                "difficulty": db_module.get("difficulty", "Medium"),
                "status": db_module.get("status", "available"),
                "labAvailable": db_module.get("lab_available", True)
            }
    except Exception as e:
        print(f"Warning: Could not load module {module_id} from database: {e}")
    
    # Fallback to hardcoded data
    from data import MODULES
    return next((m for m in MODULES if m["id"] == module_id), None)

# Update MODULES to use database
MODULES = get_modules()  # Load from database

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY

# Register custom Jinja2 filters
@app.template_filter('from_json')
def from_json_filter(value):
    """Convert JSON string to Python object"""
    if not value:
        return {}
    try:
        return json.loads(value) if isinstance(value, str) else value
    except (json.JSONDecodeError, TypeError):
        return {}

# Initialize database on startup
init_database()
# Initialize gamification system
init_gamification_system()
# SQLite backing for SQLi lab only (separate vulnerable DB)
def init_sqli_db():
    conn = sqlite3.connect("sqli.db")
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS users")
    c.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT)")
    c.execute("INSERT INTO users (username,password,email) VALUES ('alice','Wonder@123','alice@example.com')")
    c.execute("INSERT INTO users (username,password,email) VALUES ('bob','Builder@123','bob@example.com')")
    conn.commit(); conn.close()
init_sqli_db()

# A01 data for IDOR
PROFILES = {
    1: {"id": 1, "name": "Alice", "email": "alice@corp.local", "salary": "₹18,40,000"},
    2: {"id": 2, "name": "Bob",   "email": "bob@corp.local",   "salary": "₹19,20,000"},
    3: {"id": 3, "name": "Carol", "email": "carol@corp.local", "salary": "₹21,50,000"},
}

# A09: intentionally no logging (we'll track attempts in memory just to award XP)
FAILED_ATTEMPTS = {}

# A10: internal-only flag endpoint (SSRF target)
INTERNAL_FLAG = "FLAG-OWASP-SSRF-127.0.0.1"
@app.route("/internal/flag")
def internal_flag():
    # not linked anywhere—"internal service"
    return INTERNAL_FLAG

# --------------------------------
# Helpers
# --------------------------------
def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_user_by_id(user_id)

def current_admin():
    admin_id = session.get("admin_id")
    if not admin_id:
        return None
    # For admin, we'll use a simple lookup since we have fewer admins
    from database_postgresql import get_db_connection
    import psycopg2.extras
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute('SELECT id, username, name, role FROM admins WHERE id = %s', (admin_id,))
    admin = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(admin) if admin else None

# Import dynamic module management functions
from module_manager import (
    get_module_order, get_user_unlocked_modules, get_user_completed_modules,
    get_next_module_id_dynamic, unlock_next_module_dynamic, get_module_progress_summary
)

def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            flash("Admin access required. Please log in.", "error")
            return redirect(url_for('admin_login'))
        
        # Verify admin still exists and is active
        admin = current_admin()
        if not admin:
            session.pop('admin_id', None)
            session.pop('admin_name', None)
            session.pop('admin_role', None)
            flash("Admin session expired. Please log in again.", "error")
            return redirect(url_for('admin_login'))
        
        return f(*args, **kwargs)
    return decorated_function

def is_super_admin():
    """Check if current admin is a super admin"""
    admin = current_admin()
    return admin and admin.get("role") == "admin"

def ensure_user_progress():
    """Ensure user is logged in, redirect to login if not"""
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    
    # Verify user still exists in database
    user = current_user()
    if not user:
        session.clear()
        return redirect(url_for("login"))
    
    return None  # User is valid

def award_xp(module_id):
    """Legacy function - now uses the new learning activity system"""
    user_id = session.get("user_id")
    if not user_id:
        return
    
    success = complete_learning_activity(user_id, module_id, 'lab', score=100)
    if success:
        flash(f" Lab completed! +75 XP earned", "ok")
        log_activity(user_id, f"Completed {module_id} lab", f"Earned 75 XP", request.remote_addr)

def is_completed(module_id):
    user_id = session.get("user_id")
    if not user_id:
        return False
    
    # Use the authoritative is_module_completed function
    return is_module_completed(user_id, module_id)

# --------------------------------
# Auth
# --------------------------------
@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        if not username or not password:
            flash("Username and password required", "error")
            return render_template("auth_login.html")
        
        # Check if account is locked
        is_locked, locked_until = AuthSecurity.check_account_lockout(username)
        if is_locked:
            AuthSecurity.log_login_attempt(username, ip_address, user_agent, False, "Account locked")
            flash(f"Account is locked due to too many failed attempts. Try again after {locked_until.strftime('%Y-%m-%d %H:%M:%S')}", "error")
            return render_template("auth_login.html")
        
        user = authenticate_user(username, password)
        if user:
            # Successful login
            AuthSecurity.handle_successful_login(username)
            AuthSecurity.log_login_attempt(username, ip_address, user_agent, True)
            
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["username"] = user["username"]
            flash(f"Welcome back, {user['name']}!", "ok")
            log_activity(user["id"], "User login", f"Logged in from {ip_address}", ip_address)
            
            # Redirect to next page if specified
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for("home"))
        else:
            # Failed login
            AuthSecurity.handle_failed_login(username)
            AuthSecurity.log_login_attempt(username, ip_address, user_agent, False, "Invalid credentials")
            flash("Invalid username or password", "error")
            log_activity(None, "Failed login attempt", f"Username: {username}, IP: {ip_address}", ip_address)
    
    return render_template("auth_login.html")

@app.route("/signup", methods=["GET","POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        ip_address = get_client_ip(request)
        
        # Basic validation
        if not username or not password:
            flash("Username and password are required", "error")
            return render_template("auth_signup.html")
        
        if len(username) < 3:
            flash("Username must be at least 3 characters long", "error")
            return render_template("auth_signup.html")
        
        # Password confirmation check
        if password != confirm_password:
            flash("Passwords do not match", "error")
            return render_template("auth_signup.html")
        
        # Enhanced password validation
        is_valid, password_errors = PasswordPolicy.validate_password(password)
        if not is_valid:
            for error in password_errors:
                flash(error, "error")
            return render_template("auth_signup.html")
        
        # Email validation
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            flash("Please enter a valid email address", "error")
            return render_template("auth_signup.html")
        
        if not name:
            name = username  # Use username as display name if not provided
        
        # Hash password with bcrypt
        hashed_password = AuthSecurity.hash_password(password)
        
        # Try to create user with enhanced security
        try:
            user_id = create_user_enhanced(username, name, email, hashed_password, ip_address)
            if user_id:
                # Send welcome email if email is provided
                if email:
                    try:
                        EmailService.send_welcome_email(email, name)
                        log_activity(user_id, "Welcome email sent", f"Welcome email sent to {email}", ip_address)
                    except Exception as email_error:
                        # Log error but don't fail registration
                        print(f"Warning: Failed to send welcome email to {email}: {email_error}")
                        log_activity(user_id, "Welcome email failed", f"Failed to send welcome email to {email}: {str(email_error)}", ip_address)
                
                # Auto-login after successful registration
                session["user_id"] = user_id
                session["user_name"] = name
                session["username"] = username
                flash(f"Welcome to OWASP Training, {name}! Your account has been created.", "ok")
                log_activity(user_id, "User registration", f"New user registered from {ip_address}", ip_address)
                return redirect(url_for("home"))
            else:
                flash("Username or email already exists. Please choose different credentials.", "error")
        except Exception as e:
            flash("Registration failed. Please try again.", "error")
            print(f"Registration error: {e}")
    
    return render_template("auth_signup.html")

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        ip_address = get_client_ip(request)
        
        if not email:
            flash("Email address is required", "error")
            return render_template("auth_forgot_password.html")
        
        # Find user by email
        user = get_user_by_email(email)
        if user:
            # Create password reset token
            token = AuthSecurity.create_password_reset_token(user["id"], ip_address)
            if token:
                # Send password reset email
                if EmailService.send_password_reset_email(email, user["username"], token):
                    flash("Password reset instructions have been sent to your email address.", "ok")
                    log_activity(user["id"], "Password reset requested", f"Reset token created from {ip_address}", ip_address)
                else:
                    flash("Failed to send password reset email. Please try again.", "error")
            else:
                flash("Failed to create password reset token. Please try again.", "error")
        else:
            # Don't reveal if email exists or not for security
            flash("If an account with that email exists, password reset instructions have been sent.", "ok")
        
        return render_template("auth_forgot_password.html")
    
    return render_template("auth_forgot_password.html")

@app.route("/reset-password", methods=["GET", "POST"])
def reset_password():
    token = request.args.get("token") or request.form.get("token")
    
    if not token:
        flash("Invalid or missing password reset token", "error")
        return redirect(url_for("login"))
    
    # Verify token
    user_id = AuthSecurity.verify_password_reset_token(token)
    if not user_id:
        flash("Invalid or expired password reset token", "error")
        return redirect(url_for("login"))
    
    if request.method == "POST":
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        
        if not password:
            flash("Password is required", "error")
            return render_template("auth_reset_password.html", token=token)
        
        if password != confirm_password:
            flash("Passwords do not match", "error")
            return render_template("auth_reset_password.html", token=token)
        
        # Validate password strength
        is_valid, password_errors = PasswordPolicy.validate_password(password)
        if not is_valid:
            for error in password_errors:
                flash(error, "error")
            return render_template("auth_reset_password.html", token=token)
        
        # Hash new password
        hashed_password = AuthSecurity.hash_password(password)
        
        # Update password and mark token as used
        if update_user_password(user_id, hashed_password) and AuthSecurity.use_password_reset_token(token):
            flash("Your password has been successfully reset. Please log in with your new password.", "ok")
            log_activity(user_id, "Password reset completed", f"Password reset from token", get_client_ip(request))
            return redirect(url_for("login"))
        else:
            flash("Failed to reset password. Please try again.", "error")
    
    return render_template("auth_reset_password.html", token=token)

@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "ok")
    return redirect(url_for("landing"))

# --------------------------------
# Views
# --------------------------------
@app.route("/")
def landing():
    # Landing page - first page users see
    return render_template("landing.html")

@app.route("/dashboard")
def home():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    
    # Get user progress from legacy system
    progress = get_user_progress(user_id)
    completed_modules_legacy = [p["module_id"] for p in progress]
    
    # Get latest assessment scores
    latest_assessments = []
    for module in MODULES:
        attempts = get_user_assessment_attempts(user_id, module["id"])
        if attempts:
            latest_attempt = attempts[0]  # Most recent attempt
            latest_assessments.append({
                "module_id": module["id"],
                "module_title": module["title"],
                "score_percentage": latest_attempt.get("score_percentage", 0),
                "completed_at": latest_attempt.get("completed_at"),
                "attempt_number": latest_attempt.get("attempt_number", 1)
            })
    
    modules = [
        {**m, "completed": is_completed(m["id"]), "labAvailable": True}
        for m in MODULES
    ]
    
    # Get gamification data from modern system
    try:
        gamification_profile = gamification_system.get_user_profile(user_id)
        gamification_data = {
            "level": gamification_profile.get("level", 1),
            "total_xp": gamification_profile.get("total_xp", 0),
            "current_xp": gamification_profile.get("current_xp", 0),
            "next_level_xp": gamification_profile.get("next_level_xp", 1000),
            "achievements": gamification_profile.get("achievements", []),
            "streak": gamification_profile.get("streak", 0),
            "completed_modules": gamification_profile.get("completed_modules", [])
        }
    except Exception as e:
        print(f"Error getting gamification data: {e}")
        # Fallback to legacy system
        from database_postgresql import get_user_gamification_data
        gamification_data = get_user_gamification_data(user_id)
    
    # Get completed modules count using authoritative method
    completed_modules_count = sum(1 for module in MODULES if is_completed(module["id"]))
    
    profile = {
        "name": u["name"],
        "username": u["username"],
        "level": gamification_data.get("level", (u["xp"] // 1000) + 1),
        "totalXP": gamification_data.get("total_xp", u["xp"]),
        "currentXP": gamification_data.get("current_xp", u["xp"] % 1000),
        "nextLevelXP": gamification_data.get("next_level_xp", 1000),
        "modulesCompleted": completed_modules_count,
        "badgesEarned": gamification_data.get("achievements", []),
        "streak": gamification_data.get("streak", 0),
        "joinDate": u["joined_date"],
        "latestAssessments": latest_assessments
    }
    return render_template("index.html", modules=modules, profile=profile, questions=DEFAULT_QUESTIONS)

@app.route("/certificate")
def certificate():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    
    progress = get_user_progress(user_id)
    completed_count = len(progress)
    all_done = completed_count >= len(MODULES)
    
    return render_template("certificate.html",
                           name=u["name"],
                           xp=u["xp"], 
                           date=datetime.utcnow().date().isoformat(),
                           completed=completed_count, 
                           total=len(MODULES),
                           all_done=all_done)

@app.route("/documentation")
def documentation():
    """Learning Documentation page with comprehensive OWASP Top 10 materials"""
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    
    return render_template("documentation.html")

@app.route("/docs/<filename>")
def serve_documentation(filename):
    """Serve documentation markdown files with enhanced viewing"""
    import os
    import markdown
    
    # Security check - only allow .md files
    if not filename.endswith('.md'):
        return "File not found", 404
    
    docs_path = os.path.join(app.root_path, 'docs')
    file_path = os.path.join(docs_path, filename)
    
    if not os.path.exists(file_path):
        return "Documentation file not found", 404
    
    # Read the markdown file with proper encoding detection
    try:
        # Try UTF-8 first
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
        except UnicodeDecodeError:
            # If UTF-8 fails, try UTF-16 (common on Windows)
            try:
                with open(file_path, 'r', encoding='utf-16') as f:
                    markdown_content = f.read()
            except UnicodeDecodeError:
                # Last resort: try with latin-1 which accepts all bytes
                with open(file_path, 'r', encoding='latin-1') as f:
                    markdown_content = f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}", 500
    
    # Convert markdown to HTML with extensions
    try:
        # Build extensions list - codehilite requires pygments, so make it optional
        extensions = [
            'markdown.extensions.toc',
            'markdown.extensions.tables',
            'markdown.extensions.fenced_code',
            'markdown.extensions.attr_list'
        ]
        
        # Try to add codehilite if pygments is available
        try:
            import pygments
            extensions.insert(0, 'markdown.extensions.codehilite')
        except ImportError:
            # pygments not available, skip codehilite
            pass
        
        md = markdown.Markdown(extensions=extensions)
        html_content = md.convert(markdown_content)
        toc_html = getattr(md, 'toc', '')
    except Exception as e:
        print(f"Error converting markdown: {str(e)}")
        import traceback
        traceback.print_exc()
        return f"Error converting markdown: {str(e)}", 500
    
    # Extract module info from filename
    try:
        module_id = filename.replace('.md', '').split('-')[0]
        # Get fresh modules list to avoid stale data
        current_modules = get_modules()
        module_info = next((m for m in current_modules if m["id"] == module_id), None)
    except Exception as e:
        print(f"Error getting module info: {e}")
        module_id = filename.replace('.md', '').split('-')[0]
        module_info = None
    
    # Check if user is logged in for progress tracking
    try:
        user_id = session.get("user_id")
        user = current_user() if user_id else None
    except Exception as e:
        print(f"Error getting user info: {e}")
        user = None
    
    try:
        return render_template('doc_viewer.html', 
                             content=html_content,
                             toc=toc_html,
                             filename=filename,
                             module_id=module_id,
                             module_info=module_info,
                             user=user)
    except Exception as e:
        return f"Error rendering template: {str(e)}", 500

@app.route("/api/debug/unlock-module", methods=["POST"])
def debug_unlock_module():
    """Debug endpoint to manually unlock next module"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}, 401
    
    data = request.get_json()
    module_id = data.get("module_id")
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}, 400
    
    try:
        # Force unlock next module using dynamic logic
        next_module = unlock_next_module_dynamic(user_id, module_id)
        
        if next_module:
            return {
                "success": True, 
                "message": f"Unlocked next module: {next_module}",
                "next_module": next_module
            }
        else:
            return {
                "success": False, 
                "message": "No next module to unlock or already at last module"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/debug/user-progress", methods=["GET"])
def debug_user_progress():
    """Debug endpoint to check current user's progress and unlocked modules"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}, 401
    
    try:
        # Get dynamic module status
        completed_modules = get_user_completed_modules(user_id)
        unlocked_modules = get_user_unlocked_modules(user_id)
        
        # Get activity counts
        from database_postgresql import get_db_connection, get_dict_cursor
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        cursor.execute('''
            SELECT module_id, activity_type, COUNT(*) as count
            FROM activity_completions 
            WHERE user_id = %s
            GROUP BY module_id, activity_type
            ORDER BY module_id, activity_type
        ''', (user_id,))
        
        activities = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "user_id": user_id,
            "completed_modules": completed_modules,
            "unlocked_modules": unlocked_modules,
            "activities": [dict(row) for row in activities]
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/module-progress", methods=["GET"])
def get_module_progress():
    """Get comprehensive module progress using dynamic logic"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}, 401
    
    try:
        progress_summary = get_module_progress_summary(user_id)
        return {
            "success": True,
            "user_id": user_id,
            **progress_summary
        }
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/track-doc-reading", methods=["POST"])
def track_doc_reading():
    """Track documentation reading progress and award XP"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    reading_time = data.get("reading_time", 0)  # in seconds
    completion_percentage = data.get("completion", 0)
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    # Check if already completed this documentation
    progress = get_user_progress(user_id)
    doc_key = f"{module_id}_doc"
    already_completed = any(p["module_id"] == doc_key for p in progress)
    
    if not already_completed:
        # Calculate score based on completion and time spent
        score = completion_percentage if completion_percentage > 0 else 50
        
        # Use modern gamification system
        try:
            result = gamification_system.complete_activity(
                user_id=user_id,
                module_id=module_id,
                activity_type='documentation',
                score=score,
                time_spent=reading_time
            )
            
            # Mark as completed for compatibility
            mark_module_completed(user_id, doc_key, result['xp_earned'])
            
            # Log activity
            log_activity(user_id, f"Read documentation {module_id}", 
                        f"Reading time: {reading_time}s, XP earned: {result['xp_earned']}", 
                        request.remote_addr)
            
            return {
                "success": True, 
                "xp_earned": result['xp_earned'], 
                "first_time": True,
                "level_up": result.get('level_up', False),
                "new_level": result.get('new_level', 1),
                "total_xp": result.get('new_total_xp', 0),
                "streak_multiplier": result.get('streak_multiplier', 1.0),
                "achievements": result.get('new_achievements', [])
            }
        except Exception as e:
            print(f"Error tracking documentation reading: {e}")
            return {"success": False, "error": str(e)}
    
    return {"success": True, "xp_earned": 0, "first_time": False}

# Removed duplicate route - using the newer implementation below

@app.route("/api/gamification/leaderboard", methods=["GET"])
def get_gamification_leaderboard():
    """Get leaderboard data"""
    from database_postgresql import get_leaderboard
    limit = request.args.get('limit', 10, type=int)
    leaderboard = get_leaderboard(limit)
    return {"success": True, "leaderboard": leaderboard}

@app.route("/api/gamification/award-xp", methods=["POST"])
def award_xp_endpoint():
    """Award XP to user (for lab completion, assessments, etc.)"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    xp_amount = data.get("xp", 0)
    source = data.get("source", "general")
    activity_type = data.get("activity_type", "general")
    module_id = data.get("module_id")
    score = data.get("score")
    time_spent = data.get("time_spent", 0)
    
    if xp_amount <= 0:
        return {"success": False, "error": "Invalid XP amount"}
    
    # Use modern gamification system if module_id provided
    if module_id and activity_type != "general":
        try:
            result = gamification_system.complete_activity(
                user_id=user_id,
                module_id=module_id,
                activity_type=activity_type,
                score=score or 0,
                time_spent=time_spent
            )
            
            # Log activity
            log_activity(user_id, f"Earned XP: {source}", 
                        f"XP: {result['xp_earned']}, Activity: {activity_type}", 
                        request.remote_addr)
            
            return {
                "success": True,
                "xp_awarded": result['xp_earned'],
                "level_up": result.get('level_up', False),
                "new_level": result.get('new_level', 1),
                "total_xp": result.get('new_total_xp', 0),
                "streak_multiplier": result.get('streak_multiplier', 1.0),
                "achievements": result.get('new_achievements', [])
            }
        except Exception as e:
            print(f"Error awarding XP: {e}")
            return {"success": False, "error": str(e)}
    else:
        # For general XP without activity tracking, just return success
        # This is a fallback for legacy code
        log_activity(user_id, f"Earned XP: {source}", 
                    f"XP: {xp_amount}, Activity: {activity_type}", 
                    request.remote_addr)
        
        return {
            "success": True,
            "xp_awarded": xp_amount,
            "level_up": False,
            "new_level": 1,
            "total_xp": 0,
            "achievements": []
        }

@app.route("/api/gamification/complete-activity", methods=["POST"])
def api_complete_learning_activity():
    """
    Complete a learning activity following the 4-step learning flow
    
    Learning Flow Steps:
    1. Read documentation (+50 XP)
    2. Watch animation (+25 XP)
    3. Complete hands-on lab (+75 XP)
    4. Pass assessment (+50-100 XP based on score)
    """
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    activity_type = data.get("activity_type")  # read, watch, lab, assessment
    score = data.get("score")
    time_spent = data.get("time_spent", 0)
    additional_data = data.get("data", {})
    
    if not module_id or not activity_type:
        return {"success": False, "error": "Module ID and activity type required"}
    
    # Calculate XP based on activity type and performance
    xp_earned = 0
    
    if activity_type == "read":
        # Reading documentation
        xp_earned = 50
    elif activity_type == "watch":
        # Watching animation
        xp_earned = 25
    elif activity_type == "lab":
        # Completing hands-on lab
        xp_earned = 75
        if score and score >= 90:
            xp_earned += 25  # Bonus for excellent performance
    elif activity_type == "assessment":
        # Passing assessment
        if score:
            if score >= 90:
                xp_earned = 100  # Excellent
            elif score >= 80:
                xp_earned = 75   # Good
            elif score >= 70:
                xp_earned = 60   # Pass
            else:
                xp_earned = 50   # Minimum pass
        else:
            xp_earned = 50  # Default
    else:
        return {"success": False, "error": "Invalid activity type"}
    
    # Record the learning activity
    result = record_learning_activity(
        user_id=user_id,
        module_id=module_id,
        activity_type=activity_type,
        xp_earned=xp_earned,
        score=score,
        time_spent=time_spent,
        data=additional_data
    )
    
    if not result['success']:
        return result
    
    # Get updated user stats
    from database_postgresql import get_user_gamification_data
    user_data = get_user_gamification_data(user_id)
    
    return {
        "success": True,
        "xp_earned": xp_earned,
        "activity_id": result.get('activity_id'),
        "message": result.get('message'),
        "user_stats": {
            "total_xp": user_data.get('total_xp', 0),
            "level": user_data.get('level', 1),
            "current_streak": user_data.get('current_streak', 0)
        }
    }

# --------------------------------
# LABS
# --------------------------------

# A01 Broken Access Control (IDOR)
@app.route("/labs/A01")
@app.route("/labs/a01")  # Alternative route
def a01_idor():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    my_profile_id = 1  # pretend the logged-in user is id=1
    target_id = int(request.args.get("id", my_profile_id))
    data = PROFILES.get(target_id)
    note = None
    if target_id != my_profile_id:
        award_xp("A01")
        note = "You accessed another user's profile (IDOR)!"
    return render_template("labs/a01_idor.html", profile=data, my_id=my_profile_id, note=note)

# A02 Cryptographic Failures (weak MD5 check)
@app.route("/labs/A02", methods=["GET","POST"])
@app.route("/labs/a02", methods=["GET","POST"])  # Alternative route
def a02_crypto():
    msg = None
    if request.method == "POST":
        user = request.form.get("username","")
        password = request.form.get("password","")
        # ❌ weak MD5, unsalted, hardcoded hash of "password"
        weak_hash = "5f4dcc3b5aa765d61d8327deb882cf99"
        if hashlib.md5(password.encode()).hexdigest() == weak_hash:
            award_xp("A02")
            msg = f"Welcome {user}! (logged in with weak credential)"
        else:
            msg = "Invalid"
    return render_template("labs/a02_crypto.html", msg=msg)

# A03 SQL Injection (login bypass)
@app.route("/labs/A03", methods=["GET","POST"])
@app.route("/labs/a03", methods=["GET","POST"])  # Alternative route
def a03_sqli():
    error = None
    if request.method == "POST":
        username = request.form.get("username","")
        password = request.form.get("password","")
        # ❌ vulnerable string concatenation SQL
        query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
        try:
            conn = sqlite3.connect("sqli.db")
            c = conn.cursor()
            c.execute(query)  # ⚠️
            row = c.fetchone()
            conn.close()
            if row:
                award_xp("A03")
                flash("Logged in via SQLi.", "ok")
                return redirect(url_for("a03_sqli"))
            else:
                error = "Invalid"
        except Exception as e:
            error = f"DB error: {e}"
    return render_template("labs/a03_sqli.html", error=error)

# A04 Insecure Design (negative/oversized discount)
@app.route("/labs/A04", methods=["GET","POST"])
@app.route("/labs/a04", methods=["GET","POST"])  # Alternative route
def a04_design():
    price = 1999
    qty = 1
    total = price
    msg = None
    if request.method == "POST":
        try:
            # ❌ trusts client inputs fully
            price = int(request.form.get("price", price))
            qty = int(request.form.get("qty", qty))
            coupon = request.form.get("coupon","")
            total = price * qty
            if coupon:
                # ❌ allows arbitrary percentage; negative or >100 allowed
                pct = int(request.form.get("discount", "0"))
                total = int(total * (100 - pct) / 100)
            if total <= 0:
                award_xp("A04")
                msg = "Order total is zero/negative — business logic flaw exploited!"
        except:
            msg = "Bad input"
    return render_template("labs/a04_insecure_design.html", price=price, qty=qty, total=total, msg=msg)

# A05 Security Misconfiguration (default creds, exposed admin)
@app.route("/labs/A05", methods=["GET","POST"])
@app.route("/labs/a05", methods=["GET","POST"])  # Alternative route
def a05_misconfig():
    admin = False
    error = None
    if request.method == "POST":
        u = request.form.get("username","")
        p = request.form.get("password","")
        # ❌ default creds
        if u == "admin" and p == "admin":
            admin = True
            award_xp("A05")
        else:
            error = "Nope"
    return render_template("labs/a05_misconfig.html", admin=admin, error=error)

# A06 Vulnerable & Outdated Components (unsafe DOM sink sim)
@app.route("/labs/A06", methods=["GET","POST"])
@app.route("/labs/a06", methods=["GET","POST"])  # Alternative route
def a06_components():
    # Simulate an outdated component that lets HTML injection via innerHTML
    payload = None
    solved = False
    if request.method == "POST":
        payload = request.form.get("html","")
        # if user injects a classic onerror/script marker, consider solved
        if "<script" in payload.lower() or "onerror=" in payload.lower():
            award_xp("A06"); solved = True
    return render_template("labs/a06_outdated_components.html", payload=payload, solved=solved)

# A07 Identification & Authentication Failures (no password)
@app.route("/labs/A07", methods=["GET","POST"])
@app.route("/labs/a07", methods=["GET","POST"])  # Alternative route
def a07_auth():
    logged = False
    user = None
    if request.method == "POST":
        # ❌ no password check — username only
        user = request.form.get("username","")
        session["impersonate"] = user
        logged = True
        if user.lower() == "admin":
            award_xp("A07")
    return render_template("labs/a07_authn.html", logged=logged, user=user)

# A08 Software & Data Integrity Failures (unsigned "plugin")
@app.route("/labs/A08", methods=["GET","POST"])
@app.route("/labs/a08", methods=["GET","POST"])  # Alternative route
def a08_integrity():
    banner = "Welcome to the Plugin Manager"
    result = None
    if request.method == "POST":
        try:
            # ❌ trust arbitrary JSON "plugin"
            plugin = json.loads(request.form.get("plugin","{}"))
            banner = plugin.get("banner", banner)
            if plugin.get("grant_xp") is True:
                award_xp("A08")
                result = "Plugin granted elevated action without integrity checks."
        except Exception as e:
            result = f"Bad JSON: {e}"
    return render_template("labs/a08_integrity.html", banner=banner, result=result)

# A09 Security Logging & Monitoring Failures (no rate limits/alerts)
@app.route("/labs/A09", methods=["GET","POST"])
@app.route("/labs/a09", methods=["GET","POST"])  # Alternative route
def a09_logging():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    error = None
    user_ip = request.remote_addr or "local"
    cnt = FAILED_ATTEMPTS.get(user_ip, 0)
    if request.method == "POST":
        # ❌ no lockout, no alerting, generic errors
        FAILED_ATTEMPTS[user_ip] = cnt + 1
        error = "Invalid credentials."
        if FAILED_ATTEMPTS[user_ip] >= 8:
            # award after many noisy attempts (simulating missed alerting)
            award_xp("A09")
            flash("No alerts were raised despite repeated failures.", "ok")
    return render_template("labs/a09_logging.html", attempts=FAILED_ATTEMPTS.get(user_ip,0), error=error)

# A10 SSRF (fetch arbitrary URL)
@app.route("/labs/A10", methods=["GET","POST"])
@app.route("/labs/a10", methods=["GET","POST"])  # Alternative route
def a10_ssrf():
    data = None; error = None; tip = "Try internal URLs like http://127.0.0.1:5000/internal/flag"
    if request.method == "POST":
        url = request.form.get("url","")
        try:
            # ❌ server-side fetch of user-provided URL
            r = requests.get(url, timeout=3)
            data = r.text[:2000]
            if INTERNAL_FLAG in data:
                award_xp("A10")
        except Exception as e:
            error = str(e)
    return render_template("labs/a10_ssrf.html", data=data, error=error, tip=tip)

# --------------------------------
# Minimal API for SPA JS (optional)
# --------------------------------
@app.route("/api/progress")
def api_progress():
    user_id = session.get("user_id")
    if not user_id:
        return {"xp": 0, "completed": []}
    
    u = current_user()
    if not u:
        return {"xp": 0, "completed": []}
    
    progress = get_user_progress(user_id)
    completed_modules = [p["module_id"] for p in progress]
    
    return {
        "xp": u["xp"],
        "completed": sorted(completed_modules)
    }

# --------------------------------
# Admin Routes
# --------------------------------

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        
        if not username or not password:
            flash("Username and password required", "error")
            return render_template("admin/login.html")
        
        # Authenticate admin
        admin = authenticate_admin(username, password)
        if admin:
            session["admin_id"] = admin["id"]
            session["admin_name"] = admin["name"]
            session["admin_role"] = admin["role"]
            flash(f"Welcome, {admin['name']}!", "ok")
            return redirect(url_for("admin_dashboard"))
        else:
            flash("Invalid admin credentials", "error")
    
    return render_template("admin/login.html")

@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_id", None)
    session.pop("admin_name", None)
    session.pop("admin_role", None)
    flash("Admin logged out", "ok")
    return redirect(url_for("admin_login"))


@app.route("/admin")
@app.route("/admin/dashboard")
@require_admin
def admin_dashboard():
    admin = current_admin()
    users = get_all_users()
    active_users = len([u for u in users if u.get("xp", 0) > 0])
    
    stats = {
        "total_users": len(users),
        "total_modules": len(MODULES),
        "total_admins": 2,  # We have 2 admin accounts
        "active_sessions": active_users
    }
    
    return render_template("admin/dashboard.html", admin=admin, stats=stats)

@app.route("/admin/users")
@require_admin
def admin_users():
    admin = current_admin()
    users = get_all_users()
    # Convert to dict format for template compatibility
    users_dict = {user["username"]: user for user in users}
    
    return render_template("admin/users.html", users=users_dict, admin=admin)

@app.route("/admin/users/<username>/delete", methods=["POST"])
@require_admin
def admin_delete_user(username):
    if not is_super_admin():
        flash("Super admin access required", "error")
        return redirect(url_for("admin_users"))
    
    user = get_user_by_username(username)
    if user and username != "demo":  # protect demo user
        delete_user(user["id"])
        flash(f"User {username} deleted", "ok")
    else:
        flash("Cannot delete this user", "error")
    
    return redirect(url_for("admin_users"))

@app.route("/admin/users/<username>/reset-progress", methods=["POST"])
@require_admin
def admin_reset_user_progress(username):
    user = get_user_by_username(username)
    if user:
        reset_user_progress(user["id"])
        flash(f"Progress reset for {username}", "ok")
    else:
        flash("User not found", "error")
    return redirect(url_for("admin_users"))

@app.route("/admin/reset-all-progress", methods=["POST"])
@require_admin
def admin_reset_all_progress():
    """Reset all users' progress and stats"""
    if not is_super_admin():
        flash("Super admin access required", "error")
        return redirect(url_for("admin_dashboard"))
    
    try:
        reset_all_users_progress()
        flash("✅ All user progress has been reset successfully", "ok")
    except Exception as e:
        flash(f"❌ Error resetting progress: {e}", "error")
    
    return redirect(url_for("admin_users"))

@app.route("/api/complete-activity", methods=["POST"])
def api_complete_activity():
    """API endpoint to complete learning activities with proper XP tracking"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    if not data:
        return {"success": False, "error": "No data provided"}
    
    module_id = data.get("module_id")
    activity_type = data.get("activity_type")
    score = data.get("score")
    time_spent = data.get("time_spent")
    
    if not module_id or not activity_type:
        return {"success": False, "error": "Module ID and activity type required"}
    
    try:
        # Use the new complete_learning_activity function for proper tracking
        success = complete_learning_activity(user_id, module_id, activity_type, score, time_spent)
        
        if success:
            # Check if this completed the entire module using the proper function
            module_completed = is_module_completed(user_id, module_id)
            next_module_unlocked = None
            
            if module_completed:
                # Unlock next module using dynamic logic
                next_module_unlocked = unlock_next_module_dynamic(user_id, module_id)
                print(f"🎉 Module {module_id} completed! Next module: {next_module_unlocked}")
            
            # Get all completed modules for this user
            from database_postgresql import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get completed modules from multiple sources
            cursor.execute('''
                SELECT DISTINCT module_id FROM (
                    SELECT module_id FROM user_progress WHERE user_id = %s
                    UNION
                    SELECT module_id FROM module_completions WHERE user_id = %s
                    UNION
                    SELECT DISTINCT module_id FROM learning_activities 
                    WHERE user_id = %s AND completed_at IS NOT NULL
                ) AS all_modules
            ''', (user_id, user_id, user_id))
            
            unlocked_modules = [row[0] for row in cursor.fetchall()]
            
            # Ensure A01 is always unlocked
            if "A01" not in unlocked_modules:
                unlocked_modules.append("A01")
            
            # Get truly completed modules (those that pass the completion check)
            completed_modules = get_user_completed_modules(user_id)
            
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": f"Activity {activity_type} completed",
                "module_completed": module_completed,
                "next_module_unlocked": next_module_unlocked,
                "completed_modules": completed_modules,
                "unlocked_modules": unlocked_modules,
                "refresh_needed": True  # Signal frontend to refresh
            }
        else:
            return {"success": False, "error": "Activity already completed or error occurred"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.route("/api/start-module", methods=["POST"])
def api_start_module():
    """API endpoint to start module tracking and gamification"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    if not data:
        return {"success": False, "error": "No data provided"}
    
    module_id = data.get("module_id")
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Start module tracking
        success = start_module_tracking(user_id, module_id)
        
        if success:
            # Get module info for response
            module = get_module_by_id(module_id)
            module_name = module["title"] if module else module_id
            
            return {
                "success": True,
                "message": f"Started tracking progress for {module_name}",
                "module_id": module_id,
                "gamification_active": True,
                "xp_rewards": {
                    "documentation": 50,
                    "animation": 25,
                    "lab": 75,
                    "assessment": 50,
                    "module_completion": 100
                }
            }
        else:
            return {"success": False, "error": "Failed to start module tracking"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/api/user-badges")
def api_user_badges():
    """API endpoint to get user's earned badges"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    try:
        badges = get_user_badges(user_id)
        return {
            "success": True,
            "badges": badges,
            "total_badges": len(badges)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/debug-progress")
def api_debug_progress():
    """Debug endpoint to see what activities are recorded"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        from database_postgresql import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all learning activities for this user
        cursor.execute('''
            SELECT module_id, activity_type, completed_at, xp_earned, score
            FROM learning_activities 
            WHERE user_id = %s
            ORDER BY module_id, activity_type, completed_at DESC
        ''', (user_id,))
        
        activities = []
        for row in cursor.fetchall():
            activities.append({
                'module_id': row[0],
                'activity_type': row[1], 
                'completed_at': str(row[2]) if row[2] else None,
                'xp_earned': row[3],
                'score': row[4]
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "user_id": user_id,
            "total_activities": len(activities),
            "activities": activities
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/api/user-progress")
def api_user_progress():
    """Get user-specific module progression"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        # Get user's completed modules and activity progress
        try:
            from database_postgresql import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Get completed modules (those with module_completion activity)
            cursor.execute('''
                SELECT DISTINCT module_id 
                FROM learning_activities 
                WHERE user_id = %s AND activity_type = 'module_completion' AND completed_at IS NOT NULL
            ''', (user_id,))
            
            completed_modules = [row[0] for row in cursor.fetchall()]
            
            # Also check for modules that should be completed based on individual activities
            # A module is complete if it has all 4 required activities completed
            cursor.execute('''
                SELECT module_id, COUNT(DISTINCT activity_type) as completed_activities
                FROM learning_activities 
                WHERE user_id = %s 
                  AND activity_type IN ('documentation', 'animation', 'lab', 'quiz', 'assessment') 
                  AND completed_at IS NOT NULL
                GROUP BY module_id
                HAVING COUNT(DISTINCT activity_type) >= 4
            ''', (user_id,))
            
            activity_completed_modules = [row[0] for row in cursor.fetchall()]
            
            # Combine both lists and remove duplicates
            all_completed = list(set(completed_modules + activity_completed_modules))
            completed_modules = all_completed
            
            print(f"📊 Progress tracking: {len(completed_modules)} completed modules: {completed_modules}")
            
            cursor.close()
            conn.close()
            
        except Exception as db_error:
            print(f"Database error in user-progress: {db_error}")
            # Fallback to empty lists if database fails
            completed_modules = []
        
        # Get dynamic unlocked modules based on completion
        unlocked_modules = get_user_unlocked_modules(user_id)
        
        return {
            "success": True,
            "data": {
                "completed_modules": completed_modules,
                "unlocked_modules": unlocked_modules,
                "user_id": user_id
            }
        }
        
    except Exception as e:
        print(f"Error in api_user_progress: {e}")
        return {"success": False, "error": str(e)}, 500

@app.route("/api/bootstrap")
def api_bootstrap():
    """Bootstrap API endpoint for frontend initialization"""
    user_id = session.get("user_id")
    
    try:
        bootstrap_data = {
            "user": {
                "id": user_id,
                "authenticated": bool(user_id)
            },
            "modules": MODULES,
            "config": {
                "xp_rewards": {
                    "documentation": 50,
                    "animation": 25,
                    "lab": 75,
                    "assessment": 50,
                    "module_completion": 100
                },
                "level_thresholds": [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600]
            }
        }
        
        # Add user progress and profile if authenticated
        if user_id:
            try:
                u = current_user()
                
                # Get completed modules (those with module_completion activity)
                from database_postgresql import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT DISTINCT module_id 
                    FROM learning_activities 
                    WHERE user_id = %s AND activity_type = 'module_completion' AND completed_at IS NOT NULL
                ''', (user_id,))
                
                completed_modules = [row[0] for row in cursor.fetchall()]
                
                # Also check for modules that should be completed based on individual activities
                cursor.execute('''
                    SELECT module_id, COUNT(DISTINCT activity_type) as completed_activities
                    FROM learning_activities 
                    WHERE user_id = %s 
                      AND activity_type IN ('documentation', 'animation', 'lab', 'quiz', 'assessment') 
                      AND completed_at IS NOT NULL
                    GROUP BY module_id
                    HAVING COUNT(DISTINCT activity_type) >= 4
                ''', (user_id,))
                
                activity_completed_modules = [row[0] for row in cursor.fetchall()]
                
                # Combine both lists and remove duplicates
                all_completed = list(set(completed_modules + activity_completed_modules))
                completed_modules = all_completed
                
                # Get all progress for compatibility
                progress = get_user_progress(user_id)
                
                # Calculate unlocked modules dynamically
                unlocked_modules = get_user_unlocked_modules(user_id)
                
                # Calculate user stats properly
                user_xp = u["xp"] or 0
                user_level = (user_xp // 1000) + 1
                current_level_xp = (user_level - 1) * 1000
                current_xp = user_xp - current_level_xp
                next_level_xp = user_level * 1000
                
                # Get user's activity streak (simplified for now)
                try:
                    cursor.execute('''
                        SELECT COUNT(DISTINCT DATE(completed_at)) as active_days
                        FROM user_progress 
                        WHERE user_id = %s AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
                    ''', (user_id,))
                    
                    streak_result = cursor.fetchone()
                    streak = streak_result[0] if streak_result else 0
                except:
                    streak = 0
                
                # Get badges/achievements count (for now, use completed modules as basis)
                badges_earned = min(len(completed_modules), 10)  # Max 10 badges
                
                cursor.close()
                conn.close()

                bootstrap_data["progress"] = progress
                bootstrap_data["unlocked_modules"] = unlocked_modules
                bootstrap_data["userProfile"] = {
                    "name": u["name"],
                    "username": u["username"],
                    "level": user_level,
                    "totalXP": user_xp,
                    "currentXP": current_xp,
                    "nextLevelXP": next_level_xp,
                    "modulesCompleted": len(completed_modules),
                    "badgesEarned": [{"name": f"Module {i+1} Complete", "icon": "🏆"} for i in range(badges_earned)],
                    "streak": streak,
                    "joinDate": u["joined_date"].isoformat() if hasattr(u["joined_date"], 'isoformat') else str(u["joined_date"])
                }
            except Exception as e:
                print(f"Error loading user data: {e}")
                bootstrap_data["progress"] = []
                bootstrap_data["unlocked_modules"] = ["A01"]  # Default for new users
                bootstrap_data["userProfile"] = None
        
        return bootstrap_data
        
    except Exception as e:
        return {"error": str(e)}, 500

@app.route("/admin/modules")
@require_admin
def admin_modules():
    """Admin modules management - list all learning modules"""
    admin = current_admin()
    modules = get_modules()
    
    return render_template("admin/modules.html", modules=modules, admin=admin)

@app.route("/admin/modules/<module_id>/edit", methods=["GET", "POST"])
@require_admin
def admin_edit_module(module_id):
    admin = current_admin()
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found", "error")
        return redirect(url_for("admin_modules"))
    
    if request.method == "POST":
        module["title"] = request.form.get("title", module["title"])
        module["description"] = request.form.get("description", module["description"])
        module["difficulty"] = request.form.get("difficulty", module["difficulty"])
        module["xp"] = int(request.form.get("xp", module["xp"]))
        flash(f"Module {module_id} updated", "ok")
    
    return render_template("admin/edit_module_enhanced.html", module=module, admin=admin, existing_doc=None)

@app.route("/admin/modules/<module_id>/edit-enhanced", methods=["GET", "POST"])
@require_admin
def admin_edit_module_enhanced(module_id):
    """Enhanced module editing with database integration"""
    admin = current_admin()
    
    # Find module in MODULES data
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found", "error")
        return redirect(url_for("admin_modules"))
    
    if request.method == "POST":
        try:
            # Update module data
            module["title"] = request.form.get("title", module["title"])
            module["description"] = request.form.get("description", module.get("description", ""))
            module["difficulty"] = request.form.get("difficulty", module["difficulty"])
            module["points"] = int(request.form.get("points", module.get("points", 100)))
            module["status"] = request.form.get("status", module.get("status", "available"))
            
            # Update lab availability
            module["labAvailable"] = request.form.get("lab_available") == "on"
            
            # Update documentation if exists
            doc_title = request.form.get("doc_title", "").strip()
            doc_content = request.form.get("doc_content", "").strip()
            
            if doc_title and doc_content:
                # Check if documentation exists for this module
                existing_doc = get_documentation_by_module(module_id)
                
                from database_postgresql import get_db_connection
                conn = get_db_connection()
                cursor = conn.cursor()
                
                if existing_doc:
                    # Update existing documentation
                    cursor.execute('''
                        UPDATE documentation 
                        SET title = %s, content = %s, difficulty = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE module_id = %s
                    ''', (doc_title, doc_content, module["difficulty"], module_id))
                else:
                    # Create new documentation
                    cursor.execute('''
                        INSERT INTO documentation 
                        (module_id, title, content, difficulty, estimated_read_time, tags)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (module_id, doc_title, doc_content, module["difficulty"], 
                          15, [module_id.lower(), 'owasp-top-10']))
                
                conn.commit()
                cursor.close()
                conn.close()
            
            flash(f"Module {module_id} updated successfully", "ok")
            return redirect(url_for("admin_modules"))
            
        except Exception as e:
            flash(f"Error updating module: {e}", "error")
    
    # Get existing documentation
    existing_doc = get_documentation_by_module(module_id)
    
    return render_template("admin/edit_module_enhanced.html", 
                         admin=admin, 
                         module=module, 
                         existing_doc=existing_doc)

@app.route("/admin/system")
@require_admin
def admin_system():
    admin = current_admin()
    if not is_super_admin():
        flash("Super admin access required", "error")
        return redirect(url_for("admin_dashboard"))
    
    system_info = {
        "flask_version": "2.3.0",
        "python_version": "3.11+",
        "database": "PostgreSQL",
        "total_users": len(get_all_users()),
        "total_routes": len(app.url_map._rules)
    }
    
    return render_template("admin/system.html", system_info=system_info, admin=admin)

@app.route("/admin/assessments")
@require_admin
def admin_assessments():
    """Admin assessment management"""
    admin = current_admin()
    
    # Get all assessment questions grouped by module
    from database_postgresql import get_db_connection, get_dict_cursor
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        cursor.execute('''
            SELECT aq.*, ac.name as category_name 
            FROM assessment_questions aq
            LEFT JOIN assessment_categories ac ON aq.module_id = ac.name
            ORDER BY aq.module_id, aq.order_index, aq.id
        ''')
        questions = cursor.fetchall()
        
        # Group questions by module
        questions_by_module = {}
        for question in questions:
            module_id = question['module_id']
            if module_id not in questions_by_module:
                questions_by_module[module_id] = []
            questions_by_module[module_id].append(dict(question))
        
        # Get assessment statistics
        cursor.execute('''
            SELECT 
                module_id,
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(score_percentage) as avg_score,
                MAX(score_percentage) as max_score,
                MIN(score_percentage) as min_score
            FROM user_assessment_attempts 
            WHERE is_completed = TRUE
            GROUP BY module_id
            ORDER BY module_id
        ''')
        stats = cursor.fetchall()
        stats_by_module = {stat['module_id']: dict(stat) for stat in stats}
        
        return render_template("admin/assessments.html", 
                             admin=admin, 
                             questions_by_module=questions_by_module,
                             stats_by_module=stats_by_module)
    except Exception as e:
        flash(f"Error loading assessments: {e}", "error")
        return redirect(url_for("admin_dashboard"))
    finally:
        cursor.close()
        conn.close()

@app.route("/admin/assessments/create", methods=["GET", "POST"])
@require_admin
def admin_create_assessment():
    """Create new assessment question"""
    admin = current_admin()
    
    if request.method == "POST":
        try:
            module_id = request.form.get("module_id", "").strip()
            question_text = request.form.get("question_text", "").strip()
            question_type = request.form.get("question_type", "multiple_choice")
            correct_answer = request.form.get("correct_answer", "").strip()
            explanation = request.form.get("explanation", "").strip()
            difficulty = request.form.get("difficulty", "Medium")
            points = int(request.form.get("points", 10))
            order_index = int(request.form.get("order_index", 0))
            
            # Handle options based on question type
            options = {}
            if question_type == "multiple_choice":
                options = {
                    "a": request.form.get("option_a", "").strip(),
                    "b": request.form.get("option_b", "").strip(),
                    "c": request.form.get("option_c", "").strip(),
                    "d": request.form.get("option_d", "").strip()
                }
                # Remove empty options
                options = {k: v for k, v in options.items() if v}
            elif question_type == "true_false":
                options = {"true": "True", "false": "False"}
            
            if not all([module_id, question_text, correct_answer]):
                flash("Module ID, question text, and correct answer are required", "error")
                return render_template("admin/create_assessment.html", admin=admin)
            
            # Insert into database
            from database_postgresql import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO assessment_questions 
                (module_id, question_text, question_type, options, correct_answer, 
                 explanation, difficulty, points, order_index)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (module_id, question_text, question_type, json.dumps(options), 
                  correct_answer, explanation, difficulty, points, order_index))
            
            conn.commit()
            flash(f"Assessment question created successfully for {module_id}", "ok")
            return redirect(url_for("admin_assessments"))
            
        except Exception as e:
            flash(f"Error creating assessment: {e}", "error")
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    return render_template("admin/create_assessment.html", admin=admin)

@app.route("/admin/assessments/<int:question_id>/edit", methods=["GET", "POST"])
@require_admin
def admin_edit_assessment(question_id):
    """Edit assessment question"""
    admin = current_admin()
    
    from database_postgresql import get_db_connection, get_dict_cursor
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get existing question
        cursor.execute('SELECT * FROM assessment_questions WHERE id = %s', (question_id,))
        question = cursor.fetchone()
        
        if not question:
            flash("Assessment question not found", "error")
            return redirect(url_for("admin_assessments"))
        
        question = dict(question)
        
        if request.method == "POST":
            module_id = request.form.get("module_id", "").strip()
            question_text = request.form.get("question_text", "").strip()
            question_type = request.form.get("question_type", "multiple_choice")
            correct_answer = request.form.get("correct_answer", "").strip()
            explanation = request.form.get("explanation", "").strip()
            difficulty = request.form.get("difficulty", "Medium")
            points = int(request.form.get("points", 10))
            order_index = int(request.form.get("order_index", 0))
            is_active = request.form.get("is_active") == "on"
            
            # Handle options based on question type
            options = {}
            if question_type == "multiple_choice":
                options = {
                    "a": request.form.get("option_a", "").strip(),
                    "b": request.form.get("option_b", "").strip(),
                    "c": request.form.get("option_c", "").strip(),
                    "d": request.form.get("option_d", "").strip()
                }
                # Remove empty options
                options = {k: v for k, v in options.items() if v}
            elif question_type == "true_false":
                options = {"true": "True", "false": "False"}
            
            if not all([module_id, question_text, correct_answer]):
                flash("Module ID, question text, and correct answer are required", "error")
                return render_template("admin/edit_assessment.html", admin=admin, question=question)
            
            # Update in database
            cursor.execute('''
                UPDATE assessment_questions 
                SET module_id = %s, question_text = %s, question_type = %s, 
                    options = %s, correct_answer = %s, explanation = %s, 
                    difficulty = %s, points = %s, order_index = %s, is_active = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (module_id, question_text, question_type, json.dumps(options), 
                  correct_answer, explanation, difficulty, points, order_index, 
                  is_active, question_id))
            
            conn.commit()
            flash(f"Assessment question updated successfully", "ok")
            return redirect(url_for("admin_assessments"))
        
        return render_template("admin/edit_assessment.html", admin=admin, question=question)
        
    except Exception as e:
        flash(f"Error editing assessment: {e}", "error")
        return redirect(url_for("admin_assessments"))
    finally:
        cursor.close()
        conn.close()

@app.route("/admin/assessments/<int:question_id>/delete", methods=["POST"])
@require_admin
def admin_delete_assessment(question_id):
    """Delete assessment question"""
    if not is_super_admin():
        flash("Super admin access required", "error")
        return redirect(url_for("admin_assessments"))
    
    from database_postgresql import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if question exists
        cursor.execute('SELECT module_id FROM assessment_questions WHERE id = %s', (question_id,))
        result = cursor.fetchone()
        
        if not result:
            flash("Assessment question not found", "error")
            return redirect(url_for("admin_assessments"))
        
        module_id = result[0]
        
        # Delete the question
        cursor.execute('DELETE FROM assessment_questions WHERE id = %s', (question_id,))
        conn.commit()
        
        flash(f"Assessment question deleted from {module_id}", "ok")
        
    except Exception as e:
        flash(f"Error deleting assessment: {e}", "error")
    finally:
        cursor.close()
        conn.close()
    
    return redirect(url_for("admin_assessments"))

@app.route("/admin/assessments/<module_id>/statistics")
@require_admin
def admin_assessment_statistics(module_id):
    """View detailed assessment statistics for a module"""
    admin = current_admin()
    
    from database_postgresql import get_db_connection, get_dict_cursor
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Get module statistics
        cursor.execute('''
            SELECT 
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(score_percentage) as avg_score,
                MAX(score_percentage) as max_score,
                MIN(score_percentage) as min_score,
                AVG(time_taken) as avg_time_taken,
                COUNT(CASE WHEN score_percentage >= 70 THEN 1 END) as passed_attempts,
                COUNT(CASE WHEN score_percentage < 70 THEN 1 END) as failed_attempts
            FROM user_assessment_attempts 
            WHERE module_id = %s AND is_completed = TRUE
        ''', (module_id,))
        
        stats = cursor.fetchone()
        if stats:
            stats = dict(stats)
            if stats['total_attempts'] > 0:
                stats['pass_rate'] = (stats['passed_attempts'] / stats['total_attempts']) * 100
            else:
                stats['pass_rate'] = 0
        
        # Get recent attempts
        cursor.execute('''
            SELECT uaa.*, u.username, u.name
            FROM user_assessment_attempts uaa
            JOIN users u ON uaa.user_id = u.id
            WHERE uaa.module_id = %s AND uaa.is_completed = TRUE
            ORDER BY uaa.completed_at DESC
            LIMIT 20
        ''', (module_id,))
        
        recent_attempts = [dict(attempt) for attempt in cursor.fetchall()]
        
        # Get question-level statistics
        cursor.execute('''
            SELECT aq.id, aq.question_text, aq.difficulty, aq.points,
                   COUNT(uaa.id) as total_responses,
                   COUNT(CASE WHEN uaa.answers::text LIKE '%"' || aq.id || '":"' || aq.correct_answer || '"%' THEN 1 END) as correct_responses
            FROM assessment_questions aq
            LEFT JOIN user_assessment_attempts uaa ON uaa.module_id = aq.module_id AND uaa.is_completed = TRUE
            WHERE aq.module_id = %s AND aq.is_active = TRUE
            GROUP BY aq.id, aq.question_text, aq.difficulty, aq.points
            ORDER BY aq.order_index, aq.id
        ''', (module_id,))
        
        question_stats = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            if row_dict['total_responses'] > 0:
                row_dict['success_rate'] = (row_dict['correct_responses'] / row_dict['total_responses']) * 100
            else:
                row_dict['success_rate'] = 0
            question_stats.append(row_dict)
        
        return render_template("admin/assessment_statistics.html", 
                             admin=admin, 
                             module_id=module_id,
                             stats=stats,
                             recent_attempts=recent_attempts,
                             question_stats=question_stats)
        
    except Exception as e:
        flash(f"Error loading statistics: {e}", "error")
        return redirect(url_for("admin_assessments"))
    finally:
        cursor.close()
        conn.close()

@app.route("/admin/documentation")
@require_admin
def admin_documentation():
    """Admin documentation management"""
    admin = current_admin()
    
    try:
        docs = get_all_documentation()
        
        # Get documentation statistics
        from database_postgresql import get_db_connection, get_dict_cursor
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        cursor.execute('''
            SELECT 
                d.module_id,
                COUNT(udp.id) as total_readers,
                COUNT(DISTINCT udp.user_id) as unique_readers,
                AVG(udp.progress_percentage) as avg_progress,
                COUNT(CASE WHEN udp.is_completed THEN 1 END) as completed_readers
            FROM documentation d
            LEFT JOIN user_documentation_progress udp ON d.id = udp.documentation_id
            GROUP BY d.module_id, d.id
            ORDER BY d.module_id
        ''')
        
        stats = cursor.fetchall()
        stats_by_module = {stat['module_id']: dict(stat) for stat in stats}
        
        return render_template("admin/documentation.html", 
                             admin=admin, 
                             docs=docs,
                             stats_by_module=stats_by_module)
    except Exception as e:
        flash(f"Error loading documentation: {e}", "error")
        return redirect(url_for("admin_dashboard"))
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route("/admin/documentation/create", methods=["GET", "POST"])
@require_admin
def admin_create_documentation():
    """Create new documentation"""
    admin = current_admin()
    
    if request.method == "POST":
        try:
            module_id = request.form.get("module_id", "").strip()
            title = request.form.get("title", "").strip()
            content = request.form.get("content", "").strip()
            file_path = request.form.get("file_path", "").strip()
            author = request.form.get("author", "OWASP Team").strip()
            difficulty = request.form.get("difficulty", "Medium")
            estimated_read_time = int(request.form.get("estimated_read_time", 15))
            tags = request.form.get("tags", "").strip()
            is_published = request.form.get("is_published") == "on"
            
            # Process tags
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
            
            if not all([module_id, title, content]):
                flash("Module ID, title, and content are required", "error")
                return render_template("admin/create_documentation.html", admin=admin)
            
            # Insert into database
            from database_postgresql import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO documentation 
                (module_id, title, content, file_path, author, difficulty, 
                 estimated_read_time, tags, is_published)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (module_id, title, content, file_path, author, difficulty, 
                  estimated_read_time, tags_list, is_published))
            
            conn.commit()
            flash(f"Documentation created successfully for {module_id}", "ok")
            return redirect(url_for("admin_documentation"))
            
        except Exception as e:
            flash(f"Error creating documentation: {e}", "error")
        finally:
            if 'cursor' in locals():
                cursor.close()
            if 'conn' in locals():
                conn.close()
    
    return render_template("admin/create_documentation.html", admin=admin)

@app.route("/admin/documentation/<int:doc_id>/edit", methods=["GET", "POST"])
@require_admin
def admin_edit_documentation(doc_id):
    """Edit documentation"""
    admin = current_admin()
    
    try:
        # Get documentation by ID
        from database_postgresql import get_db_connection, get_dict_cursor
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        cursor.execute('SELECT * FROM documentation WHERE id = %s', (doc_id,))
        doc = cursor.fetchone()
        
        if not doc:
            flash("Documentation not found", "error")
            return redirect(url_for("admin_documentation"))
        
        doc = dict(doc)
        
        if request.method == "POST":
            module_id = request.form.get("module_id", "").strip()
            title = request.form.get("title", "").strip()
            content = request.form.get("content", "").strip()
            file_path = request.form.get("file_path", "").strip()
            author = request.form.get("author", "OWASP Team").strip()
            difficulty = request.form.get("difficulty", "Medium")
            estimated_read_time = int(request.form.get("estimated_read_time", 15))
            tags = request.form.get("tags", "").strip()
            is_published = request.form.get("is_published") == "on"
            
            # Process tags
            tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
            
            if not all([module_id, title, content]):
                flash("Module ID, title, and content are required", "error")
                return render_template("admin/edit_documentation.html", admin=admin, doc=doc)
            
            # Update in database
            cursor.execute('''
                UPDATE documentation 
                SET module_id = %s, title = %s, content = %s, file_path = %s,
                    author = %s, difficulty = %s, estimated_read_time = %s,
                    tags = %s, is_published = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (module_id, title, content, file_path, author, difficulty, 
                  estimated_read_time, tags_list, is_published, doc_id))
            
            conn.commit()
            flash("Documentation updated successfully", "ok")
            return redirect(url_for("admin_documentation"))
        
        return render_template("admin/edit_documentation.html", admin=admin, doc=doc)
        
    except Exception as e:
        flash(f"Error editing documentation: {e}", "error")
        return redirect(url_for("admin_documentation"))
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route("/admin/documentation/<int:doc_id>/delete", methods=["POST"])
@require_admin
def admin_delete_documentation(doc_id):
    """Delete documentation"""
    if not is_super_admin():
        flash("Super admin access required", "error")
        return redirect(url_for("admin_documentation"))
    
    try:
        from database_postgresql import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if documentation exists
        cursor.execute('SELECT module_id FROM documentation WHERE id = %s', (doc_id,))
        result = cursor.fetchone()
        
        if not result:
            flash("Documentation not found", "error")
            return redirect(url_for("admin_documentation"))
        
        module_id = result[0]
        
        # Delete the documentation
        cursor.execute('DELETE FROM documentation WHERE id = %s', (doc_id,))
        conn.commit()
        
        flash(f"Documentation deleted for {module_id}", "ok")
        
    except Exception as e:
        flash(f"Error deleting documentation: {e}", "error")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
    
    return redirect(url_for("admin_documentation"))

# ================================
# DOCUMENTATION API ENDPOINTS
# ================================

@app.route('/api/documentation/<module_id>')
def api_get_documentation(module_id):
    """Get documentation for a specific module"""
    try:
        doc = get_documentation_by_module(module_id)
        if doc:
            return {"success": True, "data": doc}
        else:
            return {"success": False, "error": "Documentation not found"}, 404
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route('/api/documentation')
def api_get_all_documentation():
    """Get all documentation"""
    try:
        docs = get_all_documentation()
        return {"success": True, "data": docs}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route('/api/documentation/<module_id>/progress', methods=['POST'])
def api_update_documentation_progress(module_id):
    """Update user's documentation progress"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        data = request.get_json()
        progress_percentage = data.get('progress_percentage', 0)
        time_spent = data.get('time_spent', 0)
        
        success = update_documentation_progress(
            session['user_id'], module_id, progress_percentage, time_spent
        )
        
        if success:
            return {"success": True, "message": "Progress updated"}
        else:
            return {"success": False, "error": "Failed to update progress"}, 500
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route('/api/documentation/progress')
@app.route('/api/documentation/<module_id>/progress')
def api_get_documentation_progress(module_id=None):
    """Get user's documentation progress"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        progress = get_user_documentation_progress(session['user_id'], module_id)
        return {"success": True, "data": progress}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ================================
# ANIMATION ROUTES
# ================================

@app.route("/animations/<module_id>")
def animation_viewer(module_id):
    """View interactive animations for a module (legacy route - redirects to new progression system)"""
    # Redirect to the new module progression animation route
    return redirect(url_for('module_animation', module_id=module_id))

@app.route("/test-progression")
def test_progression():
    """Test page for module progression system"""
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    return render_template("test_progression.html")

# ASSESSMENT ROUTES (User-facing)
# ================================

@app.route("/assessment/<module_id>")
@app.route("/module/<module_id>/assessment")  # Alias for backward compatibility
def assessment_page(module_id):
    """User-facing assessment page for a module"""
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("login"))
    
    u = current_user()
    if not u:
        return redirect(url_for("login"))
    
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found", "error")
        return redirect(url_for("home"))
    
    return render_template("assessment_page.html", module=module, module_id=module_id)

# ================================
# ADMIN ROUTES
# ================================

@app.route('/api/assessments/<module_id>/questions')
def api_get_assessment_questions(module_id):
    """Get assessment questions for a module"""
    try:
        db_questions = get_assessment_questions(module_id)
        
        # Transform questions to frontend format
        frontend_questions = []
        for q in db_questions:
            # Parse options from JSON
            options_dict = q.get('options', {})
            if isinstance(options_dict, str):
                import json
                options_dict = json.loads(options_dict)
            
            # Convert options dict to array
            options_array = []
            correct_index = None
            correct_answer = str(q.get('correct_answer', '')).lower()
            
            # Sort keys to maintain consistent order (a, b, c, d)
            for idx, key in enumerate(sorted(options_dict.keys())):
                options_array.append(options_dict[key])
                if key.lower() == correct_answer:
                    correct_index = idx
            
            frontend_questions.append({
                'id': q['id'],
                'question': q['question_text'],
                'options': options_array,
                'correct': correct_index,  # Include for client-side validation (will be verified server-side)
                'points': q.get('points', 10)
            })
        
        return {"success": True, "questions": frontend_questions}
    except Exception as e:
        print(f"Error transforming assessment questions: {e}")
        return {"success": False, "error": str(e)}, 500

@app.route('/api/assessments/<module_id>/start', methods=['POST'])
def api_start_assessment(module_id):
    """Start a new assessment attempt"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        questions = get_assessment_questions(module_id)
        if not questions:
            # Return success with 0 questions to allow frontend to handle gracefully
            # This allows modules without assessment questions to still be completed
            return {
                "success": True, 
                "data": {
                    "attempt_id": None, 
                    "total_questions": 0,
                    "no_questions": True,
                    "message": f"Assessment questions for {module_id} are coming soon!"
                }
            }
        
        attempt_id = create_assessment_attempt(
            session['user_id'], module_id, len(questions)
        )
        
        if attempt_id:
            return {"success": True, "data": {"attempt_id": attempt_id, "total_questions": len(questions), "no_questions": False}}
        else:
            return {"success": False, "error": "Failed to create assessment attempt"}, 500
    except Exception as e:
        print(f"Error starting assessment for {module_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}, 500

@app.route('/api/assessments/<module_id>/submit', methods=['POST'])
def api_submit_assessment(module_id):
    """Submit assessment answers"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        data = request.get_json()
        attempt_id = data.get('attempt_id')
        answers = data.get('answers', {})
        time_taken = data.get('time_taken', 0)
        user_id = session['user_id']
        
        # Handle case where there are no questions (module without assessment)
        questions = get_assessment_questions(module_id)
        if not questions:
            # Mark module as completed even without assessment
            # Award base XP for completing the module
            gamification_result = gamification_system.complete_activity(
                user_id, module_id, 'assessment', 100, time_taken
            )
            
            # Mark module as completed
            module_completion_result = gamification_system.complete_module(user_id, module_id)
            next_module_unlocked = unlock_next_module_dynamic(user_id, module_id)
            
            return {
                "success": True,
                "data": {
                    "score_percentage": 100,
                    "correct_answers": 0,
                    "total_questions": 0,
                    "time_taken": time_taken,
                    "results": [],
                    "xp_earned": gamification_result.get('xp_earned', 50),
                    "level_up": gamification_result.get('level_up', False),
                    "new_level": gamification_result.get('new_level'),
                    "new_achievements": gamification_result.get('new_achievements', []),
                    "module_completed": True,
                    "next_module_unlocked": next_module_unlocked,
                    "module_completion_bonus": module_completion_result.get('completion_bonus', 0),
                    "module_achievements": module_completion_result.get('new_achievements', []),
                    "no_questions": True,
                    "message": f"Module {module_id} completed! Assessment questions coming soon."
                }
            }
        
        if not attempt_id:
            return {"success": False, "error": "Attempt ID required"}, 400
        
        # Get correct answers
        questions = get_assessment_questions(module_id)
        correct_answers = 0
        detailed_results = []
        
        for question in questions:
            question_id = str(question['id'])
            user_answer_index = answers.get(question_id, '')
            
            # Convert user answer index to option key
            is_correct = False
            user_answer_key = ''
            
            if user_answer_index is not None and user_answer_index != '':
                try:
                    # Convert index to option key (0='a', 1='b', 2='c', 3='d')
                    option_keys = ['a', 'b', 'c', 'd']
                    if isinstance(user_answer_index, (int, str)) and str(user_answer_index).isdigit():
                        index = int(user_answer_index)
                        if 0 <= index < len(option_keys):
                            user_answer_key = option_keys[index]
                            is_correct = user_answer_key == question['correct_answer']
                except (ValueError, IndexError):
                    pass
            
            if is_correct:
                correct_answers += 1
            
            # Get the actual answer text for display
            options = question.get('options', {})
            user_answer_text = options.get(user_answer_key, 'No answer') if user_answer_key else 'No answer'
            correct_answer_text = options.get(question['correct_answer'], question['correct_answer'])
            
            detailed_results.append({
                'question_id': question['id'],
                'question_text': question['question_text'],
                'user_answer': user_answer_text,
                'correct_answer': correct_answer_text,
                'is_correct': is_correct,
                'explanation': question.get('explanation', ''),
                'points': question['points'] if is_correct else 0
            })
        
        # Complete the attempt
        success = complete_assessment_attempt(attempt_id, answers, correct_answers, time_taken)
        
        if success:
            score_percentage = (correct_answers / len(questions) * 100) if questions else 0
            user_id = session['user_id']
            
            # Award XP and check for achievements using modern gamification system
            gamification_result = gamification_system.complete_activity(
                user_id, module_id, 'assessment', score_percentage, time_taken
            )
            
            # Check if module is now completed and unlock next module
            module_completed = is_module_completed(user_id, module_id)
            next_module_unlocked = None
            
            if module_completed:
                # Mark module as completed in gamification system
                module_completion_result = gamification_system.complete_module(user_id, module_id)
                
                # Unlock next module using dynamic logic
                next_module_unlocked = unlock_next_module_dynamic(user_id, module_id)
                
                # Award module completion XP using legacy system for compatibility
                mark_module_completed(user_id, f"{module_id}_assessment", gamification_result.get('xp_earned', 0))
            
            return {
                "success": True, 
                "data": {
                    "score_percentage": score_percentage,
                    "correct_answers": correct_answers,
                    "total_questions": len(questions),
                    "time_taken": time_taken,
                    "results": detailed_results,
                    "xp_earned": gamification_result.get('xp_earned', 0),
                    "level_up": gamification_result.get('level_up', False),
                    "new_level": gamification_result.get('new_level'),
                    "new_achievements": gamification_result.get('new_achievements', []),
                    "module_completed": module_completed,
                    "next_module_unlocked": next_module_unlocked,
                    "module_completion_bonus": module_completion_result.get('completion_bonus', 0) if module_completed else 0,
                    "module_achievements": module_completion_result.get('new_achievements', []) if module_completed else []
                }
            }
        else:
            return {"success": False, "error": "Failed to submit assessment"}, 500
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route('/api/assessments/<module_id>/attempts')
def api_get_assessment_attempts(module_id):
    """Get user's assessment attempts for a module"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        attempts = get_user_assessment_attempts(session['user_id'], module_id)
        return {"success": True, "data": attempts}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route('/api/assessments/statistics')
@app.route('/api/assessments/<module_id>/statistics')
def api_get_assessment_statistics(module_id=None):
    """Get assessment statistics"""
    try:
        stats = get_assessment_statistics(module_id)
        return {"success": True, "data": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

# ================================
# MODULE PROGRESSION SYSTEM
# ================================

@app.route("/module/<module_id>/documentation")
def module_documentation(module_id):
    """Display module documentation and award XP upon completion"""
    user = current_user()
    if not user:
        flash("Please log in to access module content.", "error")
        return redirect(url_for('login'))
    
    # Get module info
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found.", "error")
        return redirect(url_for('home'))
    
    # Get documentation content
    documentation = get_documentation_by_module(module_id)
    
    return render_template('module_documentation.html', 
                         module=module, 
                         documentation=documentation,
                         user=user)

@app.route("/api/complete-documentation", methods=["POST"])
def api_complete_documentation():
    """Mark documentation as completed and award 50 XP"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    time_spent = data.get("time_spent", 0)
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Complete documentation activity and award 50 XP
        success = complete_learning_activity(user_id, module_id, 'documentation', 
                                           score=100, time_spent=time_spent)
        
        if success:
            return {
                "success": True,
                "message": "Documentation completed! +50 XP earned",
                "xp_earned": 50,
                "activity_type": "documentation"
            }
        else:
            return {"success": False, "error": "Documentation already completed"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/module/<module_id>/animation")
def module_animation(module_id):
    """Display module animation and award XP upon completion"""
    user = current_user()
    if not user:
        flash("Please log in to access module content.", "error")
        return redirect(url_for('login'))
    
    # Get module info
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found.", "error")
        return redirect(url_for('home'))
    
    return render_template('module_animation.html', 
                         module=module,
                         user=user)

@app.route("/api/complete-animation", methods=["POST"])
def api_complete_animation():
    """Mark animation as completed and award 25 XP"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    time_spent = data.get("time_spent", 0)
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Complete animation activity and award 25 XP
        success = complete_learning_activity(user_id, module_id, 'animation', 
                                           score=100, time_spent=time_spent)
        
        if success:
            return {
                "success": True,
                "message": "Animation completed! +25 XP earned",
                "xp_earned": 25,
                "activity_type": "animation"
            }
        else:
            return {"success": False, "error": "Animation already completed"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/module/<module_id>/lab")
def module_lab(module_id):
    """Display interactive lab and award XP upon completion"""
    user = current_user()
    if not user:
        flash("Please log in to access module content.", "error")
        return redirect(url_for('login'))
    
    # Get module info
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found.", "error")
        return redirect(url_for('home'))
    
    # Route to existing lab implementations based on module
    if module_id == "A01":
        return redirect(url_for('a01_idor'))
    elif module_id == "A02":
        return redirect(url_for('a02_crypto'))
    elif module_id == "A03":
        return redirect(url_for('a03_sqli'))
    elif module_id == "A04":
        return redirect(url_for('a04_design'))
    elif module_id == "A05":
        return redirect(url_for('a05_misconfig'))
    elif module_id == "A06":
        return redirect(url_for('a06_components'))
    elif module_id == "A07":
        return redirect(url_for('a07_auth'))
    elif module_id == "A08":
        return redirect(url_for('a08_integrity'))
    elif module_id == "A09":
        return redirect(url_for('a09_logging'))
    elif module_id == "A10":
        return redirect(url_for('a10_ssrf'))
    else:
        return render_template('module_lab.html', 
                             module=module,
                             user=user)

@app.route("/api/complete-lab", methods=["POST"])
def api_complete_lab():
    """Mark lab as completed and award 75 XP"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    score = data.get("score", 100)
    time_spent = data.get("time_spent", 0)
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Complete lab activity and award 75 XP
        success = complete_learning_activity(user_id, module_id, 'lab', 
                                           score=score, time_spent=time_spent)
        
        if success:
            return {
                "success": True,
                "message": "Lab completed! +75 XP earned",
                "xp_earned": 75,
                "activity_type": "lab"
            }
        else:
            return {"success": False, "error": "Lab already completed"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/module/<module_id>/quiz")
def module_quiz(module_id):
    """Display module quiz and award XP upon completion"""
    user = current_user()
    if not user:
        flash("Please log in to access module content.", "error")
        return redirect(url_for('login'))
    
    # Get module info
    module = get_module_by_id(module_id)
    if not module:
        flash("Module not found.", "error")
        return redirect(url_for('home'))
    
    # Get quiz questions
    questions = get_assessment_questions(module_id)
    
    return render_template('module_quiz.html', 
                         module=module,
                         questions=questions,
                         user=user)

@app.route("/api/complete-quiz", methods=["POST"])
def api_complete_quiz():
    """Submit quiz answers and award 50 XP based on score"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    answers = data.get("answers", [])
    time_spent = data.get("time_spent", 0)
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Get questions and calculate score
        questions = get_assessment_questions(module_id)
        if not questions:
            return {"success": False, "error": "No questions found for this module"}
        
        correct_answers = 0
        total_questions = len(questions)
        
        for i, answer in enumerate(answers):
            if i < len(questions) and answer == questions[i].get('c', 0):
                correct_answers += 1
        
        score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
        
        # Complete quiz activity and award 50 XP (+ bonus for high scores)
        success = complete_learning_activity(user_id, module_id, 'quiz', 
                                           score=score, time_spent=time_spent)
        
        if success:
            base_xp = 50
            bonus_xp = 25 if score >= 80 else 0
            total_xp = base_xp + bonus_xp
            
            return {
                "success": True,
                "message": f"Quiz completed! Score: {score}% (+{total_xp} XP earned)",
                "score": score,
                "correct_answers": correct_answers,
                "total_questions": total_questions,
                "xp_earned": total_xp,
                "activity_type": "quiz"
            }
        else:
            return {"success": False, "error": "Quiz already completed"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/api/check-module-completion", methods=["POST"])
def api_check_module_completion():
    """Check if module is fully completed and award badge"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not logged in"}
    
    data = request.get_json()
    module_id = data.get("module_id")
    
    if not module_id:
        return {"success": False, "error": "Module ID required"}
    
    try:
        # Check if all activities are completed
        from database_postgresql import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(DISTINCT activity_type) as completed_activities
            FROM learning_activities 
            WHERE user_id = %s AND module_id = %s AND completed_at IS NOT NULL
        ''', (user_id, module_id))
        
        result = cursor.fetchone()
        completed_activities = result[0] if result else 0
        
        # Check if module completion badge already awarded
        cursor.execute('''
            SELECT id FROM user_progress WHERE user_id = %s AND module_id = %s
        ''', (user_id, module_id))
        
        module_completed = cursor.fetchone() is not None
        
        cursor.close()
        conn.close()
        
        # If all 4 activities completed and badge not yet awarded
        if completed_activities >= 4 and not module_completed:
            # Award module badge
            badge_success = award_module_badge(user_id, module_id)
            
            if badge_success:
                module = get_module_by_id(module_id)
                module_name = module["title"] if module else module_id
                
                return {
                    "success": True,
                    "module_completed": True,
                    "badge_awarded": True,
                    "message": f"Congratulations! You've completed {module_name} and earned the module badge!",
                    "completed_activities": completed_activities
                }
        
        return {
            "success": True,
            "module_completed": module_completed,
            "badge_awarded": False,
            "completed_activities": completed_activities,
            "required_activities": 4
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# ================================
# GAMIFICATION API ENDPOINTS
# ================================

@app.route('/api/gamification/profile')
def api_gamification_profile():
    """Get user gamification profile"""
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    try:
        profile = gamification_system.get_user_profile(session['user_id'])
        if profile:
            return jsonify({"success": True, "data": profile})
        else:
            return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        print(f"Error in api_gamification_profile: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/gamification/award-xp', methods=['POST'])
def api_award_xp():
    """Award XP to user"""
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    try:
        data = request.get_json()
        xp_amount = data.get('xp_amount', 0)
        activity_type = data.get('activity_type', 'general')
        module_id = data.get('module_id')
        score = data.get('score')
        time_spent = data.get('time_spent', 0)
        
        if xp_amount <= 0:
            return jsonify({"success": False, "error": "Invalid XP amount"}), 400
        
        result = gamification_system.complete_activity(
            session['user_id'], module_id, activity_type, score, time_spent
        )
        
        return jsonify({"success": True, "data": result})
        
    except Exception as e:
        print(f"Error in api_award_xp: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/gamification/complete-module', methods=['POST'])
def api_complete_module():
    """Mark module as completed"""
    if 'user_id' not in session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    try:
        data = request.get_json()
        module_id = data.get('module_id')
        
        if not module_id:
            return jsonify({"success": False, "error": "Module ID required"}), 400
        
        result = gamification_system.complete_module(session['user_id'], module_id)
        return jsonify({"success": True, "data": result})
        
    except Exception as e:
        print(f"Error in api_complete_module: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/gamification/leaderboard')
def api_leaderboard():
    """Get leaderboard"""
    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard = gamification_system.get_leaderboard(limit)
        return jsonify({"success": True, "data": leaderboard})
    except Exception as e:
        print(f"Error in api_leaderboard: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/gamification/user-stats')
def api_get_user_stats():
    """Get user gamification stats"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        user_id = session['user_id']
        u = current_user()
        if not u:
            return {"success": False, "error": "User not found"}, 404
        
        # Get gamification data from modern system
        try:
            gamification_profile = gamification_system.get_user_profile(user_id)
            gamification_data = {
                "level": gamification_profile.get("level", 1),
                "total_xp": gamification_profile.get("total_xp", 0),
                "current_xp": gamification_profile.get("current_xp", 0),
                "next_level_xp": gamification_profile.get("next_level_xp", 1000),
                "achievements": gamification_profile.get("achievements", []),
                "streak": gamification_profile.get("streak", 0),
                "completed_modules": gamification_profile.get("completed_modules", [])
            }
        except Exception as e:
            print(f"Error getting gamification data: {e}")
            # Fallback to legacy system
            from database_postgresql import get_user_gamification_data
            gamification_data = get_user_gamification_data(user_id)
        
        # Get completed modules count using authoritative method
        completed_modules_count = sum(1 for module in MODULES if is_completed(module["id"]))
        
        # Get unlocked modules (first module + any unlocked via completion)
        unlocked_modules = ["A01"]  # First module is always unlocked
        progress = get_user_progress(user_id)
        for p in progress:
            if p["module_id"] not in unlocked_modules and not p["module_id"].endswith("_assessment") and not p["module_id"].endswith("_doc"):
                unlocked_modules.append(p["module_id"])
        
        # Check for next modules unlocked via completion
        for module in MODULES:
            if is_completed(module["id"]):
                next_module_id = get_next_module_id(module["id"])
                if next_module_id and next_module_id not in unlocked_modules:
                    unlocked_modules.append(next_module_id)
        
        stats = {
            "user_id": user_id,
            "level": gamification_data.get("level", (u["xp"] // 1000) + 1),
            "totalXP": gamification_data.get("total_xp", u["xp"]),
            "currentXP": gamification_data.get("current_xp", u["xp"] % 1000),
            "nextLevelXP": gamification_data.get("next_level_xp", 1000),
            "modulesCompleted": completed_modules_count,
            "streak": gamification_data.get("streak", 0),
            "unlocked_modules": unlocked_modules,
            "completed_modules": [module["id"] for module in MODULES if is_completed(module["id"])],
            "achievements": gamification_data.get("achievements", [])
        }
        return {"success": True, "data": stats}
    except Exception as e:
        print(f"Error in api_get_user_stats: {e}")
        return {"success": False, "error": str(e)}, 500

@app.route('/api/gamification/achievements')
def api_get_achievements():
    """Get user achievements"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        user_id = session['user_id']
        # Initialize user if needed
        gamification_system.initialize_user(user_id)
        
        # Get user achievements
        achievements = gamification_system.get_user_achievements(user_id)
        
        return {"success": True, "data": achievements}
    except Exception as e:
        print(f"Error getting achievements: {e}")
        return {"success": False, "error": str(e)}, 500

@app.route("/test-gamification")
def test_gamification():
    """Test page for gamification system"""
    return send_from_directory(".", "test_gamification.html")

@app.route("/api/debug/module-completion")
def debug_module_completion():
    """Debug endpoint to check module completion status"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    user_id = session['user_id']
    debug_info = {}
    
    for module in MODULES:
        module_id = module["id"]
        debug_info[module_id] = {
            "is_completed": is_completed(module_id),
            "is_module_completed": is_module_completed(user_id, module_id)
        }
        
        # Check assessment attempts
        attempts = get_user_assessment_attempts(user_id, module_id)
        debug_info[module_id]["assessment_attempts"] = len(attempts) if attempts else 0
        debug_info[module_id]["assessment_passed"] = any(
            attempt.get("score_percentage", 0) >= 70 and attempt.get("is_completed", False)
            for attempt in (attempts or [])
        )
        
        # Check activities in modern system
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        cursor.execute('''
            SELECT COUNT(DISTINCT activity_type) as activity_count
            FROM activity_completions 
            WHERE user_id = %s AND module_id = %s
        ''', (user_id, module_id))
        modern_activities = cursor.fetchone()['activity_count']
        
        # Check activities in legacy system
        cursor.execute('''
            SELECT COUNT(DISTINCT activity_type) as activity_count
            FROM learning_activities 
            WHERE user_id = %s AND module_id = %s AND completed_at IS NOT NULL
        ''', (user_id, module_id))
        legacy_activities = cursor.fetchone()['activity_count']
        
        debug_info[module_id]["modern_activities"] = modern_activities
        debug_info[module_id]["legacy_activities"] = legacy_activities
        
        cursor.close()
        conn.close()
    
    return {"success": True, "debug_info": debug_info}

@app.route("/api/debug/database-state")
def debug_database_state():
    """Check what's actually in the database tables"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    user_id = session['user_id']
    debug_data = {"user_id": user_id}
    
    conn = get_db_connection()
    cursor = get_dict_cursor(conn)
    
    try:
        # Check user basic info
        cursor.execute('SELECT id, username, name, xp FROM users WHERE id = %s', (user_id,))
        user_row = cursor.fetchone()
        debug_data["user_info"] = dict(user_row) if user_row else None
        
        # Check activity_completions table (modern system)
        cursor.execute('''
            SELECT module_id, activity_type, score, time_spent, xp_earned, completed_at
            FROM activity_completions 
            WHERE user_id = %s 
            ORDER BY completed_at DESC
        ''', (user_id,))
        debug_data["activity_completions"] = [dict(row) for row in cursor.fetchall()]
        
        # Check learning_activities table (legacy system)
        cursor.execute('''
            SELECT module_id, activity_type, score, time_spent, xp_earned, completed_at
            FROM learning_activities 
            WHERE user_id = %s AND completed_at IS NOT NULL
            ORDER BY completed_at DESC
        ''', (user_id,))
        debug_data["learning_activities"] = [dict(row) for row in cursor.fetchall()]
        
        # Check user_progress table
        cursor.execute('''
            SELECT module_id, xp_earned, completed_at
            FROM user_progress 
            WHERE user_id = %s
            ORDER BY completed_at DESC
        ''', (user_id,))
        debug_data["user_progress"] = [dict(row) for row in cursor.fetchall()]
        
        # Check assessment attempts
        cursor.execute('''
            SELECT module_id, score_percentage, is_completed, completed_at, attempt_number
            FROM user_assessment_attempts 
            WHERE user_id = %s
            ORDER BY completed_at DESC
        ''', (user_id,))
        debug_data["assessment_attempts"] = [dict(row) for row in cursor.fetchall()]
        
        # Check gamification tables
        cursor.execute('''
            SELECT level, current_xp, total_xp, streak, last_activity_date
            FROM user_gamification 
            WHERE user_id = %s
        ''', (user_id,))
        gamification_row = cursor.fetchone()
        debug_data["user_gamification"] = dict(gamification_row) if gamification_row else None
        
        cursor.execute('''
            SELECT module_id, completed_at, total_xp_earned
            FROM module_completions 
            WHERE user_id = %s
        ''', (user_id,))
        debug_data["module_completions"] = [dict(row) for row in cursor.fetchall()]
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('activity_completions', 'learning_activities', 'user_gamification', 'module_completions')
        """)
        debug_data["existing_tables"] = [row['table_name'] for row in cursor.fetchall()]
        
        return {"success": True, "debug_data": debug_data}
        
    except Exception as e:
        return {"success": False, "error": str(e)}, 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/debug/trigger-completion-check/<module_id>")
def trigger_completion_check(module_id):
    """Manually trigger module completion check for debugging"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    user_id = session['user_id']
    
    try:
        # Check if module is completed
        module_completed = is_module_completed(user_id, module_id)
        result = {
            "module_id": module_id,
            "is_completed": module_completed,
            "actions_taken": []
        }
        
        if module_completed:
            result["actions_taken"].append("Module marked as completed")
            
            # Trigger module completion in gamification system
            try:
                from gamification_system import gamification_system
                completion_result = gamification_system.complete_module(user_id, module_id)
                result["gamification_result"] = completion_result
                result["actions_taken"].append("Gamification module completion triggered")
                
                # Unlock next module using dynamic logic
                next_module_unlocked = unlock_next_module_dynamic(user_id, module_id)
                if next_module_unlocked:
                    result["next_module_unlocked"] = next_module_unlocked
                    result["actions_taken"].append(f"Next module unlocked: {next_module_unlocked}")
                else:
                    result["actions_taken"].append("No next module to unlock")
                    
            except Exception as e:
                result["error"] = str(e)
                result["actions_taken"].append(f"Error in completion process: {e}")
        else:
            result["actions_taken"].append("Module not yet completed")
        
        return {"success": True, "result": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/debug/unlock-status")
def debug_unlock_status():
    """Debug endpoint to check module unlock status"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        from database_postgresql import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get module completion status
        module_order = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"]
        module_status = {}
        
        for module_id in module_order:
            # Check completion
            completed = is_module_completed(user_id, module_id)
            
            # Check activities
            cursor.execute('''
                SELECT activity_type, COUNT(*) as count
                FROM learning_activities 
                WHERE user_id = %s AND module_id = %s AND completed_at IS NOT NULL
                GROUP BY activity_type
            ''', (user_id, module_id))
            
            activities = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Check assessments
            cursor.execute('''
                SELECT COUNT(*) as count, MAX(score_percentage) as best_score
                FROM user_assessment_attempts 
                WHERE user_id = %s AND module_id = %s AND is_completed = TRUE
            ''', (user_id, module_id))
            
            assessment_data = cursor.fetchone()
            assessment_count = assessment_data[0] if assessment_data else 0
            best_score = assessment_data[1] if assessment_data else 0
            
            module_status[module_id] = {
                'completed': completed,
                'activities': activities,
                'assessment_attempts': assessment_count,
                'best_assessment_score': best_score
            }
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "user_id": user_id,
            "module_status": module_status
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route("/api/debug/complete-activity/<module_id>/<activity_type>")
def debug_complete_activity(module_id, activity_type):
    """Manually complete an activity for debugging"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    user_id = session['user_id']
    
    try:
        # Complete the activity
        success = complete_learning_activity(user_id, module_id, activity_type, score=100, time_spent=60)
        
        if success:
            return {
                "success": True, 
                "message": f"Activity {activity_type} completed for module {module_id}",
                "next_step": f"Check /api/debug/module-completion for updated status"
            }
        else:
            return {"success": False, "error": "Failed to complete activity"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}, 500


# API ENDPOINTS FOR DYNAMIC DATA
# ================================

@app.route("/api/modules", methods=["GET"])
def api_get_modules():
    """Get all modules from database"""
    try:
        modules = get_modules()
        return {"success": True, "modules": modules}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/modules/<module_id>", methods=["GET"])
def api_get_module(module_id):
    """Get single module by ID"""
    try:
        module = get_module_by_id(module_id)
        if module:
            return {"success": True, "module": module}
        else:
            return {"success": False, "error": "Module not found"}, 404
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/animations/<module_id>", methods=["GET"])
def api_get_animations(module_id):
    """Get animations for a module"""
    try:
        from database_postgresql import get_animations_by_module
        animations = get_animations_by_module(module_id)
        return {"success": True, "animations": animations}
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/debug/init-gamification")
def debug_init_gamification():
    """Manually initialize gamification system"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        from gamification_system import gamification_system
        
        # Initialize the system
        gamification_system.initialize_system()
        
        # Initialize the current user
        user_id = session['user_id']
        gamification_system.initialize_user(user_id)
        
        return {
            "success": True, 
            "message": "Gamification system initialized successfully",
            "user_id": user_id
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/debug/force-complete-module/<module_id>")
def force_complete_module(module_id):
    """Force complete a module for testing"""
    if 'user_id' not in session:
        return {"success": False, "error": "Not authenticated"}, 401
    
    user_id = session['user_id']
    
    try:
        # Add multiple activities to ensure completion
        activities = ['documentation', 'animation', 'lab']
        results = []
        
        for activity in activities:
            success = complete_learning_activity(user_id, module_id, activity, score=100, time_spent=120)
            results.append(f"{activity}: {'✅' if success else '❌'}")
        
        # Check if module is now completed
        module_completed = is_module_completed(user_id, module_id)
        
        # Get updated stats
        completed_count = sum(1 for module in MODULES if is_completed(module["id"]))
        
        return {
            "success": True,
            "module_id": module_id,
            "activities_completed": results,
            "module_completed": module_completed,
            "total_completed_modules": completed_count,
            "message": f"Module {module_id} completion status: {'✅ COMPLETED' if module_completed else '❌ NOT COMPLETED'}"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.route("/api/leaderboard", methods=["GET"])
def api_get_leaderboard():
    """Get leaderboard data with real user statistics"""
    try:
        # Get all users with their gamification data
        from database_postgresql import get_db_connection
        import psycopg2.extras
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Get users with their XP, level, and completion data
        cursor.execute('''
            SELECT 
                u.id,
                u.name,
                u.username,
                COALESCE(g.total_xp, 0) as total_xp,
                COALESCE(g.level, 1) as level,
                COALESCE(g.current_streak, 0) as streak,
                COUNT(DISTINCT up.module_id) as modules_completed
            FROM users u
            LEFT JOIN user_gamification g ON u.id = g.user_id
            LEFT JOIN user_progress up ON u.id = up.user_id
            WHERE u.is_active = TRUE
            GROUP BY u.id, u.name, u.username, g.total_xp, g.level, g.current_streak
            ORDER BY COALESCE(g.total_xp, 0) DESC
            LIMIT 50
        ''')
        
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format leaderboard data
        leaderboard = []
        avatars = ['🛡️', '🔒', '⚔️', '🏆', '🔥', '⚡', '🎆', '🌟', '💪', '🥇']
        
        for i, user in enumerate(users):
            leaderboard.append({
                'rank': i + 1,
                'name': user['name'] or user['username'],
                'avatar': avatars[i % len(avatars)],
                'level': user['level'],
                'totalXP': user['total_xp'],
                'modulesCompleted': user['modules_completed'],
                'streak': user['streak'],
                'isCurrentUser': user['id'] == session.get('user_id')
            })
        
        return {
            "success": True, 
            "leaderboard": leaderboard,
            "total_users": len(leaderboard)
        }
        
    except Exception as e:
        print(f"Error getting leaderboard: {e}")
        return {"success": False, "error": str(e)}, 500

@app.route("/api/leaderboard-stats", methods=["GET"])
def api_get_leaderboard_user_stats():
    """Get current user's statistics for leaderboard"""
    user_id = session.get("user_id")
    if not user_id:
        return {"success": False, "error": "Not authenticated"}, 401
    
    try:
        # Get user data from gamification system
        gamification_profile = gamification_system.get_user_profile(user_id)
        
        # Get user basic info
        user = current_user()
        
        return {
            "success": True,
            "name": user["name"] if user else "Security Learner",
            "username": user["username"] if user else "user",
            "level": gamification_profile.get("level", 1),
            "totalXP": gamification_profile.get("total_xp", 0),
            "currentXP": gamification_profile.get("current_xp", 0),
            "modulesCompleted": len(gamification_profile.get("completed_modules", [])),
            "streak": gamification_profile.get("streak", 0),
            "achievements": len(gamification_profile.get("achievements", []))
        }
        
    except Exception as e:
        print(f"Error getting user stats: {e}")
        return {"success": False, "error": str(e)}, 500


if __name__ == "__main__":
    # For training only
    app.run(debug=Config.DEBUG, port=Config.PORT)
