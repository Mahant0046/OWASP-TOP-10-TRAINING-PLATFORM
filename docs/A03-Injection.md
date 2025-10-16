# A03 - Injection

## 📋 Overview

**Injection** flaws, such as SQL, NoSQL, OS, and LDAP injection, occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.

### 🎯 Learning Objectives

By the end of this module, you will be able to:
- Understand different types of injection vulnerabilities
- Identify injection flaws in web applications
- Implement proper input validation and sanitization
- Use parameterized queries and prepared statements
- Apply defense-in-depth strategies against injection attacks

## 💉 Types of Injection Vulnerabilities

### 1. SQL Injection (SQLi)

**Description**: Malicious SQL code is inserted into application queries, allowing attackers to manipulate database operations.

**Common Attack Vectors**:
- Login bypass
- Data extraction
- Data modification
- Database schema discovery

**Vulnerable Code Example**:
```python
# ❌ Vulnerable to SQL injection
def authenticate_user(username, password):
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor.execute(query)
    return cursor.fetchone()

# Attack: username = "admin'--" bypasses password check
```

**Secure Code Example**:
```python
# ✅ Using parameterized queries
def authenticate_user(username, password):
    query = "SELECT * FROM users WHERE username=? AND password=?"
    cursor.execute(query, (username, password))
    return cursor.fetchone()
```

### 2. NoSQL Injection

**Description**: Similar to SQL injection but targets NoSQL databases like MongoDB, CouchDB, etc.

**Vulnerable Code Example**:
```javascript
// ❌ Vulnerable MongoDB query
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.collection('users').findOne({
        username: username,
        password: password
    }, (err, user) => {
        if (user) {
            res.json({ success: true });
        }
    });
});

// Attack: {"username": {"$ne": null}, "password": {"$ne": null}}
```

**Secure Code Example**:
```javascript
// ✅ Proper input validation
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Validate input types
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    
    db.collection('users').findOne({
        username: username,
        password: password
    }, (err, user) => {
        if (user) {
            res.json({ success: true });
        }
    });
});
```

### 3. Command Injection

**Description**: Execution of arbitrary commands on the host operating system via vulnerable applications.

**Vulnerable Code Example**:
```python
import os

# ❌ Vulnerable to command injection
def ping_host(hostname):
    command = f"ping -c 4 {hostname}"
    result = os.system(command)
    return result

# Attack: hostname = "google.com; rm -rf /"
```

**Secure Code Example**:
```python
import subprocess
import shlex

# ✅ Using subprocess with proper validation
def ping_host(hostname):
    # Validate hostname format
    import re
    if not re.match(r'^[a-zA-Z0-9.-]+$', hostname):
        raise ValueError("Invalid hostname format")
    
    # Use subprocess with argument list
    try:
        result = subprocess.run(
            ['ping', '-c', '4', hostname],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        return "Ping timeout"
```

### 4. LDAP Injection

**Description**: Exploiting web applications that construct LDAP statements based on user input.

**Vulnerable Code Example**:
```python
# ❌ Vulnerable LDAP query
def search_user(username):
    ldap_filter = f"(uid={username})"
    return ldap_connection.search_s(base_dn, ldap.SCOPE_SUBTREE, ldap_filter)

# Attack: username = "*)(uid=*))(|(uid=*"
```

**Secure Code Example**:
```python
import ldap

# ✅ Proper LDAP escaping
def search_user(username):
    # Escape special LDAP characters
    escaped_username = ldap.filter.escape_filter_chars(username)
    ldap_filter = f"(uid={escaped_username})"
    return ldap_connection.search_s(base_dn, ldap.SCOPE_SUBTREE, ldap_filter)
```

## 🛠️ Lab Exercise: SQL Injection

### Scenario
You're testing a login form that appears to be vulnerable to SQL injection attacks.

### Your Task
1. Attempt to bypass the login using SQL injection
2. Try to extract database information
3. Document the vulnerability
4. Propose remediation steps

### Lab Environment
- **URL**: `/labs/A03`
- **Database**: SQLite with users table
- **Test Payloads**: 
  - `' OR '1'='1'--`
  - `admin'--`
  - `' UNION SELECT 1,2,3--`

### Expected Findings
- Login bypass using boolean-based injection
- Potential for data extraction using UNION queries
- Database structure disclosure

## 🔧 Prevention Techniques

### 1. Parameterized Queries/Prepared Statements

```python
import sqlite3
from typing import Optional, Dict, Any

class SecureDatabase:
    def __init__(self, db_path: str):
        self.connection = sqlite3.connect(db_path)
        self.connection.row_factory = sqlite3.Row
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Secure user authentication using parameterized query"""
        query = """
            SELECT id, username, email, role 
            FROM users 
            WHERE username = ? AND password_hash = ?
        """
        cursor = self.connection.cursor()
        cursor.execute(query, (username, self._hash_password(password)))
        result = cursor.fetchone()
        return dict(result) if result else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID with parameter binding"""
        query = "SELECT id, username, email, role FROM users WHERE id = ?"
        cursor = self.connection.cursor()
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        return dict(result) if result else None
    
    def search_users(self, search_term: str) -> list:
        """Search users with LIKE operator safely"""
        query = """
            SELECT id, username, email 
            FROM users 
            WHERE username LIKE ? OR email LIKE ?
        """
        search_pattern = f"%{search_term}%"
        cursor = self.connection.cursor()
        cursor.execute(query, (search_pattern, search_pattern))
        return [dict(row) for row in cursor.fetchall()]
```

### 2. Input Validation and Sanitization

```python
import re
from typing import Union
from html import escape

class InputValidator:
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format"""
        if not isinstance(username, str):
            return False
        
        # Allow alphanumeric, underscore, hyphen (3-20 chars)
        pattern = r'^[a-zA-Z0-9_-]{3,20}$'
        return bool(re.match(pattern, username))
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not isinstance(email, str):
            return False
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def sanitize_html(input_text: str) -> str:
        """Sanitize HTML input"""
        if not isinstance(input_text, str):
            return ""
        
        # Escape HTML entities
        return escape(input_text)
    
    @staticmethod
    def validate_integer(value: Union[str, int], min_val: int = None, max_val: int = None) -> bool:
        """Validate integer input with optional range"""
        try:
            int_value = int(value)
            if min_val is not None and int_value < min_val:
                return False
            if max_val is not None and int_value > max_val:
                return False
            return True
        except (ValueError, TypeError):
            return False

# Usage example
def process_user_input(username: str, email: str, age: str):
    validator = InputValidator()
    
    if not validator.validate_username(username):
        raise ValueError("Invalid username format")
    
    if not validator.validate_email(email):
        raise ValueError("Invalid email format")
    
    if not validator.validate_integer(age, min_val=13, max_val=120):
        raise ValueError("Invalid age")
    
    # Process validated input...
```

### 3. Stored Procedures (Database Level)

```sql
-- ✅ Secure stored procedure for user authentication
DELIMITER //
CREATE PROCEDURE AuthenticateUser(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255)
)
BEGIN
    SELECT id, username, email, role
    FROM users
    WHERE username = p_username 
    AND password_hash = p_password_hash
    AND is_active = 1;
END //
DELIMITER ;
```

```python
# Using stored procedure from Python
def authenticate_with_stored_procedure(username: str, password: str):
    cursor = connection.cursor()
    password_hash = hash_password(password)
    
    cursor.callproc('AuthenticateUser', [username, password_hash])
    result = cursor.fetchone()
    return result
```

### 4. ORM Usage (Object-Relational Mapping)

```python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)

class UserService:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def authenticate_user(self, username: str, password: str):
        """Secure authentication using ORM"""
        password_hash = self._hash_password(password)
        
        # ORM automatically handles parameterization
        user = self.session.query(User).filter(
            User.username == username,
            User.password_hash == password_hash
        ).first()
        
        return user
    
    def search_users(self, search_term: str):
        """Search users safely with ORM"""
        return self.session.query(User).filter(
            User.username.like(f"%{search_term}%")
        ).all()
```

## 🧪 Testing for Injection Vulnerabilities

### 1. Manual Testing Payloads

**SQL Injection Test Cases**:
```
# Authentication bypass
' OR '1'='1'--
' OR 1=1--
admin'--
' OR 'a'='a

# Union-based injection
' UNION SELECT 1,2,3--
' UNION SELECT null,username,password FROM users--

# Boolean-based blind injection
' AND 1=1--
' AND 1=2--

# Time-based blind injection
'; WAITFOR DELAY '00:00:05'--
' OR SLEEP(5)--
```

**Command Injection Test Cases**:
```
; ls -la
| whoami
& ping -c 4 127.0.0.1
`id`
$(whoami)
```

**NoSQL Injection Test Cases**:
```javascript
{"$ne": null}
{"$gt": ""}
{"$where": "this.username == this.username"}
{"$regex": ".*"}
```

### 2. Automated Testing Tools

```python
import requests
import time

class InjectionTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_sql_injection(self, endpoint: str, parameters: dict):
        """Test for SQL injection vulnerabilities"""
        sql_payloads = [
            "' OR '1'='1'--",
            "' UNION SELECT 1,2,3--",
            "'; DROP TABLE users;--",
            "' AND SLEEP(5)--"
        ]
        
        vulnerabilities = []
        
        for param_name, param_value in parameters.items():
            for payload in sql_payloads:
                test_params = parameters.copy()
                test_params[param_name] = payload
                
            start_time = time.time()
                response = self.session.post(f"{self.base_url}/{endpoint}", data=test_params)
                response_time = time.time() - start_time
                
                # Check for SQL error messages
                error_indicators = [
                    "sql syntax",
                    "mysql_fetch",
                    "ORA-",
                    "Microsoft OLE DB",
                    "SQLite error"
                ]
                
                if any(indicator in response.text.lower() for indicator in error_indicators):
                    vulnerabilities.append({
                        'parameter': param_name,
                        'payload': payload,
                        'type': 'SQL Injection',
                        'evidence': 'Database error in response'
                    })
                
                # Check for time-based injection
                if "SLEEP" in payload and response_time > 4:
                    vulnerabilities.append({
                        'parameter': param_name,
                        'payload': payload,
                        'type': 'Time-based SQL Injection',
                        'evidence': f'Response time: {response_time:.2f}s'
                    })
        
        return vulnerabilities
    
    def test_command_injection(self, endpoint: str, parameters: dict):
        """Test for command injection vulnerabilities"""
        command_payloads = [
            "; ls -la",
            "| whoami",
            "& ping -c 1 127.0.0.1",
            "`id`"
        ]
        
        vulnerabilities = []
        
        for param_name, param_value in parameters.items():
            for payload in command_payloads:
                test_params = parameters.copy()
                test_params[param_name] = f"{param_value}{payload}"
                
                response = self.session.post(f"{self.base_url}/{endpoint}", data=test_params)
                
                # Check for command output indicators
                command_indicators = [
                    "uid=",
                    "gid=",
                    "total ",
                    "PING",
                    "64 bytes from"
                ]
                
                if any(indicator in response.text for indicator in command_indicators):
                    vulnerabilities.append({
                        'parameter': param_name,
                        'payload': payload,
                        'type': 'Command Injection',
                        'evidence': 'Command output in response'
                    })
        
        return vulnerabilities
```

## 📊 Impact Assessment

### Business Impact
- **Data Breach**: Complete database compromise
- **Data Manipulation**: Unauthorized data modification or deletion
- **System Compromise**: Potential server takeover
- **Compliance Violations**: Regulatory penalties
- **Business Disruption**: Service unavailability

### Technical Impact
- **Database Compromise**: Full access to sensitive data
- **System Access**: Potential for privilege escalation
- **Data Integrity**: Corruption or loss of critical data
- **Service Availability**: Denial of service attacks

## 🛡️ Defense in Depth Strategy

### 1. Application Layer
```python
class SecureApplication:
    def __init__(self):
        self.validator = InputValidator()
        self.db = SecureDatabase()
    
    def process_login(self, username: str, password: str):
        # Layer 1: Input validation
        if not self.validator.validate_username(username):
            raise ValueError("Invalid username format")
        
        # Layer 2: Sanitization
        username = self.validator.sanitize_input(username)
        
        # Layer 3: Parameterized query
        user = self.db.authenticate_user(username, password)
        
        # Layer 4: Output encoding
        if user:
            return {
                'username': escape(user['username']),
                'email': escape(user['email'])
            }
        
        return None
```

### 2. Database Layer
```sql
-- Create user with limited privileges
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON myapp.users TO 'app_user'@'localhost';
GRANT SELECT ON myapp.products TO 'app_user'@'localhost';

-- Revoke dangerous permissions
REVOKE FILE ON *.* FROM 'app_user'@'localhost';
REVOKE PROCESS ON *.* FROM 'app_user'@'localhost';
```

### 3. Network Layer
- Use Web Application Firewalls (WAF)
- Implement rate limiting
- Monitor for suspicious patterns

## ✅ Security Checklist

### Development Phase
- [ ] Use parameterized queries for all database operations
- [ ] Implement comprehensive input validation
- [ ] Use ORM frameworks where appropriate
- [ ] Avoid dynamic query construction
- [ ] Implement proper error handling

### Testing Phase
- [ ] Test all input fields for injection vulnerabilities
- [ ] Use automated scanning tools
- [ ] Perform manual penetration testing
- [ ] Test with various payload types
- [ ] Verify input validation effectiveness

### Deployment Phase
- [ ] Configure database with least privilege
- [ ] Implement Web Application Firewall
- [ ] Set up monitoring and alerting
- [ ] Regular security assessments
- [ ] Keep frameworks and libraries updated

## 🎓 Knowledge Check

### Questions
1. What's the difference between SQL injection and NoSQL injection?
2. How do parameterized queries prevent injection attacks?
3. What is the principle of least privilege in database security?
4. How can you test for blind SQL injection?
5. What are the limitations of input validation as a security control?

---

**🎯 Next Steps**: After completing this module, proceed to [A04 - Insecure Design](A04-Insecure-Design.md) to learn about secure design principles and threat modeling.

**💡 Remember**: Injection vulnerabilities are among the most dangerous and common web application flaws. Always validate input, use parameterized queries, and apply defense in depth.