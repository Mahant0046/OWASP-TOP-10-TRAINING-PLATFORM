-- Migration: 008_modules_animations_data.sql
-- Description: Populate modules and animations tables with initial OWASP Top 10 data
-- Date: 2025-01-05

-- Insert OWASP Top 10 learning modules
INSERT INTO learning_modules (
    module_id, title, description, category, difficulty, points, xp_reward, 
    status, lab_available, order_index, icon, color, estimated_time, 
    learning_objectives, tags, is_active
) VALUES
('A01', 'Broken Access Control', 
 'Learn about access control vulnerabilities and how attackers can exploit them to gain unauthorized access to functionality and data.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 1, 'fas fa-lock-open', '#EF4444', 45,
 ARRAY['Understand access control principles', 'Identify access control vulnerabilities', 'Implement proper access controls', 'Test access control mechanisms'],
 ARRAY['access-control', 'authorization', 'security', 'owasp-top-10'], true),

('A02', 'Cryptographic Failures', 
 'Understand cryptographic failures that can lead to exposure of sensitive data and learn how to implement proper cryptographic controls.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 2, 'fas fa-key', '#F59E0B', 40,
 ARRAY['Understand cryptographic principles', 'Identify cryptographic weaknesses', 'Implement strong encryption', 'Manage cryptographic keys properly'],
 ARRAY['cryptography', 'encryption', 'data-protection', 'owasp-top-10'], true),

('A03', 'Injection', 
 'Learn about injection flaws and how to prevent SQL injection, NoSQL injection, and other injection attacks.',
 'OWASP Top 10', 'Critical', 120, 120, 'available', true, 3, 'fas fa-syringe', '#DC2626', 50,
 ARRAY['Understand injection attack vectors', 'Identify injection vulnerabilities', 'Implement input validation', 'Use parameterized queries'],
 ARRAY['injection', 'sql-injection', 'input-validation', 'owasp-top-10'], true),

('A04', 'Insecure Design', 
 'Explore insecure design flaws and learn how to implement security by design principles in application development.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 4, 'fas fa-drafting-compass', '#7C3AED', 35,
 ARRAY['Understand secure design principles', 'Identify design flaws', 'Implement threat modeling', 'Apply security patterns'],
 ARRAY['design', 'architecture', 'security-by-design', 'owasp-top-10'], true),

('A05', 'Security Misconfiguration', 
 'Learn about security misconfigurations and how to properly configure applications, frameworks, and infrastructure.',
 'OWASP Top 10', 'Medium', 80, 80, 'available', true, 5, 'fas fa-cogs', '#059669', 30,
 ARRAY['Identify common misconfigurations', 'Implement secure configurations', 'Maintain configuration security', 'Automate security hardening'],
 ARRAY['configuration', 'deployment', 'hardening', 'owasp-top-10'], true),

('A06', 'Vulnerable and Outdated Components', 
 'Understand the risks of using vulnerable components and learn how to manage dependencies securely.',
 'OWASP Top 10', 'Medium', 80, 80, 'available', true, 6, 'fas fa-puzzle-piece', '#0891B2', 25,
 ARRAY['Identify vulnerable components', 'Manage dependencies securely', 'Implement update processes', 'Monitor for vulnerabilities'],
 ARRAY['dependencies', 'components', 'updates', 'owasp-top-10'], true),

('A07', 'Identification and Authentication Failures', 
 'Learn about authentication and session management vulnerabilities and how to implement secure authentication.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 7, 'fas fa-user-shield', '#DB2777', 40,
 ARRAY['Implement secure authentication', 'Manage sessions properly', 'Handle password security', 'Implement multi-factor authentication'],
 ARRAY['authentication', 'session-management', 'identity', 'owasp-top-10'], true),

('A08', 'Software and Data Integrity Failures', 
 'Explore integrity failures and learn how to ensure software and data integrity throughout the development lifecycle.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 8, 'fas fa-certificate', '#9333EA', 35,
 ARRAY['Understand integrity principles', 'Implement integrity checks', 'Secure CI/CD pipelines', 'Validate software integrity'],
 ARRAY['integrity', 'supply-chain', 'ci-cd', 'owasp-top-10'], true),

('A09', 'Security Logging and Monitoring Failures', 
 'Learn about logging and monitoring failures and how to implement effective security monitoring.',
 'OWASP Top 10', 'Medium', 80, 80, 'available', true, 9, 'fas fa-chart-line', '#EA580C', 30,
 ARRAY['Implement security logging', 'Design monitoring systems', 'Detect security incidents', 'Respond to security events'],
 ARRAY['logging', 'monitoring', 'incident-response', 'owasp-top-10'], true),

('A10', 'Server-Side Request Forgery', 
 'Understand SSRF vulnerabilities and learn how to prevent server-side request forgery attacks.',
 'OWASP Top 10', 'High', 100, 100, 'available', true, 10, 'fas fa-server', '#16A34A', 35,
 ARRAY['Understand SSRF attack vectors', 'Identify SSRF vulnerabilities', 'Implement URL validation', 'Secure server-side requests'],
 ARRAY['ssrf', 'server-side', 'url-validation', 'owasp-top-10'], true);

-- Insert default module sections for each module
INSERT INTO module_sections (module_id, section_type, title, description, order_index, estimated_time, points) 
SELECT 
    lm.module_id,
    section_data.section_type,
    section_data.title,
    section_data.description,
    section_data.order_index,
    section_data.estimated_time,
    section_data.points
FROM learning_modules lm
CROSS JOIN (
    VALUES 
    ('overview', 'Module Overview', 'Introduction and learning objectives', 1, 5, 5),
    ('documentation', 'Documentation', 'Detailed learning material and concepts', 2, 15, 20),
    ('animation', 'Interactive Animation', 'Visual demonstration of concepts', 3, 10, 15),
    ('lab', 'Hands-on Lab', 'Practical exercises and challenges', 4, 20, 30),
    ('quiz', 'Knowledge Assessment', 'Test your understanding', 5, 10, 30)
) AS section_data(section_type, title, description, order_index, estimated_time, points);

-- Insert sample animations for each module
INSERT INTO animations (
    module_id, title, description, animation_type, file_path, thumbnail_path, 
    duration, difficulty, interactive_elements, script_content, learning_points
) VALUES
('A01', 'Access Control Bypass Demonstration', 
 'Interactive animation showing how attackers can bypass access controls through URL manipulation and privilege escalation.',
 'interactive', 'animations/a01-access-control.html', 'animations/thumbs/a01-thumb.jpg', 180, 'High',
 '{"hotspots": [{"x": 100, "y": 200, "info": "URL manipulation point"}, {"x": 300, "y": 150, "info": "Privilege escalation"}], "interactions": ["click", "drag"]}',
 'This animation demonstrates common access control vulnerabilities and how attackers exploit them.',
 ARRAY['URL manipulation techniques', 'Privilege escalation methods', 'Access control bypass patterns']),

('A02', 'Cryptographic Failures Visualization', 
 'Visual demonstration of weak encryption, key management issues, and data exposure scenarios.',
 'interactive', 'animations/a02-crypto-failures.html', 'animations/thumbs/a02-thumb.jpg', 200, 'High',
 '{"scenarios": ["weak-encryption", "key-exposure", "data-transmission"], "controls": ["play", "pause", "reset"]}',
 'Learn how cryptographic failures can lead to data breaches and security compromises.',
 ARRAY['Weak encryption identification', 'Key management best practices', 'Secure data transmission']),

('A03', 'SQL Injection Attack Simulation', 
 'Step-by-step simulation of SQL injection attacks and prevention techniques.',
 'simulation', 'animations/a03-sql-injection.html', 'animations/thumbs/a03-thumb.jpg', 240, 'Critical',
 '{"code_editor": true, "payload_examples": ["union", "blind", "time-based"], "prevention_demo": true}',
 'Interactive simulation showing how SQL injection works and how to prevent it.',
 ARRAY['SQL injection techniques', 'Payload construction', 'Prevention methods', 'Parameterized queries']),

('A04', 'Secure Design Principles', 
 'Interactive guide through secure design principles and threat modeling processes.',
 'interactive', 'animations/a04-secure-design.html', 'animations/thumbs/a04-thumb.jpg', 160, 'High',
 '{"design_patterns": ["defense-in-depth", "fail-secure", "least-privilege"], "threat_model": true}',
 'Explore secure design principles and learn how to apply them in development.',
 ARRAY['Defense in depth', 'Fail-secure design', 'Threat modeling process']),

('A05', 'Configuration Security Walkthrough', 
 'Guided tour of common security misconfigurations and proper hardening techniques.',
 'interactive', 'animations/a05-misconfig.html', 'animations/thumbs/a05-thumb.jpg', 150, 'Medium',
 '{"config_examples": ["web-server", "database", "framework"], "checklist": true}',
 'Learn to identify and fix common security misconfigurations.',
 ARRAY['Server hardening', 'Framework security', 'Configuration management']),

('A06', 'Dependency Management Visualization', 
 'Visual representation of dependency trees and vulnerability propagation.',
 'interactive', 'animations/a06-components.html', 'animations/thumbs/a06-thumb.jpg', 120, 'Medium',
 '{"dependency_tree": true, "vulnerability_scanner": true, "update_process": true}',
 'Understand how vulnerable components affect application security.',
 ARRAY['Dependency analysis', 'Vulnerability scanning', 'Update management']),

('A07', 'Authentication Flow Analysis', 
 'Interactive analysis of authentication mechanisms and common vulnerabilities.',
 'interactive', 'animations/a07-auth-failures.html', 'animations/thumbs/a07-thumb.jpg', 180, 'High',
 '{"auth_flows": ["password", "session", "mfa"], "attack_scenarios": ["brute-force", "session-hijacking"]}',
 'Explore authentication vulnerabilities and secure implementation patterns.',
 ARRAY['Authentication mechanisms', 'Session management', 'Multi-factor authentication']),

('A08', 'Software Integrity Verification', 
 'Demonstration of integrity checks, code signing, and supply chain security.',
 'interactive', 'animations/a08-integrity.html', 'animations/thumbs/a08-thumb.jpg', 170, 'High',
 '{"integrity_checks": ["hash", "signature", "checksum"], "supply_chain": true}',
 'Learn how to ensure software and data integrity throughout the development lifecycle.',
 ARRAY['Digital signatures', 'Hash verification', 'Supply chain security']),

('A09', 'Security Monitoring Dashboard', 
 'Interactive security monitoring dashboard showing logging and alerting mechanisms.',
 'interactive', 'animations/a09-monitoring.html', 'animations/thumbs/a09-thumb.jpg', 140, 'Medium',
 '{"dashboard": true, "log_analysis": true, "alert_rules": true}',
 'Understand effective security logging and monitoring strategies.',
 ARRAY['Log analysis', 'Alert configuration', 'Incident detection']),

('A10', 'SSRF Attack Demonstration', 
 'Interactive demonstration of server-side request forgery attacks and mitigation strategies.',
 'interactive', 'animations/a10-ssrf.html', 'animations/thumbs/a10-thumb.jpg', 160, 'High',
 '{"attack_vectors": ["internal-services", "cloud-metadata", "file-access"], "prevention": true}',
 'Learn how SSRF attacks work and how to prevent them effectively.',
 ARRAY['SSRF attack vectors', 'Internal service access', 'URL validation techniques']);

-- Insert module dependencies (prerequisite relationships)
INSERT INTO module_dependencies (module_id, prerequisite_module_id, dependency_type) VALUES
('A02', 'A01', 'recommended'),
('A03', 'A01', 'recommended'),
('A04', 'A01', 'recommended'),
('A07', 'A01', 'recommended'),
('A08', 'A04', 'recommended'),
('A09', 'A07', 'recommended'),
('A10', 'A03', 'recommended');

-- Insert default learning path
INSERT INTO learning_paths (name, description, difficulty, estimated_duration, modules, is_default, is_active) VALUES
('OWASP Top 10 Complete', 
 'Complete learning path covering all OWASP Top 10 vulnerabilities in recommended order.',
 'High', 350, 
 '["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"]',
 true, true),

('Security Fundamentals', 
 'Essential security concepts focusing on the most critical vulnerabilities.',
 'Medium', 200,
 '["A01", "A03", "A07", "A02"]',
 false, true),

('Advanced Security Topics', 
 'Advanced security topics for experienced developers.',
 'Critical', 180,
 '["A04", "A08", "A09", "A10"]',
 false, true);

-- Update view counts for animations (simulate some usage)
UPDATE animations SET view_count = FLOOR(RANDOM() * 100) + 10;
