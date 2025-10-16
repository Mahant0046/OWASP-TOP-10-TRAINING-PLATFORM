# A10 - Server-Side Request Forgery (SSRF)

## 📋 Overview

**Server-Side Request Forgery (SSRF)** flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL. It allows an attacker to coerce the application to send a crafted request to an unexpected destination.

### 🎯 Learning Objectives

- Understand SSRF attack vectors and impact
- Identify SSRF vulnerabilities in applications
- Implement proper URL validation and filtering
- Apply network-level protections
- Design secure remote resource fetching

## 🚨 Common SSRF Vulnerabilities

### 1. Basic SSRF

**Vulnerable Example**:
```python
import requests

# ❌ Vulnerable to SSRF
@app.route('/fetch-url', methods=['POST'])
def fetch_url():
    url = request.json.get('url')
    
    # No validation - attacker can access internal services
    response = requests.get(url)
    return response.text
```

**Attack Examples**:
```
# Access internal services
http://localhost:8080/admin
http://127.0.0.1:22
http://169.254.169.254/latest/meta-data/  # AWS metadata

# Port scanning
http://internal-server:3306
http://internal-server:5432

# File system access (if supported)
file:///etc/passwd
```

**Secure Example**:
```python
import requests
import ipaddress
from urllib.parse import urlparse

class SSRFProtection:
    def __init__(self):
        self.allowed_schemes = ['http', 'https']
        self.blocked_ips = [
            ipaddress.ip_network('127.0.0.0/8'),    # Loopback
            ipaddress.ip_network('10.0.0.0/8'),     # Private
            ipaddress.ip_network('172.16.0.0/12'),  # Private
            ipaddress.ip_network('192.168.0.0/16'), # Private
            ipaddress.ip_network('169.254.0.0/16'), # Link-local
            ipaddress.ip_network('::1/128'),        # IPv6 loopback
            ipaddress.ip_network('fc00::/7'),       # IPv6 private
        ]
        self.allowed_domains = ['api.example.com', 'cdn.example.com']
    
    def validate_url(self, url):
        try:
            parsed = urlparse(url)
            
            # Check scheme
            if parsed.scheme not in self.allowed_schemes:
                return False, "Invalid scheme"
            
            # Check domain whitelist
            if parsed.hostname not in self.allowed_domains:
                return False, "Domain not allowed"
            
            # Resolve IP and check against blacklist
                import socket
            ip = socket.gethostbyname(parsed.hostname)
            ip_addr = ipaddress.ip_address(ip)
            
            for blocked_network in self.blocked_ips:
                if ip_addr in blocked_network:
                    return False, "IP address not allowed"
            
            return True, "URL is valid"
            
        except Exception as e:
            return False, f"URL validation error: {str(e)}"

# ✅ Secure implementation
ssrf_protection = SSRFProtection()

@app.route('/fetch-url', methods=['POST'])
def fetch_url():
    url = request.json.get('url')
    
    if not url:
        return {"error": "URL is required"}, 400
    
    # Validate URL
    is_valid, message = ssrf_protection.validate_url(url)
    if not is_valid:
        return {"error": f"Invalid URL: {message}"}, 400
    
    try:
        # Fetch with timeout and size limits
            response = requests.get(
                url,
            timeout=10,
            allow_redirects=False,
            stream=True
        )
        
        # Check content length
        content_length = response.headers.get('content-length')
        if content_length and int(content_length) > 1024 * 1024:  # 1MB limit
            return {"error": "Response too large"}, 400
        
        # Read with size limit
        content = response.raw.read(1024 * 1024)  # 1MB limit
        return {"content": content.decode('utf-8', errors='ignore')}
        
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}, 500
```

### 2. Blind SSRF

**Vulnerable Example**:
```python
# ❌ Blind SSRF through webhook
@app.route('/webhook', methods=['POST'])
def register_webhook():
    webhook_url = request.json.get('webhook_url')
    
    # Store webhook URL without validation
    user_webhook = UserWebhook(
        user_id=current_user.id,
        url=webhook_url
    )
    db.session.add(user_webhook)
    db.session.commit()
    
    return {"status": "Webhook registered"}

# Later, when triggering webhook
def trigger_webhook(user_id, data):
    webhook = UserWebhook.query.filter_by(user_id=user_id).first()
    if webhook:
        # Vulnerable - no validation when making request
        requests.post(webhook.url, json=data)
```

**Secure Example**:
```python
# ✅ Secure webhook implementation
class WebhookValidator:
    def __init__(self):
        self.allowed_domains = ['hooks.example.com', 'api.partner.com']
        self.max_redirects = 3
    
    def validate_webhook_url(self, url):
        # Initial URL validation
        is_valid, message = ssrf_protection.validate_url(url)
        if not is_valid:
            return False, message
        
        # Test webhook endpoint
        try:
            response = requests.head(
                url,
                timeout=5,
                allow_redirects=True,
                max_redirects=self.max_redirects
            )
            
            # Check if endpoint accepts POST requests
            if response.status_code == 405:  # Method not allowed
                return False, "Endpoint does not accept POST requests"
            
            return True, "Webhook URL is valid"
            
        except requests.exceptions.RequestException as e:
            return False, f"Webhook validation failed: {str(e)}"

webhook_validator = WebhookValidator()

@app.route('/webhook', methods=['POST'])
def register_webhook():
    webhook_url = request.json.get('webhook_url')
    
    if not webhook_url:
        return {"error": "Webhook URL is required"}, 400
    
    # Validate webhook URL
    is_valid, message = webhook_validator.validate_webhook_url(webhook_url)
    if not is_valid:
        return {"error": f"Invalid webhook URL: {message}"}, 400
    
    user_webhook = UserWebhook(
        user_id=current_user.id,
        url=webhook_url,
        verified=True
    )
    db.session.add(user_webhook)
    db.session.commit()
    
    return {"status": "Webhook registered"}
```

## 🛠️ Lab Exercise: SSRF Exploitation

### Scenario
Test an application that fetches remote URLs without proper validation.

### Your Task
1. Identify SSRF vulnerability
2. Access internal services
3. Attempt to read cloud metadata
4. Demonstrate impact

### Lab Environment
- **URL**: `/labs/A10`
- **Target**: URL fetching functionality
- **Payloads**: Internal IPs, localhost, cloud metadata endpoints

### Expected Findings
- Access to internal services
- Cloud metadata exposure
- Port scanning capabilities
- Potential file system access

## 🔧 Advanced SSRF Protection

### 1. Network-Level Protection

```python
import socket
import struct
from contextlib import contextmanager

class NetworkProtection:
    def __init__(self):
        self.blocked_ports = [22, 23, 25, 53, 80, 110, 143, 993, 995]
        self.allowed_ports = [80, 443, 8080, 8443]
    
    @contextmanager
    def safe_socket(self, timeout=10):
        """Create a socket with safety restrictions"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        # Override connect method to add validation
        original_connect = sock.connect
        
        def safe_connect(address):
            host, port = address
            
            # Validate port
            if port in self.blocked_ports:
                raise ConnectionError(f"Port {port} is blocked")
            
            if port not in self.allowed_ports:
                raise ConnectionError(f"Port {port} is not allowed")
            
            # Validate IP
            try:
                ip = socket.gethostbyname(host)
                if self.is_private_ip(ip):
                    raise ConnectionError(f"Private IP {ip} is not allowed")
            except socket.gaierror:
                raise ConnectionError(f"Cannot resolve hostname {host}")
            
            return original_connect(address)
        
        sock.connect = safe_connect
        
        try:
            yield sock
        finally:
            sock.close()
    
    def is_private_ip(self, ip):
        """Check if IP is private/internal"""
        ip_int = struct.unpack("!I", socket.inet_aton(ip))[0]
        
        # Check private ranges
        private_ranges = [
            (0x7f000000, 0xff000000),  # 127.0.0.0/8
            (0x0a000000, 0xff000000),  # 10.0.0.0/8
            (0xac100000, 0xfff00000),  # 172.16.0.0/12
            (0xc0a80000, 0xffff0000),  # 192.168.0.0/16
            (0xa9fe0000, 0xffff0000),  # 169.254.0.0/16
        ]
        
        for network, netmask in private_ranges:
            if (ip_int & netmask) == network:
                    return True
        
        return False
```

### 2. DNS Rebinding Protection

```python
import time
import dns.resolver
from collections import defaultdict

class DNSRebindingProtection:
    def __init__(self):
        self.dns_cache = {}
        self.cache_ttl = 300  # 5 minutes
        self.resolution_history = defaultdict(list)
    
    def resolve_with_protection(self, hostname):
        now = time.time()
        
        # Check cache
        if hostname in self.dns_cache:
            cached_time, cached_ip = self.dns_cache[hostname]
            if now - cached_time < self.cache_ttl:
                return cached_ip
        
        # Resolve DNS
        try:
            result = dns.resolver.resolve(hostname, 'A')
            ip = str(result[0])
            
            # Check for DNS rebinding attack
            if self.detect_dns_rebinding(hostname, ip):
                raise SecurityError("Potential DNS rebinding attack detected")
            
            # Cache result
            self.dns_cache[hostname] = (now, ip)
            self.resolution_history[hostname].append((now, ip))
            
            # Clean old history
            cutoff = now - 3600  # Keep 1 hour of history
            self.resolution_history[hostname] = [
                (timestamp, resolved_ip) for timestamp, resolved_ip in self.resolution_history[hostname]
                if timestamp > cutoff
            ]
            
            return ip
            
        except dns.resolver.NXDOMAIN:
            raise ValueError(f"Hostname {hostname} does not exist")
        except Exception as e:
            raise ValueError(f"DNS resolution failed: {str(e)}")
    
    def detect_dns_rebinding(self, hostname, current_ip):
        """Detect potential DNS rebinding attacks"""
        history = self.resolution_history[hostname]
        
        if len(history) < 2:
            return False
        
        # Check for rapid IP changes
        recent_ips = [ip for timestamp, ip in history[-5:]]  # Last 5 resolutions
        unique_ips = set(recent_ips)
        
        if len(unique_ips) > 2:  # More than 2 different IPs recently
            # Check if switching between public and private IPs
            has_public = any(not self.is_private_ip(ip) for ip in unique_ips)
            has_private = any(self.is_private_ip(ip) for ip in unique_ips)
            
            if has_public and has_private:
                return True
        
        return False
    
    def is_private_ip(self, ip):
        # Same implementation as NetworkProtection.is_private_ip
        pass
```

## 📊 Impact Assessment

### Business Impact
- **Data Breach**: Access to internal systems and sensitive data
- **Service Disruption**: Potential DoS attacks on internal services
- **Cloud Compromise**: Access to cloud metadata and credentials
- **Compliance Violations**: Unauthorized access to protected resources

### Technical Impact
- **Internal Network Mapping**: Discovery of internal infrastructure
- **Credential Theft**: Access to cloud metadata and service credentials
- **Lateral Movement**: Using compromised server as pivot point
- **Data Exfiltration**: Reading sensitive files and configurations

## ✅ Security Checklist

### Input Validation
-  Validate URL schemes (allow only http/https)
-  Implement domain whitelist
-  Block private IP ranges
-  Validate URL format and structure
-  Check for URL encoding bypasses

### Network Protection
-  Implement egress filtering
-  Use network segmentation
-  Block access to metadata endpoints
-  Implement DNS filtering
-  Monitor outbound connections

### Application Security
-  Use safe HTTP client configurations
-  Implement request timeouts
-  Limit response sizes
-  Disable redirects or limit redirect count
-  Log all external requests

## 🎓 Knowledge Check

### Questions
1. What is the difference between SSRF and CSRF?
2. How can SSRF be used to access cloud metadata?
3. What are effective ways to prevent DNS rebinding attacks?
4. How do you implement proper URL validation?
5. What network-level protections help prevent SSRF?

---

**🎯 Congratulations!** You've completed all OWASP Top 10 modules. Review the [README](README.md) for additional resources and next steps.

**💡 Remember**: SSRF can be particularly dangerous in cloud environments. Always validate and restrict outbound requests from your applications.