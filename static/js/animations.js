// Complete OWASP Top 10 Animation Platform - Reference Implementation
(function() {
    'use strict';

// Complete OWASP Top 10 Data with Full Animation Sequences
const COMPLETE_OWASP_DATA = {
    vulnerabilities: [
        {
            id: "A01",
            title: "Broken Access Control",
            difficulty: "Critical",
            estimatedTime: "8 minutes",
            completed: false,
            description: "Restrictions on what authenticated users are allowed to do are often not properly enforced",
            scenes: [
                {
                    id: 1,
                    title: "Normal Authentication",
                    description: "User logs in successfully with valid credentials and accesses their profile page",
                    duration: 6000,
                    narration: "Watch as a legitimate user logs into their banking account with proper credentials and accesses their profile..."
                },
                {
                    id: 2,
                    title: "URL Parameter Manipulation", 
                    description: "Attacker modifies user ID in URL parameter to access another user's data",
                    duration: 7000,
                    narration: "Notice how the attacker changes the userId parameter in the URL from 123 to 456 to access another user's profile..."
                },
                {
                    id: 3,
                    title: "Authorization Failure",
                    description: "System fails to verify ownership of requested resource", 
                    duration: 6500,
                    narration: "The application doesn't verify if the user should access this data, allowing unauthorized access to sensitive information..."
                },
                {
                    id: 4,
                    title: "Privilege Escalation",
                    description: "Attacker gains administrative privileges",
                    duration: 7500,
                    narration: "By manipulating role parameters, the attacker escalates to administrative privileges and gains control..."
                },
                {
                    id: 5,
                    title: "Impact Assessment",
                    description: "Complete data breach and system compromise achieved",
                    duration: 6000,
                    narration: "The attacker now has full access to all user data, administrative functions, and can modify critical system settings..."
                }
            ],
            codeExamples: {
                vulnerable: `// No authorization check
function getUserProfile(userId) {
    return database.query('SELECT * FROM users WHERE id = ?', [userId]);
}`,
                secure: `// Proper authorization
function getUserProfile(userId, currentUser) {
    if (currentUser.id !== userId && !currentUser.isAdmin) {
        throw new Error('Unauthorized access');
    }
    return database.query('SELECT * FROM users WHERE id = ?', [userId]);
}`
            },
            prevention: [
                "Implement proper authorization checks",
                "Use role-based access control (RBAC)",
                "Validate user permissions for each request",
                "Apply principle of least privilege"
            ]
        },
        {
            id: "A02",
            title: "Cryptographic Failures",
            difficulty: "High",
            estimatedTime: "6 minutes",
            completed: false,
            description: "Failures related to cryptography which often leads to sensitive data exposure",
            scenes: [
                { id: 1, title: "Weak Encryption Discovery", description: "Application uses outdated encryption", duration: 3000, narration: "The application is using MD5 hashing for passwords, which is cryptographically broken..." },
                { id: 2, title: "Password Hash Cracking", description: "Weak hashes are easily cracked", duration: 4000, narration: "Using rainbow tables and modern hardware, the MD5 hashes are cracked in minutes..." },
                { id: 3, title: "Data Transmission Interception", description: "Unencrypted data intercepted", duration: 3500, narration: "Sensitive data transmitted over HTTP is intercepted by attackers on the network..." },
                { id: 4, title: "Database Compromise", description: "Encrypted data accessed", duration: 4000, narration: "The attacker gains access to the database and finds poorly encrypted sensitive information..." },
                { id: 5, title: "Complete Data Exposure", description: "All sensitive data compromised", duration: 3000, narration: "With weak cryptography broken, all user passwords, personal data, and financial information is exposed..." }
            ],
            codeExamples: { vulnerable: `// Weak hashing\nconst hash = md5(password);`, secure: `// Strong hashing\nconst hash = await bcrypt.hash(password, 12);` },
            prevention: ["Use strong encryption algorithms", "Implement proper key management", "Use HTTPS everywhere", "Hash passwords with salt"]
        },
        {
            id: "A03",
            title: "Injection",
            difficulty: "Critical",
            estimatedTime: "7 minutes",
            completed: false,
            description: "Untrusted data sent to interpreter as part of command or query",
            scenes: [
                { id: 1, title: "Input Field Discovery", description: "Application accepts user input", duration: 3000, narration: "The application has a search feature that accepts user input without proper validation..." },
                { id: 2, title: "SQL Injection Attempt", description: "Malicious SQL injected into input", duration: 4000, narration: "The attacker injects SQL code into the search field: ' OR '1'='1' --" },
                { id: 3, title: "Database Query Manipulation", description: "Injected code alters database query", duration: 3500, narration: "The malicious input changes the SQL query, bypassing authentication and filters..." },
                { id: 4, title: "Data Extraction", description: "Sensitive data retrieved", duration: 4500, narration: "Using UNION SELECT statements, the attacker extracts sensitive data from other tables..." },
                { id: 5, title: "Full Database Compromise", description: "Complete database access achieved", duration: 3000, narration: "The attacker now has full read/write access to the entire database..." }
            ],
            codeExamples: { vulnerable: `// Vulnerable to SQL injection\nconst query = "SELECT * FROM users WHERE name = '" + userInput + "'";`, secure: `// Using parameterized queries\nconst query = "SELECT * FROM users WHERE name = ?"; db.query(query, [userInput]);` },
            prevention: ["Use parameterized queries", "Input validation and sanitization", "Least privilege database access", "Use ORM frameworks"]
        },
        {
            id: "A04",
            title: "Insecure Design",
            difficulty: "Medium",
            estimatedTime: "5 minutes",
            completed: false,
            description: "Missing or ineffective control design",
            scenes: [
                { id: 1, title: "Password Reset Flaw", description: "Insecure password reset mechanism", duration: 3000, narration: "The password reset feature only asks for username, without additional verification..." },
                { id: 2, title: "Account Enumeration", description: "Valid usernames discovered", duration: 3500, narration: "The attacker uses the password reset to enumerate valid usernames in the system..." },
                { id: 3, title: "Predictable Reset Tokens", description: "Reset tokens are easily guessable", duration: 4000, narration: "The password reset tokens follow a predictable pattern based on timestamp..." },
                { id: 4, title: "Account Takeover", description: "Attacker resets victim's password", duration: 4000, narration: "Using the predictable token, the attacker successfully resets another user's password..." },
                { id: 5, title: "System-wide Compromise", description: "Multiple accounts compromised", duration: 3000, narration: "The design flaw allows the attacker to compromise multiple user accounts systematically..." }
            ],
            codeExamples: { vulnerable: `// Predictable reset tokens\nconst token = Date.now().toString();`, secure: `// Cryptographically secure tokens\nconst token = crypto.randomBytes(32).toString('hex');` },
            prevention: ["Implement secure design patterns", "Use threat modeling", "Multi-factor authentication", "Secure development lifecycle"]
        },
        {
            id: "A05",
            title: "Security Misconfiguration",
            difficulty: "Medium",
            estimatedTime: "5 minutes",
            completed: false,
            description: "Missing appropriate security hardening",
            scenes: [
                { id: 1, title: "Default Configuration Scan", description: "Application running with defaults", duration: 3000, narration: "The application is deployed with default configurations and credentials..." },
                { id: 2, title: "Admin Panel Discovery", description: "Unsecured admin interface found", duration: 3500, narration: "A directory scan reveals an admin panel accessible without authentication..." },
                { id: 3, title: "Default Credentials", description: "Default admin credentials work", duration: 4000, narration: "The admin panel still uses default credentials: admin/admin..." },
                { id: 4, title: "Configuration Exposure", description: "Sensitive configuration files exposed", duration: 4000, narration: "The attacker finds exposed configuration files containing database credentials..." },
                { id: 5, title: "Full System Access", description: "Complete administrative control", duration: 3000, narration: "With admin access and database credentials, the attacker has complete control..." }
            ],
            codeExamples: { vulnerable: `// Default configuration\nconst config = { admin: 'admin', password: 'admin' };`, secure: `// Secure configuration\nconst config = { admin: process.env.ADMIN_USER, password: process.env.ADMIN_PASS };` },
            prevention: ["Change default credentials", "Remove unnecessary features", "Security headers", "Regular security updates"]
        },
        {
            id: "A06",
            title: "Vulnerable and Outdated Components",
            difficulty: "Medium",
            estimatedTime: "5 minutes",
            completed: false,
            description: "Components with known vulnerabilities",
            scenes: [
                { id: 1, title: "Dependency Analysis", description: "Application using outdated libraries", duration: 3000, narration: "The application uses an outdated version of a popular library with known security vulnerabilities..." },
                { id: 2, title: "Vulnerability Discovery", description: "Known CVE identified in component", duration: 3500, narration: "Security researchers have published a critical vulnerability (CVE) in the library version being used..." },
                { id: 3, title: "Exploit Development", description: "Public exploit code becomes available", duration: 4000, narration: "Exploit code is now publicly available, making it easy for attackers to target vulnerable systems..." },
                { id: 4, title: "Remote Code Execution", description: "Attacker gains system access", duration: 4500, narration: "Using the public exploit, the attacker achieves remote code execution on the server..." },
                { id: 5, title: "System Compromise", description: "Full server control achieved", duration: 3000, narration: "The attacker now has complete control over the server and can access all application data..." }
            ],
            codeExamples: { vulnerable: `// Outdated dependencies\n"express": "3.0.0",\n"lodash": "2.4.1"`, secure: `// Updated dependencies\n"express": "^4.18.2",\n"lodash": "^4.17.21"` },
            prevention: ["Regular dependency updates", "Vulnerability scanning", "Use dependency management tools", "Monitor security advisories"]
        },
        {
            id: "A07",
            title: "Identification and Authentication Failures",
            difficulty: "High",
            estimatedTime: "6 minutes",
            completed: false,
            description: "Confirmation of user's identity, authentication, and session management",
            scenes: [
                { id: 1, title: "Weak Password Policy", description: "Application allows weak passwords", duration: 3000, narration: "The application accepts weak passwords like '123456' without any complexity requirements..." },
                { id: 2, title: "Brute Force Attack", description: "Automated password guessing", duration: 4000, narration: "An attacker uses automated tools to try thousands of common passwords against user accounts..." },
                { id: 3, title: "Session Hijacking", description: "Session tokens intercepted", duration: 3500, narration: "Weak session management allows attackers to steal and reuse session tokens..." },
                { id: 4, title: "Account Takeover", description: "Attacker gains user access", duration: 4000, narration: "With compromised credentials and session tokens, the attacker takes over user accounts..." },
                { id: 5, title: "Privilege Abuse", description: "Unauthorized actions performed", duration: 3000, narration: "The attacker performs unauthorized actions using the compromised user accounts..." }
            ],
            codeExamples: { vulnerable: `// No password validation\nif (password.length > 0) {\n  createUser(username, password);\n}`, secure: `// Strong password policy\nif (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {\n  createUser(username, bcrypt.hash(password));\n}` },
            prevention: ["Strong password policies", "Multi-factor authentication", "Account lockout mechanisms", "Secure session management"]
        },
        {
            id: "A08",
            title: "Software and Data Integrity Failures",
            difficulty: "Medium",
            estimatedTime: "5 minutes",
            completed: false,
            description: "Code and infrastructure that does not protect against integrity violations",
            scenes: [
                { id: 1, title: "Unsigned Update Discovery", description: "Application updates without verification", duration: 3000, narration: "The application downloads and installs updates without verifying their authenticity..." },
                { id: 2, title: "Supply Chain Compromise", description: "Malicious code injected in update", duration: 3500, narration: "Attackers compromise the update server and inject malicious code into legitimate updates..." },
                { id: 3, title: "Malicious Update Deployment", description: "Compromised update distributed to users", duration: 4000, narration: "The malicious update is automatically downloaded and installed by unsuspecting users..." },
                { id: 4, title: "Backdoor Installation", description: "Persistent access mechanism established", duration: 4000, narration: "The malicious update installs a backdoor, giving attackers persistent access to user systems..." },
                { id: 5, title: "Data Exfiltration", description: "Sensitive data stolen through backdoor", duration: 3000, narration: "Using the backdoor, attackers silently exfiltrate sensitive user data and credentials..." }
            ],
            codeExamples: { vulnerable: `// No verification\nfetch(updateUrl).then(r => eval(r.text()));`, secure: `// Verify signatures\nif (crypto.verify('sha256', update, publicKey, signature)) {\n  installUpdate(update);\n}` },
            prevention: ["Use digital signatures", "Implement integrity verification", "Monitor supply chain", "Secure CI/CD pipelines"]
        },
        {
            id: "A09",
            title: "Security Logging and Monitoring Failures",
            difficulty: "Medium",
            estimatedTime: "5 minutes",
            completed: false,
            description: "Insufficient logging and monitoring capabilities",
            scenes: [
                { id: 1, title: "Silent Attack Initiation", description: "Attack begins without detection", duration: 3000, narration: "An attacker begins probing the application, but no security events are being logged..." },
                { id: 2, title: "Undetected Intrusion", description: "Successful breach goes unnoticed", duration: 3500, narration: "The attacker successfully breaches the system, but without proper monitoring, the intrusion goes undetected..." },
                { id: 3, title: "Lateral Movement", description: "Attacker explores system undetected", duration: 4000, narration: "The attacker moves laterally through the system, accessing sensitive data without triggering any alerts..." },
                { id: 4, title: "Data Exfiltration", description: "Large amounts of data stolen silently", duration: 4000, narration: "Massive amounts of sensitive data are exfiltrated over weeks without any monitoring systems detecting the breach..." },
                { id: 5, title: "Delayed Discovery", description: "Breach discovered months later", duration: 3000, narration: "The breach is finally discovered months later through external notification, but the damage is already done..." }
            ],
            codeExamples: { vulnerable: `// No logging\nif (auth.failed) {\n  res.status(401).send('Unauthorized');\n}`, secure: `// Comprehensive logging\nlogger.warn('Failed login', { user, ip, timestamp });\nif (auth.failed) {\n  res.status(401).send('Unauthorized');\n}` },
            prevention: ["Implement security logging", "Use SIEM systems", "Monitor security events", "Set up alerting"]
        },
        {
            id: "A10",
            title: "Server-Side Request Forgery (SSRF)",
            difficulty: "High",
            estimatedTime: "6 minutes",
            completed: false,
            description: "Server makes unvalidated requests to arbitrary URLs",
            scenes: [
                { id: 1, title: "URL Parameter Discovery", description: "Application accepts external URL parameters", duration: 3000, narration: "The application has a feature that fetches content from user-provided URLs..." },
                { id: 2, title: "Internal Network Probing", description: "Attacker probes internal network", duration: 4000, narration: "The attacker uses the application to probe internal network services that are not directly accessible..." },
                { id: 3, title: "Service Discovery", description: "Internal services and ports discovered", duration: 3500, narration: "Through SSRF, the attacker discovers internal services like databases, admin panels, and cloud metadata..." },
                { id: 4, title: "Metadata Service Access", description: "Cloud metadata service compromised", duration: 4500, narration: "The attacker accesses cloud metadata services to retrieve sensitive information like API keys and credentials..." },
                { id: 5, title: "Infrastructure Compromise", description: "Full cloud infrastructure access gained", duration: 3000, narration: "Using the stolen cloud credentials, the attacker gains access to the entire cloud infrastructure..." }
            ],
            codeExamples: { vulnerable: `// No URL validation\nfetch(userUrl).then(r => r.text());`, secure: `// Validate URLs\nif (isAllowedDomain(url) && !isPrivateIP(url)) {\n  fetch(url);\n}` },
            prevention: ["Validate user-provided URLs", "Use allowlists", "Block private IP ranges", "Network segmentation"]
        }
    ]
};

// Application State
let appState = {
    currentView: 'dashboard',
    currentVulnerability: null,
    currentScene: 0,
    isPlaying: false,
    animationSpeed: 1.0, // Set to normal speed (1x) by default instead of 3x
    audioEnabled: true,
    completedVulnerabilities: new Set(),
    sceneAnimations: new Map(),
    autoAdvanceTimeout: null
};

// Prevent double init across multiple callers
let __animationPlatformInitialized = false;

function notifyProgressTracker() {
    try {
        if (typeof window.trackAnimationProgress === 'function') {
            window.trackAnimationProgress();
        }
    } catch (e) {}
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        font-size: 14px;
        max-width: 350px;
        animation: slideInFromRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${type === 'error' ? '❌' : type === 'ok' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function showAnimationView(vulnerabilityId) {
    console.log('🎬 showAnimationView called with:', vulnerabilityId);
    
    const vulnerability = COMPLETE_OWASP_DATA.vulnerabilities.find(v => v.id === vulnerabilityId);
    if (!vulnerability) {
        console.error('❌ Vulnerability not found:', vulnerabilityId);
        showNotification('Vulnerability not found', 'error');
        return;
    }
    
    console.log('✅ Found vulnerability:', vulnerability.title, 'with', vulnerability.scenes.length, 'scenes');
    
    appState.currentVulnerability = vulnerability;
    appState.currentScene = 0;
    appState.isPlaying = false;
    appState.animationStartTime = Date.now(); // Track start time for gamification
    
    showView('animation');
    setupAnimationView(vulnerability);
    showScene(0);
}

function showView(viewName) {
    console.log('🔄 Switching to view:', viewName);
    
    const dashboard = document.getElementById('animation-dashboard');
    const player = document.getElementById('animation-player');
    
    console.log('📊 Dashboard element found:', !!dashboard);
    console.log('🎬 Player element found:', !!player);
    
    if (viewName === 'animation') {
        if (dashboard) {
            dashboard.style.display = 'none';
            console.log('✅ Dashboard hidden');
        } else {
            console.warn('⚠️ Dashboard element not found');
        }
        
        if (player) {
            player.classList.remove('hidden');
            player.style.display = 'block';
            console.log('✅ Animation player shown');
        } else {
            console.error('❌ Animation player element not found');
        }
        console.log('🎬 Switched to animation view');
    } else {
        if (dashboard) {
            dashboard.style.display = 'block';
            console.log('✅ Dashboard shown');
        }
        if (player) {
            player.classList.add('hidden');
            player.style.display = 'none';
            console.log('✅ Animation player hidden');
        }
        console.log('📊 Switched to dashboard view');
    }
}

// Animation View Setup
function setupAnimationView(vulnerability) {
    const titleElement = document.getElementById('current-vulnerability-title');
    const difficultyBadge = document.getElementById('difficulty-badge');
    const timeElement = document.getElementById('estimated-time');
    const totalScenesElement = document.getElementById('total-scenes');
    
    if (titleElement) titleElement.textContent = vulnerability.title;
    if (difficultyBadge) {
        difficultyBadge.textContent = vulnerability.difficulty;
        difficultyBadge.className = `difficulty-badge ${vulnerability.difficulty.toLowerCase()}`;
    }
    if (timeElement) timeElement.textContent = vulnerability.estimatedTime;
    if (totalScenesElement) totalScenesElement.textContent = vulnerability.scenes.length;
    
    setupTimeline(vulnerability.scenes);
    updatePreventionContent(vulnerability);
}

function setupTimeline(scenes) {
    const container = document.querySelector('.timeline-phases');
    if (!container) return;
    
    container.innerHTML = scenes.map((scene, index) => `
        <div class="timeline-phase ${index === 0 ? 'active' : ''}" data-phase="${index}">
            <div class="phase-number">${index + 1}</div>
            <div class="phase-title">${scene.title}</div>
            <div class="phase-description">${scene.description}</div>
        </div>
    `).join('');
    
    // Add click handlers for timeline navigation
    container.querySelectorAll('.timeline-phase').forEach((phase, index) => {
        phase.addEventListener('click', () => {
            // Always allow timeline navigation
            navigateToScene(index);
        });
    });
}

function updatePreventionContent(vulnerability) {
    const preventionContent = document.getElementById('prevention-content');
    if (preventionContent && vulnerability.prevention) {
        preventionContent.innerHTML = `
            <ul class="prevention-list">
                ${vulnerability.prevention.map(item => `<li>${item}</li>`).join('')}
            </ul>
        `;
    }
}

// Scene Management
function showScene(sceneIndex) {
    console.log('showScene called with index:', sceneIndex);
    if (!appState.currentVulnerability) {
        console.error('No current vulnerability set');
        return;
    }
    
    const scenes = appState.currentVulnerability.scenes;
    if (sceneIndex < 0 || sceneIndex >= scenes.length) {
        console.error('Invalid scene index:', sceneIndex, 'max:', scenes.length - 1);
        return;
    }
    
    const previousScene = appState.currentScene;
    appState.currentScene = sceneIndex;
    
    console.log('Updating scene from', previousScene, 'to', sceneIndex);
    
    updateTimelineUI(sceneIndex, previousScene);
    notifyProgressTracker();

    const currentSceneEl = document.getElementById('current-scene');
    if (currentSceneEl) currentSceneEl.textContent = sceneIndex + 1;
    
    clearSceneAnimations();
    
    const vulnerabilityId = appState.currentVulnerability.id;
    
    switch (vulnerabilityId) {
        case 'A01':
            renderA01Scene(sceneIndex);
            break;
        case 'A02':
            renderA02Scene(sceneIndex);
            break;
        case 'A03':
            renderA03Scene(sceneIndex);
            break;
        case 'A04':
            renderA04Scene(sceneIndex);
            break;
        case 'A05':
            renderA05Scene(sceneIndex);
            break;
        case 'A06':
            renderA06Scene(sceneIndex);
            break;
        case 'A07':
            renderA07Scene(sceneIndex);
            break;
        case 'A08':
            renderA08Scene(sceneIndex);
            break;
        case 'A09':
            renderA09Scene(sceneIndex);
            break;
        case 'A10':
            renderA10Scene(sceneIndex);
            break;
        default:
            renderGenericScene(scenes[sceneIndex]);
    }
    
    updateNarration(scenes[sceneIndex].narration);
    updateInfoPanelContent(scenes[sceneIndex]);
    updateControls();
    
    // Track progress for navigation flow
    if (window.trackAnimationProgress) {
        window.trackAnimationProgress();
    }
    
    // Ensure scene container is visible and add animations
    const sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
        // Ensure content is visible immediately
        sceneContainer.style.opacity = '1';
        sceneContainer.style.transform = 'translateY(0)';
        sceneContainer.style.display = 'block';
        
        // Force a reflow to ensure styles are applied
        sceneContainer.offsetHeight;
        
        // Add element-specific animations after a short delay
        setTimeout(() => {
            // Find all elements that should be animated
            const fadeInElements = sceneContainer.querySelectorAll('.fade-in, .interactive-scene');
            const animatedElements = sceneContainer.querySelectorAll('.animated-element');
            const pulseElements = sceneContainer.querySelectorAll('.pulse-red, .pulse-green');
            
            console.log('Found elements to animate:', {
                fadeIn: fadeInElements.length,
                animated: animatedElements.length,
                pulse: pulseElements.length
            });
            
            // Animate fade-in elements
            fadeInElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                    el.classList.add('animate-in');
                }, index * 50);
            });
            
            // Animate other elements
            animatedElements.forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add('animate-in');
                }, index * 100);
            });
            
            // Start pulse animations
            pulseElements.forEach(el => {
                if (el.classList.contains('pulse-red')) {
                    el.style.animation = 'pulseRed 1.5s infinite';
                } else if (el.classList.contains('pulse-green')) {
                    el.style.animation = 'pulseGreen 2s infinite';
                }
            });
        }, 200);
    }
}

// A01 Scene Rendering
function renderA01Scene(sceneIndex) {
    console.log('Rendering A01 scene:', sceneIndex);
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found!');
        return;
    }
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔐 Normal Authentication</h3>
                    <p>User logs in successfully with valid credentials</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://securebank.com/login</div>
                    </div>
                    <div class="browser-content">
                        <div style="max-width: 400px; margin: 0 auto; padding: 20px;">
                            <h3>🏦 SecureBank Login</h3>
                            <div style="margin-bottom: 15px;">
                                <label>Username</label>
                                <input type="text" value="john.doe" readonly style="background: #f0f8ff; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <label>Password</label>
                                <input type="password" value="********" readonly style="background: #f0f8ff; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <button class="btn btn--primary" style="width: 100%; animation: pulse 2s infinite;">✅ Login Successful</button>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔓 URL Parameter Manipulation</h3>
                    <p>Attacker modifies user ID in URL parameter</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://securebank.com/profile?userId=<span class="code-highlight">456</span></div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px;">
                            <h3>👤 User Profile</h3>
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <strong>⚠️ URL Changed:</strong> userId parameter modified from 123 to 456
                            </div>
                            <div style="display: grid; gap: 10px;">
                                <div><strong>Name:</strong> Jane Smith</div>
                                <div><strong>Account:</strong> ****5678</div>
                                <div><strong>Balance:</strong> $15,000</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>❌ Authorization Failure</h3>
                    <p>System fails to verify ownership of requested resource</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 12px; padding: 30px; max-width: 500px; margin: 0 auto;">
                        <h3 style="color: #ef4444; margin-bottom: 20px;">🚨 Security Breach</h3>
                        <div style="text-align: left; margin: 20px 0;">
                            <div style="margin-bottom: 10px;"><strong>Expected User:</strong> John Doe (ID: 123)</div>
                            <div style="margin-bottom: 10px;"><strong>Accessed Data:</strong> Jane Smith (ID: 456)</div>
                            <div style="margin-bottom: 10px;"><strong>Authorization Check:</strong> <span style="color: #ef4444;">❌ FAILED</span></div>
                            <div><strong>Data Exposed:</strong> <span style="color: #ef4444;">✓ Personal Info, ✓ Account Balance</span></div>
                        </div>
                        <div style="background: #1a1a1a; color: #e5e5e5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; text-align: left;">
                            <div style="color: #ef4444;">ERROR: No authorization check performed</div>
                            <div>User 123 accessed User 456's data</div>
                            <div style="color: #fbbf24;">WARNING: Potential data breach</div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>⬆️ Privilege Escalation</h3>
                    <p>Attacker gains administrative privileges</p>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 800px; margin: 0 auto;">
                        <div>
                            <h4>🎯 Attack Vector</h4>
                            <div class="browser-mockup" style="font-size: 12px;">
                                <div class="browser-bar">
                                    <div class="address-bar">admin.php?role=<span class="code-highlight">admin</span></div>
                                </div>
                                <div class="browser-content" style="padding: 15px;">
                                    <div style="background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px;">
                                        <strong>Role Parameter Manipulation:</strong><br>
                                        Changed from 'user' to 'admin'
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4>🔓 Admin Access Gained</h4>
                            <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 15px;">
                                <div style="color: #22c55e; margin-bottom: 10px;">✅ Admin Panel Access</div>
                                <div style="color: #22c55e; margin-bottom: 10px;">✅ User Management</div>
                                <div style="color: #22c55e; margin-bottom: 10px;">✅ System Configuration</div>
                                <div style="color: #22c55e;">✅ Database Access</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>💥 Impact Assessment</h3>
                    <p>Complete data breach and system compromise achieved</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.1)); border: 2px solid #ef4444; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #ef4444; margin-bottom: 25px;">🚨 CRITICAL SECURITY BREACH</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;">
                            <div style="text-align: left;">
                                <h5 style="color: #ef4444; margin-bottom: 10px;">Data Compromised:</h5>
                                <div style="font-size: 14px;">• 10,000+ user accounts</div>
                                <div style="font-size: 14px;">• Personal information</div>
                                <div style="font-size: 14px;">• Financial data</div>
                                <div style="font-size: 14px;">• Authentication tokens</div>
                            </div>
                            <div style="text-align: left;">
                                <h5 style="color: #ef4444; margin-bottom: 10px;">System Access:</h5>
                                <div style="font-size: 14px;">• Administrative privileges</div>
                                <div style="font-size: 14px;">• Database modification</div>
                                <div style="font-size: 14px;">• System configuration</div>
                                <div style="font-size: 14px;">• Audit log access</div>
                            </div>
                        </div>
                        <div style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: left;">
                            <div style="color: #ef4444; margin-bottom: 5px;">BREACH SUMMARY:</div>
                            <div>Attack Vector: Broken Access Control</div>
                            <div>Time to Compromise: &lt; 5 minutes</div>
                            <div>Detection: None (Silent breach)</div>
                            <div style="color: #fbbf24; margin-top: 10px;">Estimated Impact: $2.5M+ in damages</div>
                        </div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        const sceneHTML = scenes[sceneIndex]();
        console.log('A01 Generated scene HTML length:', sceneHTML.length);
        container.innerHTML = sceneHTML;
        console.log('A01 Scene rendered successfully');
    } else {
        console.error('A01 Scene not found for index:', sceneIndex);
        container.innerHTML = `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🎬 A01 Scene ${sceneIndex + 1}</h3>
                    <p>Scene content loading...</p>
                </div>
            </div>
        `;
    }
}

// A02 Scene Rendering
function renderA02Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔍 Weak Encryption Discovery</h3>
                    <p>Application uses outdated encryption methods</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div class="crypto-comparison" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 600px; margin: 0 auto;">
                        <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 8px; padding: 20px;">
                            <h4 style="color: #ef4444;">❌ Current (Weak)</h4>
                            <code style="background: #1a1a1a; color: #e5e5e5; padding: 10px; border-radius: 4px; display: block;">
                                MD5: 5d41402abc4b2a76b9719d911017c592
                            </code>
                            <p style="margin-top: 10px; font-size: 12px;">Easily crackable in seconds</p>
                        </div>
                        <div style="background: rgba(34, 197, 94, 0.1); border: 2px solid #22c55e; border-radius: 8px; padding: 20px;">
                            <h4 style="color: #22c55e;">✅ Secure Alternative</h4>
                            <code style="background: #1a1a1a; color: #e5e5e5; padding: 10px; border-radius: 4px; display: block;">
                                bcrypt: $2b$12$LQv3c1yqBWVHxkd0LHAkCO...
                            </code>
                            <p style="margin-top: 10px; font-size: 12px;">Computationally expensive</p>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>💥 Password Hash Cracking</h3>
                    <p>Weak hashes are easily cracked using rainbow tables</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup" style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace; max-width: 600px; margin: 0 auto;">
                        <div style="color: #22c55e;">$ hashcat -m 0 hashes.txt rockyou.txt</div>
                        <div style="margin: 10px 0;">Loading dictionary...</div>
                        <div style="color: #fbbf24;">5d41402abc4b2a76b9719d911017c592:hello</div>
                        <div style="color: #fbbf24;">098f6bcd4621d373cade4e832627b4f6:test</div>
                        <div style="color: #fbbf24;">e99a18c428cb38d5f260853678922e03:abc123</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ 3/3 hashes cracked in 0.2 seconds!</div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>📡 Data Transmission Interception</h3>
                    <p>Unencrypted data intercepted over HTTP</p>
                </div>
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 800px; margin: 0 auto;">
                        <div>
                            <h4>🌐 HTTP Traffic</h4>
                            <div class="browser-mockup">
                                <div class="browser-bar">
                                    <div class="address-bar">🔓 http://webapp.com/login</div>
                                </div>
                                <div class="browser-content" style="padding: 15px;">
                                    <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px;">
                                        <strong>⚠️ Unencrypted Login</strong><br>
                                        Username: john.doe<br>
                                        Password: mypassword123<br>
                                        <small style="color: #ef4444;">Transmitted in plain text!</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4>🕵️ Network Interception</h4>
                            <div class="terminal-mockup" style="font-size: 12px;">
                                <div style="color: #22c55e;">$ wireshark -i eth0</div>
                                <div style="margin: 10px 0;">Capturing packets...</div>
                                <div style="color: #fbbf24;">POST /login HTTP/1.1</div>
                                <div style="color: #fbbf24;">username=john.doe&password=mypassword123</div>
                                <div style="color: #ef4444; margin-top: 10px;">🚨 Credentials intercepted!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🗄️ Database Compromise</h3>
                    <p>Encrypted data accessed with weak protection</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="max-width: 700px; margin: 0 auto;">
                        <h4>💾 Database Analysis</h4>
                        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; margin: 20px 0;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: left;">
                                <div><strong>User ID</strong></div>
                                <div><strong>Username</strong></div>
                                <div><strong>Password Hash</strong></div>
                                <div>1</div>
                                <div>admin</div>
                                <div style="color: #ef4444; font-family: monospace; font-size: 12px;">5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8</div>
                                <div>2</div>
                                <div>john.doe</div>
                                <div style="color: #ef4444; font-family: monospace; font-size: 12px;">ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f</div>
                                <div>3</div>
                                <div>jane.smith</div>
                                <div style="color: #ef4444; font-family: monospace; font-size: 12px;">2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683</div>
                            </div>
                        </div>
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 15px;">
                            <strong style="color: #ef4444;">⚠️ Weak Hashing Detected:</strong> SHA-256 without salt - vulnerable to rainbow table attacks
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>💥 Complete Data Exposure</h3>
                    <p>All sensitive data compromised through cryptographic failures</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.1)); border: 2px solid #ef4444; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #ef4444; margin-bottom: 25px;">🚨 CRYPTOGRAPHIC BREACH</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; text-align: left;">
                            <div>
                                <h5 style="color: #ef4444; margin-bottom: 10px;">Compromised Data:</h5>
                                <div style="font-size: 14px;">• User passwords (cracked)</div>
                                <div style="font-size: 14px;">• Session tokens</div>
                                <div style="font-size: 14px;">• Personal information</div>
                                <div style="font-size: 14px;">• Payment data</div>
                            </div>
                            <div>
                                <h5 style="color: #ef4444; margin-bottom: 10px;">Attack Methods:</h5>
                                <div style="font-size: 14px;">• Rainbow table attacks</div>
                                <div style="font-size: 14px;">• Network interception</div>
                                <div style="font-size: 14px;">• Brute force cracking</div>
                                <div style="font-size: 14px;">• Dictionary attacks</div>
                            </div>
                        </div>
                        <div style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: left;">
                            <div style="color: #ef4444; margin-bottom: 5px;">CRYPTO FAILURE SUMMARY:</div>
                            <div>Weak Algorithms: MD5, SHA-256 (no salt)</div>
                            <div>Unencrypted Transport: HTTP</div>
                            <div>Passwords Cracked: 95% success rate</div>
                            <div style="color: #fbbf24; margin-top: 10px;">Impact: Complete authentication bypass</div>
                        </div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A03 Scene Rendering
function renderA03Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔍 Input Field Discovery</h3>
                    <p>Application accepts user input without validation</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/search</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px;">
                            <h3>🔍 Product Search</h3>
                            <div style="margin: 20px 0;">
                                <label>Search Products:</label>
                                <input type="text" value="laptop" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                            </div>
                            <button class="btn btn--primary">Search</button>
                            <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px;">
                                <strong>Results:</strong> Found 5 laptops matching your search
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>💉 SQL Injection Attempt</h3>
                    <p>Malicious SQL code injected into search field</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/search</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px;">
                            <h3>🔍 Product Search</h3>
                            <div style="margin: 20px 0;">
                                <label>Search Products:</label>
                                <input type="text" value="' OR '1'='1' --" style="width: 100%; padding: 8px; border: 2px solid #ef4444; border-radius: 4px; margin-top: 5px; background: rgba(239, 68, 68, 0.1);">
                            </div>
                            <button class="btn btn--primary">Search</button>
                            <div style="margin-top: 20px; padding: 15px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px;">
                                <strong style="color: #ef4444;">⚠️ SQL Query:</strong><br>
                                <code>SELECT * FROM products WHERE name = '' OR '1'='1' --'</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔄 Query Logic Manipulation</h3>
                    <p>Injected code alters database query logic completely</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="max-width: 700px; margin: 0 auto;">
                        <h4>📊 SQL Query Analysis</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                            <div>
                                <h5 style="color: #22c55e;">✅ Expected Query</h5>
                                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 8px; padding: 15px;">
                                    <code style="font-size: 12px; display: block; text-align: left;">
                                        SELECT * FROM products<br>
                                        WHERE name = 'laptop'
                                    </code>
                                    <div style="margin-top: 10px; font-size: 12px;">Returns: 5 laptop products</div>
                                </div>
                            </div>
                            <div>
                                <h5 style="color: #ef4444;">❌ Malicious Query</h5>
                                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 15px;">
                                    <code style="font-size: 12px; display: block; text-align: left;">
                                        SELECT * FROM products<br>
                                        WHERE name = '' OR '1'='1' --'
                                    </code>
                                    <div style="margin-top: 10px; font-size: 12px; color: #ef4444;">Returns: ALL products (1000+)</div>
                                </div>
                            </div>
                        </div>
                        <div style="background: #1a1a1a; color: #e5e5e5; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: left;">
                            <div style="color: #fbbf24;">INJECTION BREAKDOWN:</div>
                            <div>1. '' - Empty string (false condition)</div>
                            <div>2. OR - Logical operator</div>
                            <div>3. '1'='1' - Always true condition</div>
                            <div>4. -- - SQL comment (ignores rest)</div>
                            <div style="color: #ef4444; margin-top: 10px;">Result: WHERE clause always evaluates to TRUE</div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>📤 Database Data Extraction</h3>
                    <p>Unauthorized database access and sensitive data retrieval</p>
                </div>
                <div style="padding: 20px;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <h4>🗄️ Extracted Database Information</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                            <div>
                                <h5>📋 Products Table</h5>
                                <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 15px; font-size: 12px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                        <strong>ID</strong><strong>Name</strong><strong>Price</strong>
                                        <div>1</div><div>Laptop Pro</div><div>$1299</div>
                                        <div>2</div><div>Gaming PC</div><div>$2499</div>
                                        <div>3</div><div>Tablet</div><div>$599</div>
                                        <div style="color: #ef4444;">...</div><div style="color: #ef4444;">1000+ more</div><div style="color: #ef4444;">...</div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h5>👥 Users Table (UNION Attack)</h5>
                                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 15px; font-size: 12px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                        <strong>Username</strong><strong>Email</strong>
                                        <div>admin</div><div>admin@company.com</div>
                                        <div>john.doe</div><div>john@email.com</div>
                                        <div>jane.smith</div><div>jane@email.com</div>
                                        <div style="color: #ef4444;">...</div><div style="color: #ef4444;">5000+ users</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="terminal-mockup" style="font-size: 12px;">
                            <div style="color: #ef4444;">ADVANCED INJECTION:</div>
                            <div style="color: #22c55e;">$ ' UNION SELECT username,email FROM users --</div>
                            <div style="margin: 10px 0;">Extracting user data...</div>
                            <div style="color: #fbbf24;">✓ 5,000 user records extracted</div>
                            <div style="color: #fbbf24;">✓ Email addresses harvested</div>
                            <div style="color: #ef4444;">⚠️ Sensitive data exposed!</div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>💥 Full Database Compromise</h3>
                    <p>Complete database access and system compromise achieved</p>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.1)); border: 2px solid #ef4444; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto;">
                        <h3 style="color: #ef4444; margin-bottom: 25px;">🚨 SQL INJECTION BREACH</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; text-align: left;">
                            <div>
                                <h5 style="color: #ef4444; margin-bottom: 10px;">Data Compromised:</h5>
                                <div style="font-size: 14px;">• All product information</div>
                                <div style="font-size: 14px;">• User accounts & emails</div>
                                <div style="font-size: 14px;">• Admin credentials</div>
                                <div style="font-size: 14px;">• Financial records</div>
                            </div>
                            <div>
                                <h5 style="color: #ef4444; margin-bottom: 10px;">Attack Capabilities:</h5>
                                <div style="font-size: 14px;">• Data extraction (SELECT)</div>
                                <div style="font-size: 14px;">• Data modification (UPDATE)</div>
                                <div style="font-size: 14px;">• Data deletion (DROP)</div>
                                <div style="font-size: 14px;">• System commands</div>
                            </div>
                        </div>
                        <div style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; text-align: left;">
                            <div style="color: #ef4444; margin-bottom: 5px;">INJECTION IMPACT SUMMARY:</div>
                            <div>Attack Vector: SQL Injection</div>
                            <div>Database: Complete read/write access</div>
                            <div>Records Exposed: 50,000+ entries</div>
                            <div style="color: #fbbf24; margin-top: 10px;">Potential for complete system takeover</div>
                        </div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A04 Scene Rendering - Insecure Design
function renderA04Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔑 Password Reset Flaw</h3>
                    <p>Insecure password reset mechanism discovered</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/reset-password</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px; max-width: 400px; margin: 0 auto;">
                            <h3>🔐 Password Reset</h3>
                            <div style="margin: 20px 0;">
                                <label>Username:</label>
                                <input type="text" value="john.doe" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                            </div>
                            <button class="btn btn--primary" style="width: 100%;">Reset Password</button>
                            <div style="margin-top: 20px; padding: 15px; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px;">
                                <strong style="color: #ef4444;">⚠️ Design Flaw:</strong> Only username required - no email verification!
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🎯 Account Enumeration</h3>
                    <p>Valid usernames discovered through reset feature</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup">
                        <div style="color: #22c55e;">$ python enumerate_users.py</div>
                        <div style="margin: 10px 0;">Testing usernames...</div>
                        <div style="color: #fbbf24;">admin: Valid user found</div>
                        <div style="color: #fbbf24;">john.doe: Valid user found</div>
                        <div style="color: #fbbf24;">jane.smith: Valid user found</div>
                        <div style="color: #ef4444;">test: User not found</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ 3 valid usernames discovered!</div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A05 Scene Rendering - Security Misconfiguration
function renderA05Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔍 Default Configuration Scan</h3>
                    <p>Application running with default settings</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup">
                        <div style="color: #22c55e;">$ nmap -sV target.com</div>
                        <div style="margin: 10px 0;">Scanning ports...</div>
                        <div>22/tcp   open  ssh     OpenSSH 7.4</div>
                        <div>80/tcp   open  http    Apache 2.4.6</div>
                        <div style="color: #fbbf24;">8080/tcp open  http    Tomcat/Admin Panel</div>
                        <div style="color: #ef4444;">9200/tcp open  http    Elasticsearch (no auth)</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ Default services exposed!</div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🚪 Admin Panel Discovery</h3>
                    <p>Unsecured administrative interface found</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://target.com:8080/admin</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px; text-align: center;">
                            <h3>⚙️ Admin Panel</h3>
                            <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h4 style="color: #ef4444;">🔓 NO AUTHENTICATION REQUIRED</h4>
                                <p>Direct access to administrative functions</p>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                                <button class="btn btn--outline" style="border-color: #ef4444; color: #ef4444;">User Management</button>
                                <button class="btn btn--outline" style="border-color: #ef4444; color: #ef4444;">System Config</button>
                                <button class="btn btn--outline" style="border-color: #ef4444; color: #ef4444;">Database Access</button>
                                <button class="btn btn--outline" style="border-color: #ef4444; color: #ef4444;">Log Files</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A06 Scene Rendering - Vulnerable Components
function renderA06Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>📦 Dependency Analysis</h3>
                    <p>Scanning for outdated components</p>
                </div>
                <div style="padding: 20px;">
                    <div style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace;">
                        <div style="color: #22c55e;">$ npm audit</div>
                        <div style="margin: 10px 0;">Scanning dependencies...</div>
                        <div style="color: #ef4444;">┌───────────────┬──────────────────────────────────────┐</div>
                        <div style="color: #ef4444;">│ High          │ Prototype Pollution                  │</div>
                        <div style="color: #ef4444;">├───────────────┼──────────────────────────────────────┤</div>
                        <div style="color: #ef4444;">│ Package       │ lodash                               │</div>
                        <div style="color: #ef4444;">│ Vulnerable    │ <4.17.12                            │</div>
                        <div style="color: #ef4444;">│ Current       │ 2.4.1                               │</div>
                        <div style="color: #ef4444;">└───────────────┴──────────────────────────────────────┘</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ 15 vulnerabilities found (5 high, 10 moderate)</div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🎯 CVE Exploitation</h3>
                    <p>Public exploit targeting vulnerable component</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup">
                        <div style="color: #22c55e;">$ python lodash_exploit.py --target https://target.com</div>
                        <div style="margin: 10px 0;">Exploiting CVE-2019-10744...</div>
                        <div style="color: #fbbf24;">Payload: {"__proto__": {"isAdmin": true}}</div>
                        <div style="color: #fbbf24;">Sending malicious JSON...</div>
                        <div style="color: #22c55e;">✓ Prototype pollution successful</div>
                        <div style="color: #22c55e;">✓ Admin privileges gained</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ Remote code execution achieved!</div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A07 Scene Rendering - Authentication Failures
function renderA07Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🔐 Weak Password Policy</h3>
                    <p>Application accepts insecure passwords</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/register</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px; max-width: 400px; margin: 0 auto;">
                            <h3>📝 Create Account</h3>
                            <div style="margin: 15px 0;">
                                <label>Username:</label>
                                <input type="text" value="user123" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                            </div>
                            <div style="margin: 15px 0;">
                                <label>Password:</label>
                                <input type="password" value="123456" style="width: 100%; padding: 8px; border: 2px solid #ef4444; border-radius: 4px; margin-top: 5px; background: rgba(239, 68, 68, 0.1);">
                            </div>
                            <button class="btn btn--primary" style="width: 100%;">✅ Account Created</button>
                            <div style="margin-top: 15px; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 12px; color: #ef4444;">
                                ⚠️ Weak password accepted without validation
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🤖 Brute Force Attack</h3>
                    <p>Automated password cracking in progress</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup">
                        <div style="color: #22c55e;">$ hydra -l user123 -P passwords.txt https-post-form</div>
                        <div style="margin: 10px 0;">Starting brute force attack...</div>
                        <div style="color: #fbbf24;">Trying: password</div>
                        <div style="color: #fbbf24;">Trying: 123456 ✓ SUCCESS</div>
                        <div style="color: #22c55e;">Login successful: user123:123456</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ Account compromised in 2 attempts!</div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A08 Scene Rendering - Software Integrity Failures
function renderA08Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>📦 Unsigned Update Discovery</h3>
                    <p>Application downloads updates without verification</p>
                </div>
                <div style="padding: 20px;">
                    <div style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h4>🔄 Auto-Update Process</h4>
                        <div style="display: grid; gap: 15px; margin-top: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="color: #22c55e;">✓</span>
                                <span>Check for updates: update-server.com</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="color: #22c55e;">✓</span>
                                <span>Download update package</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="color: #ef4444;">❌</span>
                                <span style="color: #ef4444;">Verify digital signature</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="color: #22c55e;">✓</span>
                                <span>Install update automatically</span>
                            </div>
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                            <strong style="color: #ef4444;">⚠️ No integrity verification!</strong>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🏭 Supply Chain Compromise</h3>
                    <p>Malicious code injected into update server</p>
                </div>
                <div style="padding: 20px;">
                    <div class="terminal-mockup">
                        <div style="color: #ef4444;">ATTACKER PERSPECTIVE:</div>
                        <div style="color: #22c55e;">$ ssh compromised-server</div>
                        <div style="margin: 10px 0;">Accessing update server...</div>
                        <div style="color: #fbbf24;">$ echo 'malicious_payload()' >> update.js</div>
                        <div style="color: #fbbf24;">$ cp update.js /var/www/updates/</div>
                        <div style="color: #22c55e;">✓ Malicious update deployed</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ Supply chain compromised!</div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A09 Scene Rendering - Logging Failures
function renderA09Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>👻 Silent Attack Initiation</h3>
                    <p>Attack begins without any logging</p>
                </div>
                <div style="padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4>🎯 Attacker Activity</h4>
                        <div class="terminal-mockup" style="font-size: 12px;">
                            <div style="color: #ef4444;">$ nmap -sS target.com</div>
                            <div>Port scanning...</div>
                            <div style="color: #ef4444;">$ sqlmap -u "target.com/search"</div>
                            <div>SQL injection testing...</div>
                            <div style="color: #ef4444;">$ hydra -l admin -P pass.txt</div>
                            <div>Brute force attack...</div>
                        </div>
                    </div>
                    <div>
                        <h4>📊 Security Logs</h4>
                        <div style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; color: #6c757d;">
                            <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                            <p>No security events logged</p>
                            <div style="color: #ef4444; font-weight: 600;">⚠️ BLIND SPOT</div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🕳️ Undetected Data Breach</h3>
                    <p>Massive data exfiltration goes unnoticed</p>
                </div>
                <div style="padding: 20px;">
                    <div style="background: #1a1a1a; color: #e5e5e5; padding: 20px; border-radius: 8px; font-family: monospace;">
                        <div style="color: #ef4444;">ATTACKER: Exfiltrating database...</div>
                        <div style="margin: 10px 0;">Downloading user_data.sql (2.3GB)</div>
                        <div style="color: #fbbf24;">Progress: ████████████████████ 100%</div>
                        <div style="color: #22c55e;">✓ 1,000,000 user records stolen</div>
                        <div style="color: #22c55e;">✓ Credit card data extracted</div>
                        <div style="color: #22c55e;">✓ Personal information compromised</div>
                        <div style="margin-top: 15px; color: #ef4444;">⚠️ NO ALERTS TRIGGERED</div>
                        <div style="color: #6c757d;">Security team remains unaware...</div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

// A10 Scene Rendering - SSRF
function renderA10Scene(sceneIndex) {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    const scenes = [
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🌐 URL Parameter Discovery</h3>
                    <p>Application fetches content from user URLs</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/fetch-url</div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px;">
                            <h3>🔗 URL Fetcher Tool</h3>
                            <p>Enter a URL to fetch its content:</p>
                            <div style="margin: 20px 0;">
                                <input type="text" value="https://example.com/api/data" style="width: 70%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <button class="btn btn--primary" style="margin-left: 10px;">Fetch</button>
                            </div>
                            <div style="background: #f0f8ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin-top: 20px;">
                                <strong>Response:</strong> Content fetched successfully
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        () => `
            <div class="interactive-scene fade-in">
                <div class="scene-title">
                    <h3>🎯 Internal Network Probing</h3>
                    <p>SSRF used to scan internal services</p>
                </div>
                <div class="browser-mockup">
                    <div class="browser-bar">
                        <div class="browser-controls">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="address-bar">🔒 https://webapp.com/fetch-url?url=<span class="code-highlight">http://192.168.1.100:3306</span></div>
                    </div>
                    <div class="browser-content">
                        <div style="padding: 20px;">
                            <h3>🔍 Internal Service Discovery</h3>
                            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                <strong style="color: #ef4444;">⚠️ SSRF Attack:</strong> Probing internal network
                            </div>
                            <div class="terminal-mockup" style="font-size: 12px;">
                                <div>Scanning internal network...</div>
                                <div style="color: #22c55e;">192.168.1.100:3306 - MySQL (open)</div>
                                <div style="color: #22c55e;">192.168.1.101:6379 - Redis (open)</div>
                                <div style="color: #22c55e;">192.168.1.102:9200 - Elasticsearch (open)</div>
                                <div style="color: #ef4444;">⚠️ Internal services exposed!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`
    ];
    
    if (scenes[sceneIndex]) {
        container.innerHTML = scenes[sceneIndex]();
    }
}

function renderGenericScene(scene) {
    console.log('Rendering generic scene:', scene.title);
    const container = document.getElementById('scene-container');
    if (!container) {
        console.error('Scene container not found for generic scene!');
        return;
    }
    
    const sceneHTML = `
        <div class="interactive-scene fade-in">
            <div class="scene-title">
                <h3>🛡️ ${scene.title}</h3>
                <p>${scene.description}</p>
            </div>
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎬</div>
                <h4>Animation Scene</h4>
                <p>${scene.description}</p>
                <div style="margin-top: 20px; padding: 20px; background: var(--color-bg-1); border-radius: 8px;">
                    <p style="font-style: italic;">"${scene.narration}"</p>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = sceneHTML;
    console.log('Generic scene rendered successfully');
}

function clearSceneAnimations() {
    const container = document.getElementById('scene-container');
    if (container) {
        container.querySelectorAll('.animated-element').forEach(el => {
            el.style.animation = '';
        });
    }
}

// Animation Controls
function playAnimation() {
    console.log('Starting animation playback');
    appState.isPlaying = true;
    updateControls();
    showNotification('▶️ Animation playing - scenes will advance automatically', 'info');
    
    if (appState.currentVulnerability) {
        autoAdvanceScene();
    }
}

function pauseAnimation() {
    console.log('Pausing animation playback');
    appState.isPlaying = false;
    
    // Clear auto-advance timeout
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
        console.log('Auto-advance timeout cleared');
    }
    
    // Stop progress bar animation
    const progressBar = document.querySelector('.timeline-progress-bar');
    if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
    }
    
    updateControls();
    showNotification('⏸️ Animation paused - use controls to navigate manually', 'info');
}

function restartAnimation() {
    appState.isPlaying = false;
    
    // Clear any existing timeout
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
    }
    
    // Reset progress bar
    const progressBar = document.querySelector('.timeline-progress-bar');
    if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
    }
    
    showScene(0);
    updateControls();
    showNotification('🔄 Animation restarted', 'info');
}

function nextScene() {
    console.log('🎬 nextScene called');
    console.log('Current state:', {
        currentScene: appState.currentScene,
        currentVulnerability: appState.currentVulnerability?.id || 'null',
        isPlaying: appState.isPlaying,
        hasVulnerability: !!appState.currentVulnerability
    });
    
    // Clear any existing timeout
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
    }
    
    if (appState.currentVulnerability && appState.currentScene < appState.currentVulnerability.scenes.length - 1) {
        console.log('Moving to next scene:', appState.currentScene + 1);
        showScene(appState.currentScene + 1);
        
        // If playing, restart auto-advance for new scene
        if (appState.isPlaying) {
            setTimeout(() => {
                autoAdvanceScene();
            }, 200); // Reduced delay for smoother transitions
        }
    } else {
        console.log('Animation completed - no more scenes');
        console.log('Final state:', {
            currentScene: appState.currentScene,
            totalScenes: appState.currentVulnerability?.scenes?.length || 'N/A',
            currentVulnerability: appState.currentVulnerability?.id || 'null'
        });
        completeAnimation();
    }
}

function prevScene() {
    // Clear any existing timeout
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
    }
    
    if (appState.currentScene > 0) {
        showScene(appState.currentScene - 1);
        
        // If playing, restart auto-advance for new scene
        if (appState.isPlaying) {
            setTimeout(() => {
                autoAdvanceScene();
            }, 200); // Reduced delay for smoother transitions
        }
    }
}

function autoAdvanceScene() {
    // Only auto-advance if explicitly playing
    if (!appState.isPlaying || !appState.currentVulnerability) {
        console.log('Auto-advance skipped - not playing or no vulnerability');
        return;
    }
    
    const currentScene = appState.currentVulnerability.scenes[appState.currentScene];
    const duration = Math.max((currentScene.duration || 6000) / appState.animationSpeed, 1000); // Reduced minimum for better responsiveness
    
    // Clear any existing timeout
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
    }
    
    console.log(`Auto-advance set for ${duration}ms for scene: ${currentScene.title}`);
    
    // Start progress bar animation
    updateProgressBar(duration);
    
    appState.autoAdvanceTimeout = setTimeout(() => {
        if (appState.isPlaying && appState.currentVulnerability) {
            console.log('Auto-advancing to next scene');
            nextScene();
        }
    }, duration);
}

// Progress bar animation
function updateProgressBar(duration) {
    const progressBar = document.querySelector('.timeline-progress-bar');
    if (!progressBar) return;
    
    // Reset progress
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    
    // Force reflow
    progressBar.offsetHeight;
    
    // Animate to full width
    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = '100%';
}

function completeAnimation() {
    console.log('🎬 completeAnimation called');
    console.log('State at completion:', {
        currentVulnerability: appState.currentVulnerability?.id || 'null',
        currentScene: appState.currentScene,
        completedVulnerabilities: Array.from(appState.completedVulnerabilities),
        isPlaying: appState.isPlaying
    });
    
    appState.isPlaying = false;
    updateControls();
    
    if (appState.currentVulnerability) {
        console.log('Adding to completed:', appState.currentVulnerability.id);
        appState.completedVulnerabilities.add(appState.currentVulnerability.id);
    } else {
        console.warn('⚠️ No current vulnerability to complete');
    }
    
    // Award XP for completing animation (integrate with gamification system)
    if (window.app && typeof window.app.completeActivity === 'function' && appState.currentVulnerability) {
        console.log('Awarding XP for animation completion:', appState.currentVulnerability.id);
        window.app.completeActivity(appState.currentVulnerability.id, 'animation', {
            timeSpent: Date.now() - (appState.animationStartTime || Date.now())
        });
    } else {
        console.warn('Cannot complete animation - missing app, completeActivity function, or current vulnerability');
        console.log('Debug info:', {
            hasApp: !!window.app,
            hasCompleteActivity: !!(window.app && typeof window.app.completeActivity === 'function'),
            hasCurrentVulnerability: !!appState.currentVulnerability
        });
    }
    
    showCompletionModal();
    updateProgress();
    saveProgress();
    notifyProgressTracker();
}

// UI Update Functions
function updateTimelineUI(currentIndex, previousIndex) {
    const timelinePhases = document.querySelectorAll('.timeline-phase');
    
    timelinePhases.forEach((phase, index) => {
        phase.classList.remove('active', 'completed');
        
        if (index < currentIndex) {
            phase.classList.add('completed');
        } else if (index === currentIndex) {
            phase.classList.add('active');
        }
    });
    
    const progressBar = document.querySelector('.timeline-progress-bar');
    if (progressBar && appState.currentVulnerability) {
        const percentage = ((currentIndex + 1) / appState.currentVulnerability.scenes.length) * 100;
        progressBar.style.width = percentage + '%';
    }
}

function updateControls() {
    const prevBtn = document.getElementById('prev-scene');
    const nextBtn = document.getElementById('next-scene');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    
    if (prevBtn) {
        prevBtn.disabled = appState.currentScene === 0;
        prevBtn.style.opacity = appState.currentScene === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        const isLastScene = appState.currentScene === (appState.currentVulnerability?.scenes.length - 1);
        nextBtn.disabled = isLastScene;
        nextBtn.style.opacity = isLastScene ? '0.5' : '1';
    }
    
    if (playBtn) {
        playBtn.style.display = appState.isPlaying ? 'none' : 'inline-flex';
        playBtn.classList.toggle('active', !appState.isPlaying);
    }
    
    if (pauseBtn) {
        pauseBtn.style.display = appState.isPlaying ? 'inline-flex' : 'none';
        pauseBtn.classList.toggle('active', appState.isPlaying);
    }
}

function updateNarration(text) {
    const subtitleText = document.getElementById('subtitle-text');
    if (subtitleText) {
        subtitleText.textContent = text;
    }
}

function updateInfoPanelContent(scene) {
    // Update info/narration panels to match template structure
    const narrationEl = document.getElementById('scene-narration');
    if (narrationEl) {
        narrationEl.innerHTML = `<p>${scene.narration || ''}</p>`;
    }

    const infoEl = document.getElementById('scene-info');
    if (infoEl) {
        infoEl.innerHTML = `
            <h4>${scene.title || 'Scene Details'}</h4>
            <p>${scene.description || ''}</p>
        `;
    }

    // Update code panel blocks
    if (appState.currentVulnerability && appState.currentVulnerability.codeExamples) {
        const vulnerableBlock = document.getElementById('vulnerable-code');
        const secureBlock = document.getElementById('secure-code');
        const { vulnerable = '// No code example available', secure = '// No code example available' } = appState.currentVulnerability.codeExamples;

        if (vulnerableBlock) {
            vulnerableBlock.innerHTML = `<pre><code>${vulnerable}</code></pre>`;
            vulnerableBlock.classList.add('active');
        }
        if (secureBlock) {
            secureBlock.innerHTML = `<pre><code>${secure}</code></pre>`;
            secureBlock.classList.remove('active');
        }

        // Reset code tab to vulnerable
        document.querySelectorAll('.code-tab').forEach(tab => tab.classList.remove('active'));
        const vulnerableTab = document.querySelector('[data-code="vulnerable"]');
        if (vulnerableTab) vulnerableTab.classList.add('active');
    }

    // Update prevention panel (static per vulnerability)
    if (appState.currentVulnerability && appState.currentVulnerability.prevention) {
        const preventionContent = document.getElementById('prevention-content');
        if (preventionContent) {
            preventionContent.innerHTML = `
                <ul class="prevention-list">
                    ${appState.currentVulnerability.prevention.map(item => `<li>${item}</li>`).join('')}
                </ul>
            `;
        }
    }
}

function updateProgress() {
    const completed = appState.completedVulnerabilities.size;
    const completedCount = document.getElementById('animation-completed-count');
    
    if (completedCount) completedCount.textContent = completed;
}

function saveProgress() {
    localStorage.setItem('owaspAnimationProgress', JSON.stringify({
        completed: Array.from(appState.completedVulnerabilities)
    }));
}

function loadProgress() {
    const saved = localStorage.getItem('owaspAnimationProgress');
    if (saved) {
        const data = JSON.parse(saved);
        appState.completedVulnerabilities = new Set(data.completed || []);
    }
}

// Modal Functions
function showCompletionModal() {
    const modal = document.getElementById('animation-completion-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        const titleEl = document.getElementById('completed-animation-title');
        const scenesEl = document.getElementById('scenes-completed');
        
        if (titleEl && appState.currentVulnerability) {
            titleEl.textContent = appState.currentVulnerability.title;
        }
        if (scenesEl && appState.currentVulnerability) {
            scenesEl.textContent = appState.currentVulnerability.scenes.length;
        }
    }
}

// Vulnerability Card Functions
function populateVulnerabilityCards() {
    const container = document.getElementById('vulnerability-cards') || document.getElementById('vuln-cards');
    if (!container) {
        console.error('Vulnerability cards container not found');
        return;
    }
    
    console.log('Populating vulnerability cards...');
    
    container.innerHTML = COMPLETE_OWASP_DATA.vulnerabilities.map(vuln => {
        const isCompleted = appState.completedVulnerabilities.has(vuln.id);
        
        return `
            <div class="vuln-card ${isCompleted ? 'completed' : ''}" onclick="selectVulnerability('${vuln.id}')">
                <div class="vuln-header">
                    <div class="vuln-id">${vuln.id}</div>
                    ${isCompleted ? '<div class="completion-status">✓</div>' : ''}
                </div>
                <h4 class="vuln-title">${vuln.title}</h4>
                <div class="vuln-meta">
                    <span class="difficulty-badge ${vuln.difficulty.toLowerCase()}">${vuln.difficulty}</span>
                    <span class="time-estimate">${vuln.estimatedTime}</span>
                </div>
                <p class="vuln-description">${vuln.description}</p>
                <div class="vuln-actions">
                    <button class="btn ${isCompleted ? 'btn--outline' : 'btn--primary'}">
                        ${isCompleted ? '🔄 Replay' : '▶️ Start Animation'}
                    </button>
                </div>
                ${isCompleted ? '<div class="completion-badge">✅ Completed</div>' : ''}
            </div>
        `;
    }).join('');
}

function selectVulnerability(vulnerabilityId) {
    console.log('Selecting vulnerability:', vulnerabilityId);
    const vulnerability = COMPLETE_OWASP_DATA.vulnerabilities.find(v => v.id === vulnerabilityId);
    if (vulnerability) {
        console.log('Found vulnerability:', vulnerability.title);
        showAnimationView(vulnerabilityId);
    } else {
        console.error('Vulnerability not found:', vulnerabilityId);
        showNotification(`Vulnerability not found: ${vulnerabilityId}`, 'error');
    }
}
// Manual scene navigation (no auto-advance)
function navigateToScene(sceneIndex) {
    console.log('Manual navigation to scene:', sceneIndex);
    
    // Clear any auto-advance
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
    }
    
    // Stop playing mode
    appState.isPlaying = false;
    updateControls();
    
    // Show the scene
    showScene(sceneIndex);
    
    showNotification(`Scene ${sceneIndex + 1} - Click play to start auto-advance`, 'info');
}

// Switch code tabs
function switchCodeTab(codeType) {
    // Toggle tab active state
    document.querySelectorAll('.code-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`[data-code="${codeType}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Toggle code blocks visibility per template
    const vulnerableBlock = document.getElementById('vulnerable-code');
    const secureBlock = document.getElementById('secure-code');
    if (vulnerableBlock && secureBlock) {
        if (codeType === 'vulnerable') {
            vulnerableBlock.classList.add('active');
            secureBlock.classList.remove('active');
        } else {
            secureBlock.classList.add('active');
            vulnerableBlock.classList.remove('active');
        }
    }
}

// Update narration text
function updateNarration(narrationText) {
    const subtitleElement = document.getElementById('subtitle-text');
    if (subtitleElement && narrationText) {
        subtitleElement.textContent = narrationText;
        subtitleElement.style.opacity = '0';
        setTimeout(() => {
            subtitleElement.style.opacity = '1';
        }, 100);
    }
}

// Update info panel content
// (Removed older duplicate version that targeted non-existent selectors)

// Clear scene animations
function clearSceneAnimations() {
    if (appState.autoAdvanceTimeout) {
        clearTimeout(appState.autoAdvanceTimeout);
        appState.autoAdvanceTimeout = null;
    }
    
    // Clear any existing animations
    const sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
        sceneContainer.style.opacity = '0';
        sceneContainer.style.transform = 'translateY(20px)';
    }
}

// Update timeline UI
function updateTimelineUI(currentIndex, previousIndex) {
    const phases = document.querySelectorAll('.timeline-phase');
    
    // Remove active class from all phases
    phases.forEach(phase => phase.classList.remove('active'));
    
    // Add active class to current phase
    if (phases[currentIndex]) {
        phases[currentIndex].classList.add('active');
    }
    
    console.log(`Timeline updated: ${previousIndex} -> ${currentIndex}`);
}

// Switch panel tabs
function switchPanel(tabName) {
    // Remove active class from all tabs and panels (match template classes)
    document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to selected tab and panel
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}-panel`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

// Animation Control Functions (removed duplicates)

function restartAnimation() {
  console.log('Restart animation clicked');
  appState.currentScene = 0;
  appState.isPlaying = false;
  if (appState.autoAdvanceTimeout) {
    clearTimeout(appState.autoAdvanceTimeout);
    appState.autoAdvanceTimeout = null;
  }
  showScene(0);
  updateControls();
  showNotification('Animation restarted', 'info');
}

// Event Listeners Setup
function setupEventListeners() {
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const prevBtn = document.getElementById('prev-scene');
    const nextBtn = document.getElementById('next-scene');
    const backBtn = document.getElementById('back-to-animation-dashboard');
    const restartBtn = document.getElementById('restart-btn');

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playAnimation();
        });
    }
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            pauseAnimation();
        });
    }
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (appState.currentScene > 0) {
            navigateToScene(appState.currentScene - 1);
        }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (appState.currentVulnerability && appState.currentScene < appState.currentVulnerability.scenes.length - 1) {
            navigateToScene(appState.currentScene + 1);
        }
    });
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showView('dashboard');
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            restartAnimation();
        });
    }
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchPanel(tabName);
        });
    });
    
    // Code tabs
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const codeType = e.target.dataset.code;
            switchCodeTab(codeType);
        });
    });
    
    // Speed control
    const speedControl = document.getElementById('speed-control');
    if (speedControl) {
        if (!speedControl.value) speedControl.value = String(appState.animationSpeed);
        speedControl.addEventListener('change', (e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) {
                appState.animationSpeed = Math.max(0.5, Math.min(3, v));
                showNotification(`Speed set to ${appState.animationSpeed}x`, 'info');
                if (appState.isPlaying) {
                    autoAdvanceScene();
                }
            }
        });
    }
}

// Progress management functions
function loadProgress() {
    try {
        const saved = localStorage.getItem('owasp-animation-progress');
        if (saved) {
            const progress = JSON.parse(saved);
            appState.completedVulnerabilities = new Set(progress.completed || []);
        }
    } catch (e) {
        console.warn('Could not load animation progress:', e);
    }
}

function saveProgress() {
    try {
        const progress = {
            completed: Array.from(appState.completedVulnerabilities),
            lastUpdated: Date.now()
        };
        localStorage.setItem('owasp-animation-progress', JSON.stringify(progress));
    } catch (e) {
        console.warn('Could not save animation progress:', e);
    }
}

function updateProgress() {
    const completedCount = appState.completedVulnerabilities.size;
    const totalCount = COMPLETE_OWASP_DATA.vulnerabilities.length;
    
    const countElement = document.getElementById('animation-completed-count');
    if (countElement) {
        countElement.textContent = completedCount;
    }
    
    // Update progress in main app if available
    if (window.app && window.app.awardXP) {
        // Award XP for animation completion if integrated with main app
        console.log('Animation progress updated:', completedCount, '/', totalCount);
    }
}

// Initialization
function initAnimationPlatform() {
    if (__animationPlatformInitialized) {
        console.log('Animation platform already initialized, skipping.');
        return;
    }
    __animationPlatformInitialized = true;
    loadProgress();
    updateProgress();
    setupEventListeners();
    populateVulnerabilityCards();
}

// Test function for debugging
function testAnimation() {
    console.log('Testing animation system...');
    console.log('Available vulnerabilities:', COMPLETE_OWASP_DATA.vulnerabilities.map(v => v.id));
    
    // Test selecting A01
    selectVulnerability('A01');
}

// Global functions
window.initAnimationPlatform = initAnimationPlatform;
window.selectVulnerability = selectVulnerability;
window.playAnimation = playAnimation;
window.pauseAnimation = pauseAnimation;
window.showScene = showScene;
window.switchPanel = switchPanel;
window.switchCodeTab = switchCodeTab;
window.testAnimation = testAnimation;
window.COMPLETE_OWASP_DATA = COMPLETE_OWASP_DATA;
window.appState = appState;

// Initialize when DOM is ready
function initializeApp() {
    try {
        console.log('Initializing OWASP Animation Platform...');
        console.log('Available vulnerabilities:', COMPLETE_OWASP_DATA.vulnerabilities.length);
    
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        // Test if key elements exist
        const dashboard = document.getElementById('animation-dashboard');
        const player = document.getElementById('animation-player');
        const cardsContainer = document.getElementById('vulnerability-cards') || document.getElementById('vuln-cards');
        
        console.log('Dashboard found:', !!dashboard);
        console.log('Player found:', !!player);
        console.log('Cards container found:', !!cardsContainer);
        
        if (!cardsContainer) {
            console.log('Info: Vulnerability cards container not found - this is normal for non-dashboard pages');
            console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
            // Don't initialize animation platform if we're not on a page that needs it
            return;
        }
        
        initAnimationPlatform();
        console.log('Animation platform initialized successfully');
    }, 100);
    
    } catch (error) {
        console.error('Error initializing animation platform:', error);
        console.error('Stack trace:', error.stack);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

})();
