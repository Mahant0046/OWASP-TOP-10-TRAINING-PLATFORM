# A07 - Identification and Authentication Failures

## 📋 Overview

**Identification and Authentication Failures** occur when application functions related to authentication and session management are implemented incorrectly, allowing attackers to compromise passwords, keys, or session tokens.

### 🎯 Learning Objectives

- Understand authentication vulnerabilities
- Implement secure authentication mechanisms
- Design proper session management
- Apply multi-factor authentication
- Prevent credential-based attacks

## 🚨 Common Authentication Failures

### 1. Weak Password Policies

**Vulnerable Example**:
```python
# ❌ Weak password validation
def validate_password(password):
    return len(password) >= 6
```

**Secure Example**:
```python
# ✅ Strong password validation
import re

def validate_password(password):
    if len(password) < 12:
        return False, "Password must be at least 12 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain special character"
    
    return True, "Password is valid"
```

### 2. Session Management Issues

**Vulnerable Example**:
```python
# ❌ Predictable session IDs
import time
session_id = str(int(time.time()))
```

**Secure Example**:
```python
# ✅ Secure session management
import secrets
from datetime import datetime, timedelta

class SessionManager:
    def __init__(self):
        self.sessions = {}
    
    def create_session(self, user_id):
        session_id = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=2)
        
        self.sessions[session_id] = {
            'user_id': user_id,
            'created_at': datetime.utcnow(),
            'expires_at': expires_at,
            'last_activity': datetime.utcnow()
        }
        
        return session_id
    
    def validate_session(self, session_id):
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        if datetime.utcnow() > session['expires_at']:
            del self.sessions[session_id]
            return False
        
        # Update last activity
        session['last_activity'] = datetime.utcnow()
        return True
```

## 🛠️ Lab Exercise: Authentication Bypass

### Scenario
Test an authentication system with weak implementation.

### Your Task
1. Attempt to bypass authentication
2. Test session management
3. Analyze password policies
4. Document vulnerabilities

### Lab Environment
- **URL**: `/labs/A07`
- **Test Cases**: Username enumeration, weak passwords, session fixation

## 🔧 Secure Authentication Implementation

### 1. Multi-Factor Authentication

```python
import pyotp
import qrcode
from io import BytesIO

class MFAManager:
    def setup_totp(self, user):
        secret = pyotp.random_base32()
        user.mfa_secret = secret
    
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="MyApp"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        return img, secret
    
    def verify_totp(self, user, token):
        totp = pyotp.TOTP(user.mfa_secret)
        return totp.verify(token, valid_window=1)
```

### 2. Account Lockout Protection

```python
from datetime import datetime, timedelta

class AccountLockout:
    def __init__(self):
        self.failed_attempts = {}
        self.lockout_duration = timedelta(minutes=15)
        self.max_attempts = 5
    
    def record_failed_attempt(self, username):
        now = datetime.utcnow()
        
        if username not in self.failed_attempts:
            self.failed_attempts[username] = []
        
        # Clean old attempts
        cutoff = now - timedelta(hours=1)
        self.failed_attempts[username] = [
            attempt for attempt in self.failed_attempts[username]
            if attempt > cutoff
        ]
        
        self.failed_attempts[username].append(now)
    
    def is_locked(self, username):
        if username not in self.failed_attempts:
            return False
        
        recent_attempts = len(self.failed_attempts[username])
        if recent_attempts >= self.max_attempts:
            last_attempt = max(self.failed_attempts[username])
            return datetime.utcnow() < last_attempt + self.lockout_duration
        
        return False
    
    def clear_attempts(self, username):
        if username in self.failed_attempts:
            del self.failed_attempts[username]
```

## ✅ Security Checklist

### Authentication
-  Implement strong password policies
-  Use secure password hashing (bcrypt, Argon2)
-  Implement account lockout protection
-  Support multi-factor authentication
-  Prevent username enumeration

### Session Management
-  Generate cryptographically secure session IDs
-  Implement proper session timeout
-  Secure session storage
-  Regenerate session IDs after login
-  Implement secure logout

---

**🎯 Next Steps**: Proceed to [A08 - Software and Data Integrity Failures](A08-Software-Data-Integrity-Failures.md).