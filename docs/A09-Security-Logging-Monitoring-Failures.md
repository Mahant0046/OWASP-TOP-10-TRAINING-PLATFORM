# A09 - Security Logging and Monitoring Failures

## 📋 Overview

**Security Logging and Monitoring Failures** occur when security events are not logged, monitored, or responded to appropriately. Without proper logging and monitoring, breaches cannot be detected in time.

### 🎯 Learning Objectives

- Implement comprehensive security logging
- Design effective monitoring systems
- Create incident response procedures
- Analyze security events and patterns
- Establish alerting mechanisms

## 🚨 Common Logging Failures

### 1. Insufficient Logging

**Vulnerable Example**:
```python
# ❌ No security logging
@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    
    if authenticate(username, password):
        session['user'] = username
        return redirect('/dashboard')
    else:
        return "Login failed", 401
```

**Secure Example**:
```python
# ✅ Comprehensive security logging
import logging
from datetime import datetime

# Configure security logger
security_logger = logging.getLogger('security')
security_logger.setLevel(logging.INFO)
handler = logging.FileHandler('security.log')
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
security_logger.addHandler(handler)

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent')
    
    # Log login attempt
    security_logger.info(f"Login attempt - Username: {username}, IP: {client_ip}, User-Agent: {user_agent}")
    
    if authenticate(username, password):
        session['user'] = username
        security_logger.info(f"Successful login - Username: {username}, IP: {client_ip}")
        return redirect('/dashboard')
    else:
        security_logger.warning(f"Failed login - Username: {username}, IP: {client_ip}")
        return "Login failed", 401
```

### 2. Missing Monitoring

**Vulnerable Example**:
```python
# ❌ No monitoring or alerting
def process_payment(amount, card_number):
    try:
        result = payment_gateway.charge(amount, card_number)
        return result
    except Exception as e:
        print(f"Payment failed: {e}")
        return None
```

**Secure Example**:
```python
# ✅ Comprehensive monitoring
import logging
from datetime import datetime, timedelta

class SecurityMonitor:
    def __init__(self):
        self.failed_attempts = {}
        self.alert_threshold = 5
        self.time_window = timedelta(minutes=5)
    
    def log_payment_attempt(self, amount, card_number, ip_address, success):
        masked_card = f"****-****-****-{card_number[-4:]}"
        
        if success:
            security_logger.info(f"Payment successful - Amount: ${amount}, Card: {masked_card}, IP: {ip_address}")
        else:
            security_logger.warning(f"Payment failed - Amount: ${amount}, Card: {masked_card}, IP: {ip_address}")
            self.check_for_suspicious_activity(ip_address)
    
    def check_for_suspicious_activity(self, ip_address):
        now = datetime.utcnow()
        
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []
        
        # Clean old attempts
        self.failed_attempts[ip_address] = [
            attempt for attempt in self.failed_attempts[ip_address]
            if now - attempt < self.time_window
        ]
        
        self.failed_attempts[ip_address].append(now)
        
        if len(self.failed_attempts[ip_address]) >= self.alert_threshold:
            self.send_security_alert(ip_address)
    
    def send_security_alert(self, ip_address):
        alert_message = f"SECURITY ALERT: Multiple failed payment attempts from IP {ip_address}"
        security_logger.critical(alert_message)
        # Send to SIEM, email, Slack, etc.
        self.notify_security_team(alert_message)

monitor = SecurityMonitor()

def process_payment(amount, card_number):
    client_ip = request.remote_addr
    
    try:
        result = payment_gateway.charge(amount, card_number)
        monitor.log_payment_attempt(amount, card_number, client_ip, True)
        return result
    except Exception as e:
        monitor.log_payment_attempt(amount, card_number, client_ip, False)
        security_logger.error(f"Payment processing error: {str(e)}")
        return None
```

## 🛠️ Lab Exercise: Log Analysis

### Scenario
Analyze security logs to identify attack patterns.

### Your Task
1. Review application logs
2. Identify suspicious patterns
3. Detect potential attacks
4. Create monitoring rules

### Lab Environment
- **URL**: `/labs/A09`
- **Focus**: Log analysis, pattern recognition, alerting

## 🔧 Comprehensive Logging Strategy

### 1. Security Event Logging

```python
import json
import logging
from enum import Enum
from datetime import datetime

class SecurityEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_ACCESS = "data_access"
    CONFIGURATION_CHANGE = "config_change"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"

class SecurityLogger:
    def __init__(self):
        self.logger = logging.getLogger('security_events')
        self.logger.setLevel(logging.INFO)
        
        # JSON formatter for structured logging
        formatter = logging.Formatter('%(message)s')
        
        # File handler
        file_handler = logging.FileHandler('security_events.json')
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # SIEM handler (example)
        # siem_handler = SIEMHandler('siem.example.com', 514)
        # self.logger.addHandler(siem_handler)
    
    def log_security_event(self, event_type: SecurityEventType, user_id=None, 
                          ip_address=None, details=None, risk_level="medium"):
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "user_id": user_id,
            "ip_address": ip_address,
            "risk_level": risk_level,
            "details": details or {},
            "session_id": getattr(request, 'session_id', None) if 'request' in globals() else None
        }
        
        self.logger.info(json.dumps(event))
        
        # Send high-risk events to alerting system
        if risk_level == "high":
            self.send_immediate_alert(event)
    
    def send_immediate_alert(self, event):
        # Implementation for immediate alerting
        pass

# Usage example
security_logger = SecurityLogger()

@app.route('/admin/users/<user_id>/delete', methods=['POST'])
@admin_required
def delete_user(user_id):
    target_user = User.query.get(user_id)
    
    security_logger.log_security_event(
        SecurityEventType.PRIVILEGE_ESCALATION,
        user_id=current_user.id,
        ip_address=request.remote_addr,
        details={
            "action": "delete_user",
            "target_user_id": user_id,
            "target_username": target_user.username
        },
        risk_level="high"
    )
    
    db.session.delete(target_user)
    db.session.commit()
    
    return {"status": "success"}
```

### 2. Real-time Monitoring

```python
import asyncio
import aioredis
from collections import defaultdict, deque
from datetime import datetime, timedelta

class RealTimeMonitor:
    def __init__(self):
        self.redis = None
        self.event_counters = defaultdict(lambda: deque())
        self.alert_rules = []
    
    async def initialize(self):
        self.redis = await aioredis.create_redis_pool('redis://localhost')
    
    def add_alert_rule(self, name, condition, threshold, time_window, action):
        self.alert_rules.append({
            'name': name,
            'condition': condition,
            'threshold': threshold,
            'time_window': time_window,
            'action': action
        })
    
    async def process_event(self, event):
        now = datetime.utcnow()
        
        # Store event in Redis for real-time analysis
        await self.redis.lpush('security_events', json.dumps(event))
        await self.redis.expire('security_events', 3600)  # Keep for 1 hour
        
        # Check alert rules
        for rule in self.alert_rules:
            if self.evaluate_rule(rule, event, now):
                await self.trigger_alert(rule, event)
    
    def evaluate_rule(self, rule, event, now):
        key = f"{rule['name']}:{event.get('ip_address', 'unknown')}"
        
        # Clean old events
        cutoff = now - rule['time_window']
        while self.event_counters[key] and self.event_counters[key][0] < cutoff:
            self.event_counters[key].popleft()
        
        # Check if event matches condition
        if rule['condition'](event):
            self.event_counters[key].append(now)
            return len(self.event_counters[key]) >= rule['threshold']
        
        return False
    
    async def trigger_alert(self, rule, event):
        alert = {
            'rule_name': rule['name'],
            'timestamp': datetime.utcnow().isoformat(),
            'event': event,
                    'severity': 'high'
        }
        
        # Execute alert action
        await rule['action'](alert)

# Setup monitoring rules
monitor = RealTimeMonitor()

# Rule: Multiple failed logins
monitor.add_alert_rule(
    name="multiple_failed_logins",
    condition=lambda e: e.get('event_type') == 'login_failure',
    threshold=5,
    time_window=timedelta(minutes=5),
    action=lambda alert: send_slack_alert(f"Multiple failed logins detected: {alert}")
)

# Rule: Privilege escalation attempts
monitor.add_alert_rule(
    name="privilege_escalation",
    condition=lambda e: e.get('event_type') == 'privilege_escalation',
    threshold=1,
    time_window=timedelta(minutes=1),
    action=lambda alert: send_email_alert(f"CRITICAL: Privilege escalation detected: {alert}")
)
```

## ✅ Security Checklist

### Logging Requirements
-  Log all authentication events
-  Log authorization failures
-  Log administrative actions
-  Log data access events
-  Log configuration changes
-  Use structured logging (JSON)
-  Include contextual information

### Monitoring Requirements
-  Real-time event processing
-  Automated threat detection
-  Alerting mechanisms
-  Dashboard visualization
-  Log retention policies
-  Regular log analysis
-  Incident response procedures

---

**🎯 Next Steps**: Proceed to [A10 - Server-Side Request Forgery](A10-Server-Side-Request-Forgery.md).