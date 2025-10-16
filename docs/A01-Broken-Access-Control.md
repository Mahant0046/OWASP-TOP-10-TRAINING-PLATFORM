# A01 - Broken Access Control

## 📋 Overview

**Broken Access Control** moves up from the fifth position to become the #1 most serious web application security risk. Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data or performing a business function outside the user's limits.

### 🎯 Learning Objectives

By the end of this module, you will be able to:
- Understand different types of access control vulnerabilities
- Identify broken access control in web applications
- Implement proper authorization mechanisms
- Perform security testing for access control flaws
- Apply defense-in-depth strategies for access control

## 🔍 What is Access Control?

Access control is a security technique that regulates who or what can view or use resources in a computing environment. It is a fundamental concept in security that minimizes risk to the business or organization.

### Types of Access Control

1. **Discretionary Access Control (DAC)**
   - Resource owners decide who can access their resources
   - Common in file systems and databases

2. **Mandatory Access Control (MAC)**
   - System-enforced access control based on security labels
   - Used in high-security environments

3. **Role-Based Access Control (RBAC)**
   - Access permissions based on user roles
   - Most common in business applications

4. **Attribute-Based Access Control (ABAC)**
   - Dynamic access control based on attributes
   - Flexible and context-aware

## 🚨 Common Access Control Vulnerabilities

### 1. Insecure Direct Object References (IDOR)

**Description**: Direct access to objects based on user-supplied input without proper authorization checks.

**Example Scenario**:
```
Original URL: https://bank.com/account?id=12345
Attacker tries: https://bank.com/account?id=12346
```

**Vulnerable Code Example**:
```python
@app.route('/profile/<user_id>')
def view_profile(user_id):
    # ❌ No authorization check
    user = User.query.get(user_id)
    return render_template('profile.html', user=user)
```

**Secure Code Example**:
```python
@app.route('/profile/<user_id>')
@login_required
def view_profile(user_id):
    # ✅ Proper authorization check
    if current_user.id != user_id and not current_user.is_admin:
        abort(403)
    user = User.query.get(user_id)
    return render_template('profile.html', user=user)
```

### 2. Missing Function Level Access Control

**Description**: Applications fail to verify if the user is authorized to perform the requested function.

**Vulnerable Code Example**:
```javascript
// ❌ Client-side only check
function deleteUser(userId) {
    if (currentUser.role === 'admin') {
        fetch(`/api/users/${userId}`, { method: 'DELETE' });
    }
}
```

**Secure Code Example**:
```python
@app.route('/api/users/<user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    # ✅ Server-side authorization check
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True})
```

### 3. Privilege Escalation

**Description**: Users can access functions or data they shouldn't have access to.

**Types**:
- **Horizontal**: Access to other users' data at the same privilege level
- **Vertical**: Access to higher privilege functions or data

### 4. Path Traversal

**Description**: Attackers can access files and directories outside the web root folder.

**Example Attack**:
```
GET /download?file=../../../etc/passwd
```

**Vulnerable Code**:
```python
@app.route('/download')
def download_file():
    filename = request.args.get('file')
    # ❌ No path validation
    return send_file(f'/uploads/{filename}')
```

**Secure Code**:
```python
import os
from werkzeug.utils import secure_filename

@app.route('/download')
def download_file():
    filename = request.args.get('file')
    # ✅ Secure filename and path validation
    filename = secure_filename(filename)
    file_path = os.path.join('/uploads', filename)
    
    # Ensure file is within allowed directory
    if not os.path.commonpath(['/uploads', file_path]) == '/uploads':
        abort(403)
    
    return send_file(file_path)
```

## 🛠️ Lab Exercise: IDOR Vulnerability

### Scenario
You're testing a web application that displays user profiles. The application uses predictable user IDs in the URL.

### Your Task
1. Log in with your account (ID: 1)
2. Try to access other user profiles by changing the ID parameter
3. Document what information you can access
4. Propose a fix for the vulnerability

### Lab Environment
- **URL**: `/labs/A01`
- **Your Profile ID**: 1
- **Test IDs**: Try 2, 3, and other numbers

### Expected Findings
- You should be able to view other users' profiles
- Information disclosed may include names, emails, and salaries
- This represents a horizontal privilege escalation

## 🔧 Prevention Strategies

### 1. Implement Proper Authorization

```python
def check_authorization(user, resource, action):
    """
    Centralized authorization check
    """
    if action == 'read':
        return user.can_read(resource)
    elif action == 'write':
        return user.can_write(resource)
    elif action == 'delete':
        return user.can_delete(resource)
    return False

@app.route('/api/documents/<doc_id>')
def get_document(doc_id):
    document = Document.query.get_or_404(doc_id)
    
    # ✅ Check authorization before returning data
    if not check_authorization(current_user, document, 'read'):
        abort(403)
    
    return jsonify(document.to_dict())
```

### 2. Use Indirect Object References

```python
# ❌ Direct object reference
@app.route('/account/<account_id>')
def view_account(account_id):
    account = Account.query.get(account_id)
    return render_template('account.html', account=account)

# ✅ Indirect object reference
@app.route('/account/<account_token>')
def view_account(account_token):
    # Use unpredictable tokens instead of sequential IDs
    account = Account.query.filter_by(token=account_token).first_or_404()
    
    # Still need authorization check
    if account.user_id != current_user.id:
        abort(403)
    
    return render_template('account.html', account=account)
```

### 3. Implement Role-Based Access Control

```python
from functools import wraps

def require_role(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.has_role(role):
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/admin/users')
@login_required
@require_role('admin')
def admin_users():
    users = User.query.all()
    return render_template('admin/users.html', users=users)
```

### 4. Validate File Paths

```python
import os
from pathlib import Path

def is_safe_path(basedir, path, follow_symlinks=True):
    """
    Validate that a file path is within the allowed directory
    """
    if follow_symlinks:
        matchpath = os.path.realpath(path)
    else:
        matchpath = os.path.abspath(path)
    
    return basedir == os.path.commonpath((basedir, matchpath))

@app.route('/files/<path:filename>')
def serve_file(filename):
    basedir = '/var/www/uploads'
    file_path = os.path.join(basedir, filename)
    
    if not is_safe_path(basedir, file_path):
        abort(403)
    
    return send_file(file_path)
```

## 🧪 Testing for Access Control Flaws

### Manual Testing Techniques

1. **Parameter Manipulation**
   - Change user IDs, account numbers, or other identifiers
   - Test with different user roles and permissions

2. **URL Manipulation**
   - Try accessing admin pages as regular users
   - Test direct access to restricted functions

3. **HTTP Method Testing**
   - Try different HTTP methods (GET, POST, PUT, DELETE)
   - Some applications may have inconsistent access controls

### Automated Testing Tools

1. **Burp Suite**
   - Autorize extension for automated access control testing
   - Intruder for parameter manipulation

2. **OWASP ZAP**
   - Access Control Testing add-on
   - Automated scanning for IDOR vulnerabilities

3. **Custom Scripts**
   ```python
   import requests
   
   def test_idor(base_url, session_cookie, user_ids):
       """
       Test for IDOR vulnerabilities
       """
       headers = {'Cookie': f'session={session_cookie}'}
       vulnerable_ids = []
       
       for user_id in user_ids:
           url = f"{base_url}/profile/{user_id}"
           response = requests.get(url, headers=headers)
           
           if response.status_code == 200:
               vulnerable_ids.append(user_id)
       
       return vulnerable_ids
   ```

## 📊 Impact Assessment

### Business Impact
- **Data Breach**: Unauthorized access to sensitive information
- **Compliance Violations**: GDPR, HIPAA, PCI-DSS violations
- **Financial Loss**: Fines, legal costs, reputation damage
- **Competitive Disadvantage**: Exposure of business secrets

### Technical Impact
- **Data Integrity**: Unauthorized modification of data
- **System Availability**: Potential for system disruption
- **Audit Trail**: Compromised logging and monitoring

## 🛡️ Defense in Depth

### 1. Application Layer
- Implement proper authorization checks
- Use principle of least privilege
- Validate all user inputs

### 2. Database Layer
- Use database-level access controls
- Implement row-level security where available
- Use stored procedures with limited permissions

### 3. Network Layer
- Implement network segmentation
- Use firewalls and access control lists
- Monitor network traffic for anomalies

### 4. Infrastructure Layer
- Use container security and isolation
- Implement proper file system permissions
- Regular security updates and patches

## 📈 Real-World Examples

### Case Study 1: Facebook Photo Vulnerability (2013)
**Issue**: Users could view private photos by manipulating photo IDs
**Impact**: Millions of private photos potentially exposed
**Fix**: Implemented proper authorization checks for photo access

### Case Study 2: Uber God View (2014)
**Issue**: Employees had unrestricted access to user location data
**Impact**: Privacy violations and regulatory scrutiny
**Fix**: Implemented role-based access controls and audit logging

### Case Study 3: Capital One Data Breach (2019)
**Issue**: Misconfigured web application firewall allowed access to sensitive data
**Impact**: 100 million customer records exposed
**Fix**: Proper configuration management and access controls

## ✅ Security Checklist

### Development Phase
-  Implement authorization checks for all sensitive operations
-  Use indirect object references where possible
-  Validate file paths and prevent directory traversal
-  Implement proper session management
-  Use principle of least privilege

### Testing Phase
-  Test with different user roles and permissions
-  Perform parameter manipulation testing
-  Test direct access to restricted functions
-  Verify proper error handling for unauthorized access
-  Test file upload and download functionality

### Deployment Phase
- Configure proper file system permissions
- Implement network-level access controls
- Set up monitoring and alerting
-  Regular security assessments
-  Keep systems updated and patched

## 🔗 Additional Resources

### OWASP Resources
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [OWASP Testing Guide - Access Control](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/)

### Tools and Frameworks
- **Authorization Libraries**: Casbin, Open Policy Agent (OPA)
- **Testing Tools**: Burp Suite, OWASP ZAP, Postman
- **Monitoring**: SIEM solutions, application security monitoring

### Standards and Compliance
- **NIST Cybersecurity Framework**
- **ISO 27001/27002**
- **GDPR Article 32 - Security of Processing**

## 🎓 Knowledge Check

### Questions
1. What is the difference between authentication and authorization?
2. How can you prevent IDOR vulnerabilities?
3. What are the different types of privilege escalation?
4. How would you test for access control flaws?
5. What is the principle of least privilege?

### Practical Exercise
Design an access control system for a multi-tenant SaaS application where:
- Users belong to organizations
- Organizations have different subscription levels
- Users have different roles within organizations
- Some features are only available to premium subscribers

---

**🎯 Next Steps**: After completing this module, proceed to [A02 - Cryptographic Failures](A02-Cryptographic-Failures.md) to learn about secure cryptographic implementations.

**💡 Remember**: Access control is not just about preventing unauthorized access—it's about ensuring that authorized users can only access what they need to do their job effectively and securely.