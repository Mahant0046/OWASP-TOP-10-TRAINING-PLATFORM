"""
Enhanced Authentication Security Module
Provides strong authentication, password policies, and security features
"""

import re
import secrets
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from database_postgresql import get_db_connection, get_dict_cursor
from config import Config

# Email imports with fallback for different Python versions
try:
    import smtplib
    import email.mime.text
    import email.mime.multipart
    from email.mime.text import MIMEText as MimeText
    from email.mime.multipart import MIMEMultipart as MimeMultipart
    EMAIL_AVAILABLE = True
    print("✅ Email functionality available - SMTP ready")
except ImportError as e:
    EMAIL_AVAILABLE = False
    print(f"❌ Email functionality not available - using console logging for password resets. Error: {e}")

class PasswordPolicy:
    """Password strength and policy enforcement"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, list]:
        """Validate password against policy requirements"""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be no more than {cls.MAX_LENGTH} characters long")
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if cls.REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if cls.REQUIRE_SPECIAL and not re.search(f'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            errors.append(f"Password must contain at least one special character ({cls.SPECIAL_CHARS})")
        
        # Check for common weak patterns
        if re.search(r'(.)\1{2,}', password):  # Three or more consecutive identical characters
            errors.append("Password cannot contain three or more consecutive identical characters")
        
        # Check for common sequences
        weak_patterns = ['123', 'abc', 'qwe', 'password', 'admin', 'user']
        password_lower = password.lower()
        for pattern in weak_patterns:
            if pattern in password_lower:
                errors.append(f"Password cannot contain common patterns like '{pattern}'")
        
        return len(errors) == 0, errors
    
    @classmethod
    def get_strength_score(cls, password: str) -> int:
        """Calculate password strength score (0-100)"""
        score = 0
        
        # Length bonus
        score += min(25, len(password) * 2)
        
        # Character variety bonus
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if re.search(f'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            score += 15
        
        # Complexity bonus
        unique_chars = len(set(password))
        score += min(20, unique_chars * 2)
        
        # Penalty for common patterns
        if re.search(r'(.)\1{2,}', password):
            score -= 10
        
        return min(100, max(0, score))

class AuthSecurity:
    """Enhanced authentication security manager"""
    
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    TOKEN_EXPIRY_HOURS = 24
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against bcrypt hash with fallback for legacy hashes"""
        try:
            # Try bcrypt first (new format)
            if hashed.startswith('$2b$'):
                return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            pass
        
        # Fallback to legacy hash formats
        try:
            # SHA-1 (40 characters)
            if len(hashed) == 40:
                return hashlib.sha1(password.encode()).hexdigest() == hashed
            # SHA-256 (64 characters)
            elif len(hashed) == 64:
                return hashlib.sha256(password.encode()).hexdigest() == hashed
        except Exception:
            pass
        
        return False
    
    @staticmethod
    def generate_secure_token() -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def log_login_attempt(username: str, ip_address: str, user_agent: str, 
                         success: bool, failure_reason: str = None):
        """Log login attempt for security monitoring"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                INSERT INTO login_attempts (username, ip_address, user_agent, success, failure_reason)
                VALUES (%s, %s, %s, %s, %s)
            """, (username, ip_address, user_agent, success, failure_reason))
            conn.commit()
        except Exception as e:
            print(f"Error logging login attempt: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def check_account_lockout(username: str) -> Tuple[bool, Optional[datetime]]:
        """Check if account is locked due to failed attempts"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                SELECT failed_login_attempts, account_locked_until
                FROM users 
                WHERE username = %s
            """, (username,))
            
            result = cursor.fetchone()
            if not result:
                return False, None
            
            failed_attempts = result['failed_login_attempts'] or 0
            locked_until = result['account_locked_until']
            
            # Check if account is currently locked
            if locked_until and datetime.now() < locked_until:
                return True, locked_until
            
            # Reset lock if expired
            if locked_until and datetime.now() >= locked_until:
                cursor.execute("""
                    UPDATE users 
                    SET failed_login_attempts = 0, account_locked_until = NULL
                    WHERE username = %s
                """, (username,))
                conn.commit()
            
            return False, None
            
        except Exception as e:
            print(f"Error checking account lockout: {e}")
            return False, None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def handle_failed_login(username: str):
        """Handle failed login attempt and apply lockout if necessary"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Increment failed attempts
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
                WHERE username = %s
                RETURNING failed_login_attempts
            """, (username,))
            
            result = cursor.fetchone()
            if result:
                failed_attempts = result['failed_login_attempts']
                
                # Lock account if max attempts reached
                if failed_attempts >= AuthSecurity.MAX_LOGIN_ATTEMPTS:
                    lockout_until = datetime.now() + timedelta(minutes=AuthSecurity.LOCKOUT_DURATION_MINUTES)
                    cursor.execute("""
                        UPDATE users 
                        SET account_locked_until = %s
                        WHERE username = %s
                    """, (lockout_until, username))
            
            conn.commit()
            
        except Exception as e:
            print(f"Error handling failed login: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def handle_successful_login(username: str):
        """Handle successful login - reset failed attempts and update last login"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                UPDATE users 
                SET failed_login_attempts = 0, 
                    account_locked_until = NULL,
                    last_login = CURRENT_TIMESTAMP
                WHERE username = %s
            """, (username,))
            conn.commit()
            
        except Exception as e:
            print(f"Error handling successful login: {e}")
            conn.rollback()
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def create_password_reset_token(user_id: int, ip_address: str = None) -> str:
        """Create password reset token"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            # Invalidate existing tokens
            cursor.execute("""
                UPDATE password_reset_tokens 
                SET used = TRUE 
                WHERE user_id = %s AND used = FALSE
            """, (user_id,))
            
            # Create new token
            token = AuthSecurity.generate_secure_token()
            expires_at = datetime.now() + timedelta(hours=AuthSecurity.TOKEN_EXPIRY_HOURS)
            
            cursor.execute("""
                INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
                VALUES (%s, %s, %s, %s)
            """, (user_id, token, expires_at, ip_address))
            
            conn.commit()
            return token
            
        except Exception as e:
            print(f"Error creating password reset token: {e}")
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def verify_password_reset_token(token: str) -> Optional[int]:
        """Verify password reset token and return user_id if valid"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                SELECT user_id, expires_at, used
                FROM password_reset_tokens
                WHERE token = %s
            """, (token,))
            
            result = cursor.fetchone()
            if not result:
                return None
            
            if result['used']:
                return None
            
            if datetime.now() > result['expires_at']:
                return None
            
            return result['user_id']
            
        except Exception as e:
            print(f"Error verifying password reset token: {e}")
            return None
        finally:
            cursor.close()
            conn.close()
    
    @staticmethod
    def use_password_reset_token(token: str) -> bool:
        """Mark password reset token as used"""
        conn = get_db_connection()
        cursor = get_dict_cursor(conn)
        
        try:
            cursor.execute("""
                UPDATE password_reset_tokens 
                SET used = TRUE 
                WHERE token = %s AND used = FALSE
            """, (token,))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except Exception as e:
            print(f"Error using password reset token: {e}")
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

class EmailService:
    """Email service for password reset and verification"""
    
    @staticmethod
    def send_password_reset_email(email: str, username: str, reset_token: str) -> bool:
        """Send password reset email"""
        try:
            reset_url = f"http://localhost:{Config.PORT}/reset-password?token={reset_token}"
            
            # Email content
            subject = f"Password Reset - {Config.APP_NAME}"
            email_body = f"""Dear {username},

You have requested to reset your password for your {Config.APP_NAME} account.

Please click the following link to reset your password:
{reset_url}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email.

Best regards,
{Config.APP_NAME} Team"""
            
            # Try to send real email if enabled and configured
            if Config.EMAIL_ENABLED and Config.SMTP_USERNAME and Config.SMTP_PASSWORD and EMAIL_AVAILABLE:
                try:
                    # Create message
                    msg = MimeMultipart()
                    msg['From'] = Config.SMTP_USERNAME
                    msg['To'] = email
                    msg['Subject'] = subject
                    
                    # Add body to email
                    msg.attach(MimeText(email_body, 'plain'))
                    
                    # Create SMTP session
                    server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
                    if Config.SMTP_USE_TLS:
                        server.starttls()  # Enable security
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                    
                    # Send email
                    text = msg.as_string()
                    server.sendmail(Config.SMTP_USERNAME, email, text)
                    server.quit()
                    
                    print(f"✅ Password reset email sent successfully to {email}")
                    return True
                    
                except Exception as smtp_error:
                    print(f"❌ Failed to send email via SMTP: {smtp_error}")
                    print("📧 Falling back to console logging...")
                    # Fall through to console logging
            
            # Console logging (fallback or when email is disabled)
            print("=" * 60)
            print("📧 PASSWORD RESET EMAIL")
            print("=" * 60)
            print(f"To: {email}")
            print(f"Subject: {subject}")
            print()
            print(email_body)
            print("=" * 60)
            
            if not Config.EMAIL_ENABLED:
                print("💡 Email is disabled. Set EMAIL_ENABLED=True in .env to send real emails.")
            elif not Config.SMTP_USERNAME or not Config.SMTP_PASSWORD:
                print("💡 SMTP credentials not configured. Check SMTP_USERNAME and SMTP_PASSWORD in .env")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in password reset email function: {e}")
            return False
    
    @staticmethod
    def send_welcome_email(email: str, username: str) -> bool:
        """Send welcome email to new users"""
        try:
            # Email content
            subject = f"Welcome to {Config.APP_NAME}!"
            email_body = f"""Dear {username},

Welcome to {Config.APP_NAME}! 🎉

Your account has been successfully created and you're now ready to start your cybersecurity learning journey.

Here's what you can do next:
• Explore the OWASP Top 10 security vulnerabilities
• Complete hands-on labs and earn XP points
• Track your progress and unlock achievements
• Learn through interactive content and real-world examples

Visit your dashboard to get started: http://localhost:{Config.PORT}/dashboard

If you have any questions or need help, feel free to reach out to us.

Happy learning!
The {Config.APP_NAME} Team

---
This email was sent because you registered for an account on {Config.APP_NAME}.
If you didn't create this account, please contact us immediately."""
            
            # Try to send real email if enabled and configured
            if Config.EMAIL_ENABLED and Config.SMTP_USERNAME and Config.SMTP_PASSWORD and EMAIL_AVAILABLE:
                try:
                    print(f"🔄 Attempting to send welcome email to {email}...")
                    print(f"📧 SMTP Server: {Config.SMTP_SERVER}:{Config.SMTP_PORT}")
                    print(f"📧 From: {Config.SMTP_USERNAME}")
                    
                    # Create message
                    msg = MimeMultipart()
                    msg['From'] = Config.SMTP_USERNAME
                    msg['To'] = email
                    msg['Subject'] = subject
                    
                    # Add body to email
                    msg.attach(MimeText(email_body, 'plain'))
                    
                    # Create SMTP session
                    print("🔗 Connecting to SMTP server...")
                    server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
                    
                    if Config.SMTP_USE_TLS:
                        print("🔒 Starting TLS encryption...")
                        server.starttls()  # Enable security
                    
                    print("🔑 Authenticating with SMTP server...")
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
                    
                    # Send email
                    print("📤 Sending email...")
                    text = msg.as_string()
                    result = server.sendmail(Config.SMTP_USERNAME, email, text)
                    server.quit()
                    
                    if result:
                        print(f"⚠️ SMTP returned warnings: {result}")
                    
                    print(f"✅ Welcome email sent successfully to {email}")
                    print("💡 Check your Gmail inbox (and spam folder) in a few minutes")
                    return True
                    
                except Exception as smtp_error:
                    print(f"❌ Failed to send welcome email via SMTP: {smtp_error}")
                    print(f"❌ Error type: {type(smtp_error).__name__}")
                    print("📧 Falling back to console logging...")
                    # Fall through to console logging
            
            # Console logging (fallback or when email is disabled)
            print("=" * 60)
            print("📧 WELCOME EMAIL")
            print("=" * 60)
            print(f"To: {email}")
            print(f"Subject: {subject}")
            print()
            print(email_body)
            print("=" * 60)
            
            if not Config.EMAIL_ENABLED:
                print("💡 Email is disabled. Set EMAIL_ENABLED=True in .env to send real emails.")
            elif not Config.SMTP_USERNAME or not Config.SMTP_PASSWORD:
                print("💡 SMTP credentials not configured. Check SMTP_USERNAME and SMTP_PASSWORD in .env")
            
            return True
            
        except Exception as e:
            print(f"❌ Error in welcome email function: {e}")
            return False

def get_client_ip(request):
    """Get client IP address from request"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
    elif request.environ.get('HTTP_X_REAL_IP'):
        return request.environ['HTTP_X_REAL_IP']
    else:
        return request.environ.get('REMOTE_ADDR', 'unknown')

def get_user_agent(request):
    """Get user agent from request"""
    return request.environ.get('HTTP_USER_AGENT', 'unknown')
