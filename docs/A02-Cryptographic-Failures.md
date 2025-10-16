# A02 - Cryptographic Failures

## 📋 Overview

**Cryptographic Failures**, previously known as "Sensitive Data Exposure," shifts up one position to #2, but with a broader focus on failures related to cryptography (or lack thereof). This category often leads to sensitive data exposure or system compromise.

### 🎯 Learning Objectives

By the end of this module, you will be able to:
- Understand common cryptographic failures and their impact
- Implement secure encryption and hashing mechanisms
- Properly manage cryptographic keys and certificates
- Identify and fix weak cryptographic implementations
- Apply cryptographic best practices in web applications

## 🔐 Understanding Cryptography in Web Applications

Cryptography is the practice of securing information by transforming it into an unreadable format. In web applications, cryptography is used for:

- **Data Protection**: Encrypting sensitive data at rest and in transit
- **Authentication**: Verifying user identities through password hashing
- **Integrity**: Ensuring data hasn't been tampered with
- **Non-repudiation**: Proving the origin of data or transactions

## 🚨 Common Cryptographic Failures

### 1. Weak or Broken Cryptographic Algorithms

**Description**: Using outdated, weak, or broken cryptographic algorithms that can be easily compromised.

**Examples of Weak Algorithms**:
- **MD5**: Cryptographically broken, vulnerable to collision attacks
- **SHA-1**: Deprecated, vulnerable to collision attacks
- **DES**: 56-bit key size, easily brute-forced
- **RC4**: Stream cipher with known vulnerabilities

**Vulnerable Code Example**:
```python
import hashlib

# ❌ Using weak MD5 hashing
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
```

**Secure Code Example**:
```python
import bcrypt

# ✅ Using strong bcrypt for password hashing
def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)
```

### 2. Insufficient Key Management

**Description**: Poor practices in generating, storing, distributing, and rotating cryptographic keys.

**Common Issues**:
- Hardcoded keys in source code
- Weak key generation
- Lack of key rotation
- Insecure key storage

### 3. Weak Random Number Generation

**Description**: Using predictable or weak random number generators for cryptographic purposes.

**Vulnerable Code Example**:
```python
import random

# ❌ Using weak random for cryptographic purposes
def generate_session_token():
    return str(random.randint(100000, 999999))
```

**Secure Code Example**:
```python
import secrets

# ✅ Using cryptographically secure random
def generate_session_token():
    return secrets.token_urlsafe(32)
```

## 🛠️ Lab Exercise: Weak Cryptography

### Scenario
You're testing a login system that uses weak cryptographic practices for password storage.

### Your Task
1. Analyze the password hashing mechanism
2. Attempt to crack the weak hash
3. Demonstrate the vulnerability
4. Propose a secure alternative

### Lab Environment
- **URL**: `/labs/A02`
- **Hint**: The system uses MD5 hashing
- **Test Password**: Try common passwords like "password", "123456", "admin"

### Expected Findings
- MD5 hashes can be easily cracked using rainbow tables
- No salt is used, making dictionary attacks effective
- Passwords are stored in an easily reversible format

## 🔧 Secure Cryptographic Implementation

### 1. Password Hashing Best Practices

```python
import bcrypt
import argon2
from argon2 import PasswordHasher

# ✅ Using bcrypt (recommended)
class BcryptPasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ✅ Using Argon2 (more modern)
class Argon2PasswordManager:
    def __init__(self):
        self.ph = PasswordHasher(
            time_cost=3,
            memory_cost=65536,
            parallelism=1,
            hash_len=32,
            salt_len=16
        )
    
    def hash_password(self, password: str) -> str:
        return self.ph.hash(password)
    
    def verify_password(self, password: str, hashed: str) -> bool:
        try:
            self.ph.verify(hashed, password)
            return True
        except argon2.exceptions.VerifyMismatchError:
            return False
```

### 2. Symmetric Encryption

```python
from cryptography.fernet import Fernet
import base64
import os

class SecureEncryption:
    def __init__(self, password: bytes):
        # Generate a key from password using PBKDF2
        salt = os.urandom(16)
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        self.cipher = Fernet(key)
        self.salt = salt
    
    def encrypt(self, data: str) -> bytes:
        return self.cipher.encrypt(data.encode())
    
    def decrypt(self, encrypted_data: bytes) -> str:
        return self.cipher.decrypt(encrypted_data).decode()
```

## 📊 Impact Assessment

### Business Impact
- **Data Breach**: Exposure of sensitive customer data
- **Compliance Violations**: GDPR, HIPAA, PCI-DSS non-compliance
- **Financial Loss**: Regulatory fines, legal costs, customer compensation
- **Reputation Damage**: Loss of customer trust and business

### Technical Impact
- **Data Integrity**: Compromised data authenticity
- **System Security**: Potential for further system compromise
- **Performance**: Impact of implementing stronger cryptography

## ✅ Security Checklist

### Development Phase
- [ ] Use strong, modern cryptographic algorithms
- [ ] Implement proper key management practices
- [ ] Use cryptographically secure random number generators
- [ ] Apply appropriate hashing for passwords (bcrypt, Argon2)
- [ ] Implement proper certificate validation

### Testing Phase
- [ ] Test cryptographic implementations for strength
- [ ] Verify key generation and storage security
- [ ] Test SSL/TLS configuration
- [ ] Perform cryptographic algorithm analysis
- [ ] Test random number generation quality

### Deployment Phase
- [ ] Secure key storage and management
- [ ] Configure strong SSL/TLS settings
- [ ] Implement key rotation procedures
- [ ] Monitor for cryptographic vulnerabilities
- [ ] Regular security assessments

## 🎓 Knowledge Check

### Questions
1. What's the difference between encryption and hashing?
2. Why should you never use MD5 for password hashing?
3. What is a salt and why is it important?
4. How do you properly validate SSL certificates?
5. What are the key principles of secure key management?

---

**🎯 Next Steps**: After completing this module, proceed to [A03 - Injection](A03-Injection.md) to learn about injection vulnerabilities and prevention techniques.

**💡 Remember**: Cryptography is only as strong as its weakest link. Proper implementation, key management, and regular updates are crucial for maintaining security.