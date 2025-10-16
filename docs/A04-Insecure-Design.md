# A04 - Insecure Design

## 📋 Overview

**Insecure Design** is a new category in OWASP Top 10 2021, focusing on risks related to design and architectural flaws. It represents missing or ineffective control design, different from insecure implementation where the design may be perfect but implementation is flawed.

## 🎯 Learning Objectives

By the end of this module, you will:
- Understand the difference between insecure design and insecure implementation
- Identify common design flaws in applications
- Learn secure design principles and patterns
- Apply threat modeling techniques
- Implement security by design methodologies

## 🏗️ What is Insecure Design?

Insecure design refers to fundamental flaws in the application's architecture and design that cannot be fixed by perfect implementation. It's about missing security controls or ineffective security control design.

### Key Concepts:
- **Secure Design**: Proactive approach to security in design phase
- **Threat Modeling**: Systematic approach to identifying threats
- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Minimal access rights
- **Fail Secure**: System fails to a secure state

## 🚨 Common Insecure Design Patterns

### 1. **Missing Security Controls**
Critical security features not designed into the system.

**Examples:**
- No rate limiting on password reset
- Missing multi-factor authentication for sensitive operations
- No account lockout mechanism
- Absence of audit logging

### 2. **Insufficient Business Logic Validation**
Flawed business rules that can be exploited.

**Examples:**
```python
# Insecure: No validation of business rules
def transfer_money(from_account, to_account, amount):
    # Missing checks:
    # - Sufficient balance
    # - Account ownership
    # - Transfer limits
    # - Account status (active/frozen)
    
    from_account.balance -= amount
    to_account.balance += amount
    return True
```

### 3. **Weak Authentication Design**
Inadequate authentication mechanisms.

**Examples:**
- Security questions with easily guessable answers
- Password reset tokens that don't expire
- Single-factor authentication for high-value operations
- Predictable session tokens

### 4. **Inadequate Authorization Model**
Flawed permission and access control design.

**Examples:**
```java
// Insecure: Role-based access without context
public boolean canAccessDocument(User user, Document doc) {
    return user.hasRole("MANAGER");  // Too broad!
}

// Better: Attribute-based access control
public boolean canAccessDocument(User user, Document doc) {
    return user.hasRole("MANAGER") && 
           user.getDepartment().equals(doc.getDepartment()) &&
           doc.getClassification().isAccessibleTo(user.getClearanceLevel());
}
```

### 5. **Insecure Workflow Design**
Business processes that can be manipulated.

**Examples:**
- Order processing without inventory checks
- Multi-step processes without state validation
- Approval workflows that can be bypassed

## 🛠️ Design Vulnerability Examples

### 1. **Race Condition in Financial Transaction**
```python
# Vulnerable design - race condition possible
class BankAccount:
    def __init__(self, balance):
        self.balance = balance
    
    def withdraw(self, amount):
        # Race condition: Multiple simultaneous withdrawals
        if self.balance >= amount:
            time.sleep(0.1)  # Simulating processing time
            self.balance -= amount
            return True
        return False

# Attack scenario: Two simultaneous $100 withdrawals from $100 account
# Both checks pass, both withdrawals succeed, balance becomes -$100
```

**Secure Design:**
```python
import threading

class SecureBankAccount:
    def __init__(self, balance):
        self.balance = balance
        self.lock = threading.Lock()
    
    def withdraw(self, amount):
        with self.lock:  # Atomic operation
            if self.balance >= amount:
                self.balance -= amount
                return True
            return False
```

### 2. **Inadequate Rate Limiting Design**
```javascript
// Insecure: No rate limiting on password reset
app.post('/reset-password', (req, res) => {
    const email = req.body.email;
    
    // Vulnerability: Attacker can spam password resets
    sendPasswordResetEmail(email);
    res.json({message: 'Reset email sent'});
});
```

**Secure Design:**
```javascript
const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    message: 'Too many password reset attempts',
    standardHeaders: true,
    legacyHeaders: false,
});

app.post('/reset-password', resetPasswordLimiter, (req, res) => {
    const email = req.body.email;
    
    // Additional security: CAPTCHA after first attempt
    if (req.rateLimit.remaining < 2 && !req.body.captcha) {
        return res.status(400).json({error: 'CAPTCHA required'});
    }
    
    sendPasswordResetEmail(email);
    res.json({message: 'Reset email sent'});
});
```

### 3. **Flawed Multi-Step Process**
```python
# Insecure: E-commerce checkout without proper state management
class ShoppingCart:
    def __init__(self):
        self.items = []
        self.total = 0
    
    def add_item(self, item, price):
        self.items.append(item)
        self.total += price
    
    def checkout(self, payment_info):
        # Vulnerability: No validation of cart state
        # Attacker could modify items/prices between add and checkout
        return process_payment(self.total, payment_info)
```

**Secure Design:**
```python
import hashlib
import json

class SecureShoppingCart:
    def __init__(self):
        self.items = []
        self.total = 0
        self.cart_hash = None
    
    def add_item(self, item, price):
        # Validate price against product database
        if not self.validate_price(item, price):
            raise ValueError("Invalid price")
        
        self.items.append({'item': item, 'price': price})
        self.total += price
        self.update_cart_hash()
    
    def update_cart_hash(self):
        cart_data = json.dumps(self.items, sort_keys=True)
        self.cart_hash = hashlib.sha256(cart_data.encode()).hexdigest()
    
    def checkout(self, payment_info, provided_hash):
        # Verify cart integrity
        if provided_hash != self.cart_hash:
            raise ValueError("Cart has been tampered with")
        
        # Re-validate all prices before payment
        for item_data in self.items:
            if not self.validate_price(item_data['item'], item_data['price']):
                raise ValueError("Price validation failed")
        
        return process_payment(self.total, payment_info)
```

## 🔒 Secure Design Principles

### 1. **Defense in Depth**
Multiple layers of security controls.

```python
class SecureUserRegistration:
    def register_user(self, user_data):
        # Layer 1: Input validation
        self.validate_input(user_data)
        
        # Layer 2: Business rule validation
        self.validate_business_rules(user_data)
        
        # Layer 3: Rate limiting
        self.check_rate_limits(user_data['ip'])
        
        # Layer 4: CAPTCHA verification
        self.verify_captcha(user_data['captcha'])
        
        # Layer 5: Email verification
        verification_token = self.create_verification_token()
        
        # Layer 6: Audit logging
        self.log_registration_attempt(user_data)
        
        return self.create_user(user_data, verification_token)
```

### 2. **Fail Secure**
System should fail to a secure state.

```java
public class SecureFileAccess {
    public boolean canAccessFile(User user, String filename) {
        try {
            // Check user permissions
            if (user == null || !user.isAuthenticated()) {
                return false;  // Fail secure
            }
            
            // Check file permissions
            FilePermissions perms = getFilePermissions(filename);
            if (perms == null) {
                return false;  // Fail secure - unknown permissions
            }
            
            return perms.isAccessibleBy(user);
            
        } catch (Exception e) {
            // Log error but fail secure
            logger.error("Error checking file access", e);
            return false;  // Fail secure
        }
    }
}
```

### 3. **Principle of Least Privilege**
Grant minimum necessary permissions.

```python
class RoleBasedAccess:
    def __init__(self):
        self.permissions = {
            'guest': ['read_public'],
            'user': ['read_public', 'read_own', 'write_own'],
            'moderator': ['read_public', 'read_own', 'write_own', 'moderate_content'],
            'admin': ['read_all', 'write_all', 'delete_all', 'manage_users']
        }
    
    def has_permission(self, user_role, action, resource_owner=None, user_id=None):
        user_perms = self.permissions.get(user_role, [])
        
        # Check specific permissions
        if action == 'read':
            if 'read_all' in user_perms:
                return True
            elif 'read_own' in user_perms and resource_owner == user_id:
                return True
            elif 'read_public' in user_perms and resource_owner is None:
                return True
        
        return False
```

## 🎯 Threat Modeling

### STRIDE Methodology
**S**poofing, **T**ampering, **R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege

```python
class ThreatModel:
    def analyze_login_system(self):
        threats = {
            'Spoofing': [
                'Attacker impersonates legitimate user',
                'Weak authentication mechanisms',
                'Session hijacking'
            ],
            'Tampering': [
                'Password database modification',
                'Session token manipulation',
                'Login form tampering'
            ],
            'Repudiation': [
                'User denies login activity',
                'Insufficient audit logging',
                'Non-attributable actions'
            ],
            'Information_Disclosure': [
                'Password exposure in logs',
                'Timing attacks on login',
                'User enumeration'
            ],
            'Denial_of_Service': [
                'Account lockout attacks',
                'Resource exhaustion',
                'Brute force attacks'
            ],
            'Elevation_of_Privilege': [
                'Privilege escalation bugs',
                'Role manipulation',
                'Authorization bypass'
            ]
        }
        
        return self.prioritize_threats(threats)
```

### Attack Tree Analysis
```
Goal: Unauthorized Access to Admin Panel
├── Credential Compromise
│   ├── Brute Force Attack
│   │   ├── No Rate Limiting [HIGH RISK]
│   │   └── Weak Password Policy [MEDIUM RISK]
│   ├── Social Engineering
│   │   ├── Phishing Attack [MEDIUM RISK]
│   │   └── Password Reset Manipulation [HIGH RISK]
│   └── Technical Attack
│       ├── SQL Injection [HIGH RISK]
│       └── Session Hijacking [MEDIUM RISK]
├── Authorization Bypass
│   ├── Direct URL Access [HIGH RISK]
│   ├── Parameter Tampering [MEDIUM RISK]
│   └── Role Manipulation [HIGH RISK]
└── System Vulnerability
    ├── Unpatched Software [MEDIUM RISK]
    └── Misconfiguration [HIGH RISK]
```

## 🧪 Secure Design Patterns

### 1. **Command Pattern for Audit Trail**
```python
from abc import ABC, abstractmethod
from datetime import datetime

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass
    
    @abstractmethod
    def get_audit_info(self):
        pass

class TransferMoneyCommand(Command):
    def __init__(self, from_account, to_account, amount, user):
        self.from_account = from_account
        self.to_account = to_account
        self.amount = amount
        self.user = user
        self.timestamp = datetime.now()
    
    def execute(self):
        # Validate business rules
        if self.from_account.balance < self.amount:
            raise ValueError("Insufficient funds")
        
        if self.amount <= 0:
            raise ValueError("Invalid amount")
        
        # Execute transfer
        self.from_account.balance -= self.amount
        self.to_account.balance += self.amount
        
        # Log the transaction
        audit_logger.log(self.get_audit_info())
    
    def get_audit_info(self):
        return {
            'action': 'money_transfer',
            'user': self.user.id,
            'from_account': self.from_account.id,
            'to_account': self.to_account.id,
            'amount': self.amount,
            'timestamp': self.timestamp
        }
```

### 2. **State Machine for Workflow Security**
```python
from enum import Enum

class OrderState(Enum):
    CART = "cart"
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class SecureOrder:
    def __init__(self):
        self.state = OrderState.CART
        self.items = []
        self.total = 0
    
    def add_item(self, item, price):
        if self.state != OrderState.CART:
            raise ValueError("Cannot modify order after checkout")
        
        self.items.append({'item': item, 'price': price})
        self.total += price
    
    def checkout(self):
        if self.state != OrderState.CART:
            raise ValueError("Invalid state transition")
        
        if not self.items:
            raise ValueError("Cannot checkout empty cart")
        
        self.state = OrderState.PENDING_PAYMENT
    
    def process_payment(self, payment_info):
        if self.state != OrderState.PENDING_PAYMENT:
            raise ValueError("Invalid state transition")
        
        # Process payment
        if self.charge_payment(payment_info):
            self.state = OrderState.PAID
        else:
            raise ValueError("Payment failed")
    
    def ship_order(self):
        if self.state != OrderState.PAID:
            raise ValueError("Cannot ship unpaid order")
        
        self.state = OrderState.SHIPPED
```

### 3. **Circuit Breaker Pattern**
```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise e
    
    def on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
    
    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

## 🧪 Lab Exercises

### Lab 1: Business Logic Vulnerability Assessment
**Objective**: Identify and exploit business logic flaws

**Scenario**: E-commerce application with discount system

**Tasks**:
1. Analyze discount calculation logic
2. Identify race conditions in inventory management
3. Test for negative quantity purchases
4. Exploit coupon stacking vulnerabilities

### Lab 2: Threat Modeling Exercise
**Objective**: Perform threat modeling on a sample application

**Application**: Online banking system

**Tasks**:
1. Create data flow diagrams
2. Identify trust boundaries
3. Apply STRIDE methodology
4. Prioritize identified threats
5. Design security controls

### Lab 3: Secure Design Implementation
**Objective**: Redesign a vulnerable system with security controls

**Tasks**:
1. Analyze existing insecure design
2. Identify design flaws and missing controls
3. Implement secure design patterns
4. Add appropriate security controls
5. Validate security improvements

## 📊 Impact Assessment

### Business Impact
- **Financial Loss**: Business logic flaws can lead to direct financial losses
- **Reputation Damage**: Design flaws affect user trust and brand reputation
- **Operational Disruption**: Poor design can cause system instability
- **Compliance Issues**: Inadequate controls may violate regulations

### Technical Impact
- **System Compromise**: Design flaws can lead to complete system compromise
- **Data Integrity**: Poor workflow design can corrupt business data
- **Scalability Issues**: Insecure design often doesn't scale properly
- **Maintenance Burden**: Fixing design issues requires architectural changes

## 🔍 Detection Methods

### 1. **Design Review Checklist**
```yaml
security_design_review:
  authentication:
    - Multi-factor authentication for sensitive operations
    - Account lockout mechanisms
    - Session management security
    - Password policy enforcement
  
  authorization:
    - Principle of least privilege
    - Role-based access control
    - Resource-level permissions
    - Context-aware access control
  
  business_logic:
    - Input validation and sanitization
    - Business rule enforcement
    - State management security
    - Race condition prevention
  
  error_handling:
    - Fail-secure mechanisms
    - Information disclosure prevention
    - Graceful degradation
    - Audit logging
```

### 2. **Architecture Security Assessment**
```python
def assess_architecture_security(design_doc):
    """Assess architecture for security design flaws"""
    
    security_issues = []
    
    # Check for missing security controls
    required_controls = [
        'authentication', 'authorization', 'input_validation',
        'output_encoding', 'error_handling', 'logging',
        'encryption', 'session_management'
    ]
    
    for control in required_controls:
        if control not in design_doc.security_controls:
            security_issues.append(f"Missing {control} control")
    
    # Check for insecure patterns
    insecure_patterns = [
        'direct_object_reference',
        'client_side_validation_only',
        'hardcoded_credentials',
        'weak_session_management'
    ]
    
    for pattern in insecure_patterns:
        if pattern in design_doc.implementation_patterns:
            security_issues.append(f"Insecure pattern: {pattern}")
    
    return security_issues
```

## 🛡️ Prevention Strategies

### 1. **Security by Design**
```python
class SecureDesignPrinciples:
    """Implementation of secure design principles"""
    
    @staticmethod
    def validate_business_rules(operation, context):
        """Enforce business rules at design level"""
        
        # Example: Money transfer validation
        if operation.type == 'money_transfer':
            # Check account ownership
            if not context.user.owns_account(operation.from_account):
                raise UnauthorizedError("Account not owned by user")
            
            # Check transfer limits
            daily_limit = context.user.get_daily_transfer_limit()
            if operation.amount > daily_limit:
                raise BusinessRuleError("Exceeds daily transfer limit")
            
            # Check account status
            if not operation.from_account.is_active():
                raise BusinessRuleError("Account is not active")
        
        return True
    
    @staticmethod
    def implement_rate_limiting(resource, user, action):
        """Design-level rate limiting"""
        
        limits = {
            'login_attempts': {'count': 5, 'window': 900},  # 5 attempts per 15 minutes
            'password_reset': {'count': 3, 'window': 3600}, # 3 resets per hour
            'api_calls': {'count': 1000, 'window': 3600}    # 1000 calls per hour
        }
        
        if action in limits:
            limit_config = limits[action]
            current_count = get_action_count(user, action, limit_config['window'])
            
            if current_count >= limit_config['count']:
                raise RateLimitExceededError(f"Rate limit exceeded for {action}")
        
        return True
```

### 2. **Secure Development Lifecycle (SDL)**
```yaml
sdl_phases:
  requirements:
    - Security requirements definition
    - Threat modeling
    - Risk assessment
    - Compliance requirements
  
  design:
    - Security architecture review
    - Design pattern security analysis
    - Attack surface analysis
    - Security control design
  
  implementation:
    - Secure coding standards
    - Code review processes
    - Static analysis tools
    - Security testing
  
  testing:
    - Penetration testing
    - Security test cases
    - Vulnerability scanning
    - Business logic testing
  
  deployment:
    - Security configuration
    - Environment hardening
    - Monitoring setup
    - Incident response planning
```

## 📚 Additional Resources

### Design Methodologies
- **Microsoft SDL**: Security Development Lifecycle
- **OWASP SAMM**: Software Assurance Maturity Model
- **NIST Cybersecurity Framework**: Design guidelines
- **ISO 27034**: Application security standard

### Threat Modeling Tools
- **Microsoft Threat Modeling Tool**: Free threat modeling software
- **OWASP Threat Dragon**: Open source threat modeling tool
- **IriusRisk**: Commercial threat modeling platform
- **ThreatModeler**: Enterprise threat modeling solution

### Secure Design Patterns
- **OWASP Security Design Patterns**: Catalog of secure patterns
- **Microsoft Security Patterns**: .NET security patterns
- **Java Security Patterns**: Enterprise Java security
- **Cloud Security Patterns**: Cloud-native security designs

## ✅ Knowledge Check

### Quiz Questions

1. **What is the main difference between insecure design and insecure implementation?**
   - A) Insecure design is about coding errors, insecure implementation is about architecture
   - B) Insecure design is about missing/flawed security controls, insecure implementation is about coding errors
   - C) They are the same thing
   - D) Insecure design only affects databases

2. **Which principle states that systems should fail to a secure state?**
   - A) Defense in depth
   - B) Principle of least privilege
   - C) Fail secure
   - D) Security by obscurity

3. **What is the purpose of threat modeling?**
   - A) To implement security controls
   - B) To systematically identify and analyze potential threats
   - C) To test application security
   - D) To encrypt sensitive data

### Practical Exercises

1. **Perform threat modeling on a sample application**
2. **Identify business logic vulnerabilities in code**
3. **Design secure workflows for multi-step processes**
4. **Implement secure design patterns**

## 🎯 Learning Outcomes

After completing this module, you should be able to:
- ✅ Distinguish between design flaws and implementation bugs
- ✅ Apply secure design principles in application architecture
- ✅ Perform threat modeling using structured methodologies
- ✅ Identify and prevent common design vulnerabilities
- ✅ Implement security controls at the design level

---

**Previous Module**: [A03 - Injection](A03-Injection.md)
**Next Module**: [A05 - Security Misconfiguration](A05-Security-Misconfiguration.md)

**Estimated Study Time**: 4-6 hours
**Difficulty Level**: Intermediate to Advanced
**Prerequisites**: Understanding of software architecture, basic security concepts
