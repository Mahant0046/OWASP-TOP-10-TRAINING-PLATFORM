-- Migration: 006_assessments_documentation_data_fixed.sql
-- Description: Populate assessments and documentation tables with initial data (fixed)
-- Date: 2025-01-05

-- Insert assessment categories
INSERT INTO assessment_categories (name, description, icon, color) VALUES
('Security Fundamentals', 'Basic security concepts and principles', 'fas fa-shield-alt', '#10B981'),
('Vulnerability Assessment', 'Identifying and assessing security vulnerabilities', 'fas fa-bug', '#EF4444'),
('Secure Development', 'Secure coding practices and development', 'fas fa-code', '#3B82F6'),
('Risk Management', 'Security risk assessment and management', 'fas fa-exclamation-triangle', '#F59E0B'),
('Compliance & Standards', 'Security standards and compliance requirements', 'fas fa-clipboard-check', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- Insert documentation for each OWASP module
INSERT INTO documentation (module_id, title, content, file_path, difficulty, estimated_read_time, tags) VALUES
('A01', 'Broken Access Control', 
'# Broken Access Control

## Overview
Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data or performing a business function outside the users limits.

## Common Weaknesses
- Violation of the principle of least privilege or deny by default
- Bypassing access control checks by modifying the URL
- Permitting viewing or editing someone elses account
- Accessing API with missing access controls for POST, PUT and DELETE
- Elevation of privilege
- Metadata manipulation, such as replaying or tampering with a JSON Web Token (JWT)

## Prevention
- Implement access control mechanisms once and re-use them throughout the application
- Minimize CORS usage
- Access controls should enforce record ownership
- Unique application business limit requirements should be enforced by domain models
- Disable web server directory listing and ensure file metadata and backup files are not present within web roots
- Log access control failures, alert admins when appropriate
- Rate limit API and controller access to minimize the harm from automated attack tooling
- JWT tokens should be invalidated on the server after logout

## Testing Methods
- Manual testing of access controls
- Automated testing with security tools
- Code review for access control implementation
- Penetration testing

## Real-world Examples
- Insecure direct object references
- Missing function level access control
- Cross-origin resource sharing (CORS) misconfiguration', 
'docs/A01-Broken-Access-Control.md', 'High', 25, 
ARRAY['access-control', 'authorization', 'security', 'owasp-top-10']),

('A02', 'Cryptographic Failures', 
'# Cryptographic Failures

## Overview
Previously known as Sensitive Data Exposure, this category focuses on failures related to cryptography which often leads to sensitive data exposure or system compromise.

## Common Issues
- Transmitting data in clear text (HTTP, SMTP, FTP)
- Using old or weak cryptographic algorithms
- Using default crypto keys or weak keys
- Not enforcing encryption in transit
- Not validating server certificates and trust chains
- Using deprecated hash functions like MD5 or SHA1

## Prevention
- Classify data processed, stored, or transmitted by an application
- Do not store sensitive data unnecessarily
- Encrypt all sensitive data at rest
- Ensure up-to-date and strong standard algorithms, protocols, and keys are in place
- Encrypt all data in transit with secure protocols such as TLS
- Disable caching for response that contain sensitive data
- Store passwords using strong adaptive and salted hashing functions
- Verify independently the effectiveness of configuration and settings

## Best Practices
- Use authenticated encryption instead of just encryption
- Keys should be generated cryptographically randomly
- Avoid deprecated cryptographic functions and padding schemes
- Use proper key management practices', 
'docs/A02-Cryptographic-Failures.md', 'High', 20, 
ARRAY['cryptography', 'encryption', 'data-protection', 'owasp-top-10']),

('A03', 'Injection', 
'# Injection

## Overview
An application is vulnerable to injection attacks when user-supplied data is not validated, filtered, or sanitized by the application, or when hostile data is used within object-relational mapping (ORM) search parameters.

## Types of Injection
- SQL Injection
- NoSQL Injection
- OS Command Injection
- LDAP Injection
- Expression Language (EL) or Object Graph Navigation Library (OGNL) Injection

## Prevention
- Use safe APIs which avoid the use of the interpreter entirely
- Use positive server-side input validation
- Escape special characters using the specific escape syntax for that interpreter
- Use LIMIT and other SQL controls within queries to prevent mass disclosure of records
- Use parameterized queries, stored procedures, or ORM frameworks

## Detection Methods
- Source code analysis can detect injection flaws
- Automated testing of all parameters, headers, URL, cookies, JSON, SOAP, and XML data inputs
- Dynamic application security testing (DAST) tools
- Interactive application security testing (IAST) tools', 
'docs/A03-Injection.md', 'Critical', 30, 
ARRAY['injection', 'sql-injection', 'input-validation', 'owasp-top-10']);

-- Insert sample assessment questions for A01
INSERT INTO assessment_questions (module_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index) VALUES
('A01', 'What is the principle of least privilege?', 'multiple_choice', 
'{"a": "Users should have maximum access to perform their job", "b": "Users should have only the minimum access necessary to perform their job", "c": "All users should have the same level of access", "d": "Access should be granted based on user requests"}',
'b', 'The principle of least privilege states that users should have only the minimum access necessary to perform their job functions, reducing the potential impact of compromised accounts.', 'Medium', 10, 1),

('A01', 'Which of the following is an example of broken access control?', 'multiple_choice',
'{"a": "Using HTTPS for all communications", "b": "Implementing proper input validation", "c": "Allowing users to access other users accounts by changing URL parameters", "d": "Using strong password policies"}',
'c', 'Allowing users to access other users accounts by modifying URL parameters is a classic example of broken access control, specifically an insecure direct object reference.', 'Easy', 10, 2),

('A01', 'What should be done when access control failures occur?', 'multiple_choice',
'{"a": "Ignore them as they are common", "b": "Log the failures and alert administrators when appropriate", "c": "Only log successful access attempts", "d": "Disable logging to improve performance"}',
'b', 'Access control failures should be logged and administrators should be alerted when appropriate to detect and respond to potential security incidents.', 'Medium', 10, 3),

('A01', 'True or False: CORS (Cross-Origin Resource Sharing) usage should be minimized to prevent access control issues.', 'true_false',
'{"true": "True", "false": "False"}',
'true', 'CORS usage should be minimized and properly configured as misconfigured CORS can lead to unauthorized cross-origin access to sensitive resources.', 'Medium', 10, 4);

-- Insert sample assessment questions for A02
INSERT INTO assessment_questions (module_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index) VALUES
('A02', 'Which of the following is NOT a recommended practice for cryptographic security?', 'multiple_choice',
'{"a": "Using TLS for data in transit", "b": "Using MD5 for password hashing", "c": "Encrypting sensitive data at rest", "d": "Using strong, randomly generated keys"}',
'b', 'MD5 is a deprecated hash function that is cryptographically broken and should not be used for password hashing. Use strong adaptive hashing functions like bcrypt, scrypt, or Argon2 instead.', 'Medium', 10, 1),

('A02', 'What is the main difference between encryption and hashing?', 'multiple_choice',
'{"a": "There is no difference", "b": "Encryption is reversible, hashing is one-way", "c": "Hashing is reversible, encryption is one-way", "d": "Both are always reversible"}',
'b', 'Encryption is designed to be reversible with the proper key, while hashing is a one-way function designed to be irreversible.', 'Easy', 10, 2),

('A02', 'True or False: It is acceptable to store sensitive data in clear text if the database is secured.', 'true_false',
'{"true": "True", "false": "False"}',
'false', 'Sensitive data should always be encrypted at rest, regardless of database security measures, to provide defense in depth.', 'Easy', 10, 3);

-- Insert sample assessment questions for A03
INSERT INTO assessment_questions (module_id, question_text, question_type, options, correct_answer, explanation, difficulty, points, order_index) VALUES
('A03', 'What is the most effective way to prevent SQL injection?', 'multiple_choice',
'{"a": "Input validation only", "b": "Using parameterized queries/prepared statements", "c": "Escaping special characters only", "d": "Using stored procedures only"}',
'b', 'Parameterized queries (prepared statements) are the most effective defense against SQL injection as they separate SQL code from data, preventing malicious input from being interpreted as SQL commands.', 'Medium', 10, 1),

('A03', 'Which of the following is an example of command injection?', 'multiple_choice',
'{"a": "SELECT * FROM users WHERE id = 1", "b": "user_input; rm -rf /", "c": "UPDATE users SET name = John", "d": "INSERT INTO logs VALUES (login)"}',
'b', 'The input "user_input; rm -rf /" contains a command separator (;) followed by a dangerous system command, which could be executed if the input is not properly sanitized.', 'Medium', 10, 2),

('A03', 'True or False: NoSQL databases are immune to injection attacks.', 'true_false',
'{"true": "True", "false": "False"}',
'false', 'NoSQL databases are also vulnerable to injection attacks. While the attack vectors may differ from SQL injection, similar principles of input validation and parameterized queries apply.', 'Medium', 10, 3);

-- Update the documentation table with more complete content for remaining modules
INSERT INTO documentation (module_id, title, content, file_path, difficulty, estimated_read_time, tags) VALUES
('A04', 'Insecure Design', 'Insecure design is a broad category representing different weaknesses, expressed as "missing or ineffective control design."', 'docs/A04-Insecure-Design.md', 'High', 20, ARRAY['design', 'architecture', 'security-by-design']),
('A05', 'Security Misconfiguration', 'Security misconfiguration is commonly a result of insecure default configurations, incomplete configurations, open cloud storage, misconfigured HTTP headers, and verbose error messages.', 'docs/A05-Security-Misconfiguration.md', 'Medium', 18, ARRAY['configuration', 'deployment', 'hardening']),
('A06', 'Vulnerable and Outdated Components', 'Components run with the same privileges as the application itself, so flaws in any component can result in serious impact.', 'docs/A06-Vulnerable-Outdated-Components.md', 'Medium', 15, ARRAY['dependencies', 'components', 'updates']),
('A07', 'Identification and Authentication Failures', 'Confirmation of the user identity, authentication, and session management is critical to protect against authentication-related attacks.', 'docs/A07-Identification-Authentication-Failures.md', 'High', 22, ARRAY['authentication', 'session-management', 'identity']),
('A08', 'Software and Data Integrity Failures', 'Software and data integrity failures relate to code and infrastructure that does not protect against integrity violations.', 'docs/A08-Software-Data-Integrity-Failures.md', 'High', 25, ARRAY['integrity', 'supply-chain', 'ci-cd']),
('A09', 'Security Logging and Monitoring Failures', 'Logging and monitoring, coupled with missing or ineffective integration with incident response, allows attackers to further attack systems.', 'docs/A09-Security-Logging-Monitoring-Failures.md', 'Medium', 20, ARRAY['logging', 'monitoring', 'incident-response']),
('A10', 'Server-Side Request Forgery', 'SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL.', 'docs/A10-Server-Side-Request-Forgery.md', 'High', 18, ARRAY['ssrf', 'server-side', 'url-validation'])
ON CONFLICT (module_id) DO NOTHING;
