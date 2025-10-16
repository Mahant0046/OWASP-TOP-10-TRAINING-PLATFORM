/* static/js/app.js – full SPA controller with robust seeding */

class OWASPTrainingPlatform {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentQuestion = 0;
    this.selectedAnswer = null;
    this.currentModuleId = null;
    this.progressChart = null;
    this._chartInitPending = false;

    // Modern gamification system integration
    this.gamificationEnabled = true;

    // The app's data is now primarily a reflection of the StateManager's state.
    this.data = window.stateManager.getState();

    // Subscribe to state changes to keep the UI in sync.
    window.stateManager.subscribe((newState) => {
      console.log('APP: StateManager notified a change. Updating app data and UI.');
      this.data = newState;
      this.syncModuleStatuses(); // Sync module statuses with StateManager
      this.updateUserStats();
      this.loadTabContent(this.currentTab);
    });
  }

  async init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._setup());
    } else {
      await this._setup();
    }
  }

  async _setup() {
    // Wait for StateManager to initialize
    await this.waitForStateManager();
    
    // Bootstrap now primarily ensures the state is loaded and seeded.
    await this.bootstrap();

    // Force sync with the state manager after bootstrap
    this.data = window.stateManager.getState();
    // Sync module statuses with StateManager
    this.syncModuleStatuses();
    
    // Setup event listeners for interactive elements
    this.setupEventListeners();
  }

  async init() {
    console.log('Initializing OWASP Training Platform...');
    
    // Check if this is a forced refresh from assessment completion
    const urlParams = new URLSearchParams(window.location.search);
    const isRefresh = urlParams.has('refresh');
    
    if (isRefresh) {
      console.log('Detected refresh parameter - forcing data reload...');
      // Clear any cached data
      localStorage.removeItem('appState');
    }
    
    // Initialize data first
    await this._ensureSeed();
    
    // Set up tab switching
    document.querySelectorAll('.nav-item').forEach(item => {
      const t = item.getAttribute('data-tab');
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(t);
      });
    });

    this.loadDashboard();
    setTimeout(() => this.initializeProgressChart(), 120);
    
    // Clean up URL if it was a refresh
    if (isRefresh) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async waitForStateManager() {
    // Wait for StateManager to be initialized
    while (!window.stateManager || !window.stateManager.initialized) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('StateManager ready for app initialization');
  }

  async bootstrap() {
    if (window.__BOOTSTRAP__) {
      this._applyBootstrap(window.__BOOTSTRAP__);
      this._ensureSeed();
      return;
    }

    const state = await this._safeGET('/api/bootstrap');
    if (state && typeof state === 'object') {
      this._applyBootstrap(state);
      this._ensureSeed();
      return;
    }

    await this._fallbackBootstrapFromDOM();
    this._ensureSeed();
  }

  _applyBootstrap(state) {
    if (Array.isArray(state.owaspModules)) this.data.owaspModules = state.owaspModules;
    if (state.userProfile) this.data.userProfile = { ...this.data.userProfile, ...state.userProfile };
    if (Array.isArray(state.achievements)) this.data.achievements = state.achievements;
    if (Array.isArray(state.leaderboard)) this.data.leaderboard = state.leaderboard;
    if (state.assessmentQuestions) this.data.assessmentQuestions = state.assessmentQuestions;
    if (state.labProgress) this.data.labProgress = state.labProgress;
    if (state.auth) this.data.auth = state.auth;
    
    // Apply server-side unlocked modules to StateManager
    if (Array.isArray(state.unlocked_modules) && window.stateManager) {
      window.stateManager.state.unlockedModules = new Set(state.unlocked_modules);
      console.log('Applied server unlocked modules:', state.unlocked_modules);
    }
    
    // Apply server-side completed modules
    if (Array.isArray(state.progress) && window.stateManager) {
      const completedModules = state.progress.map(p => p.module_id);
      window.stateManager.state.completedModules = new Set(completedModules);
      console.log('Applied server completed modules:', completedModules);
    }
  }

  syncModuleStatuses() {
    // Sync module statuses with StateManager state
    if (Array.isArray(this.data.owaspModules) && window.stateManager) {
      const unlockedModules = window.stateManager.state.unlockedModules || new Set(['A01']);
      const completedModules = window.stateManager.state.completedModules || new Set();
      
      this.data.owaspModules.forEach(module => {
        if (completedModules.has(module.id)) {
          module.status = 'completed';
        } else if (unlockedModules.has(module.id)) {
          module.status = 'in-progress';
        } else {
          module.status = 'locked';
        }
      });
      
      console.log('📊 Synced module statuses:', this.data.owaspModules.map(m => `${m.id}: ${m.status}`));
    }
  }

  async refreshModuleProgression() {
    // Fetch updated progression from server
    try {
      const response = await fetch('/api/user-progress');
      const result = await response.json();
      
      if (result.success && window.stateManager) {
        // Update StateManager with server data
        window.stateManager.state.unlockedModules = new Set(result.data.unlocked_modules);
        window.stateManager.state.completedModules = new Set(result.data.completed_modules);
        
        // Sync module statuses
        this.syncModuleStatuses();
        
        // Update user stats to reflect new progress
        this.updateUserStats();
        
        // Reload modules display
        this.loadModules();
        
        // Reload dashboard to update progress stats
        this.loadDashboard();
        
        // Force update user stats display
        this.updateUserStats();
        
        // Update progress chart if available
        if (typeof this.initializeProgressChart === 'function') {
          setTimeout(() => this.initializeProgressChart(), 500);
        }
        
        console.log('🔄 Module progression refreshed:', {
          unlocked: result.data.unlocked_modules,
          completed: result.data.completed_modules
        });
        
        return result.data;
      }
    } catch (error) {
      console.error('Error refreshing module progression:', error);
    }
    return null;
  }

  // Auto-refresh when activities are completed
  async handleActivityCompletion(response) {
    if (response && response.refresh_needed) {
      console.log('🔄 Activity completed, refreshing progression...');
      await this.refreshModuleProgression();
      
      // Also refresh bootstrap data to update dashboard stats
      await this.refreshBootstrapData();
      
      // Show success message if module completed
      if (response.module_completed) {
        console.log('🎉 Module completed! Next module unlocked.');
        // You could show a celebration modal here
      }
    }
  }

  async refreshBootstrapData() {
    try {
      console.log('🔄 Refreshing bootstrap data for dashboard stats...');
      const response = await fetch('/api/bootstrap');
      const data = await response.json();
      
      if (data.userProfile) {
        // Update user profile data
        if (this.data && this.data.userProfile) {
          Object.assign(this.data.userProfile, data.userProfile);
        }
        
        // Update dashboard elements
        this.updateUserStats();
        this.loadDashboard();
        
        console.log('✅ Bootstrap data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing bootstrap data:', error);
    }
  }

  _ensureSeed() {
    // Ensure this.data exists
    if (!this.data) {
      this.data = {};
    }
    
    // Initialize userProfile if it doesn't exist
    if (!this.data.userProfile) {
      this.data.userProfile = {
        name: 'Security Learner',
        level: 1,
        totalXP: 0,
        currentXP: 0,
        nextLevelXP: 100,
        modulesCompleted: 0,
        streak: 0,
        joinDate: new Date().toLocaleDateString(),
        lastActivity: null,
        badgesEarned: [],
        completedActivities: {
          modules: new Set(),
          animations: new Set(),
          labs: new Set(),
          assessments: new Set()
        }
      };
    }
    
    // Ensure completedActivities exists and has proper structure
    if (!this.data.userProfile.completedActivities) {
      this.data.userProfile.completedActivities = {
        modules: new Set(),
        animations: new Set(),
        labs: new Set(),
        assessments: new Set()
      };
    }
    
    if (!Array.isArray(this.data.owaspModules) || this.data.owaspModules.length === 0) {
      // Get unlocked and completed modules from StateManager
      const unlockedModules = (window.stateManager && window.stateManager.state && window.stateManager.state.unlockedModules) ? window.stateManager.state.unlockedModules : new Set(["A01"]);
      const completedModules = (window.stateManager && window.stateManager.state && window.stateManager.state.completedModules) ? window.stateManager.state.completedModules : new Set();
      
      // Determine status for each module based on StateManager state
      const getModuleStatus = (moduleId) => {
        if (completedModules.has(moduleId)) return 'completed';
        if (unlockedModules.has(moduleId)) return 'in-progress';
        return 'locked';
      };
      
      this.data.owaspModules = [
        { id:"A01", title:"Broken Access Control", points:200, difficulty:"Medium", status:getModuleStatus("A01"), labAvailable:true, description:"Prevent users from acting outside intended permissions." },
        { id:"A02", title:"Cryptographic Failures", points:250, difficulty:"Hard", status:getModuleStatus("A02"), labAvailable:true, description:"Crypto mistakes that expose sensitive data." },
        { id:"A03", title:"Injection", points:300, difficulty:"Hard", status:getModuleStatus("A03"), labAvailable:true, description:"Untrusted data to an interpreter as part of commands/queries." },
        { id:"A04", title:"Insecure Design", points:200, difficulty:"Medium", status:getModuleStatus("A04"), labAvailable:true, description:"Design flaws and architectural security issues." },
        { id:"A05", title:"Security Misconfiguration", points:150, difficulty:"Easy", status:getModuleStatus("A05"), labAvailable:true, description:"Most common issue: default configs, verbose errors, etc." },
        { id:"A06", title:"Vulnerable & Outdated Components", points:200, difficulty:"Medium", status:getModuleStatus("A06"), labAvailable:true, description:"Using components with known vulnerabilities." },
        { id:"A07", title:"Identification & Authentication Failures", points:200, difficulty:"Medium", status:getModuleStatus("A07"), labAvailable:true, description:"Auth/session problems." },
        { id:"A08", title:"Software & Data Integrity Failures", points:250, difficulty:"Hard", status:getModuleStatus("A08"), labAvailable:true, description:"Trust in updates/CI/CD without integrity." },
        { id:"A09", title:"Security Logging & Monitoring Failures", points:150, difficulty:"Easy", status:getModuleStatus("A09"), labAvailable:true, description:"Insufficient logging/monitoring and poor response." },
        { id:"A10", title:"Server-Side Request Forgery (SSRF)", points:250, difficulty:"Hard", status:getModuleStatus("A10"), labAvailable:true, description:"Fetching remote resources without validating user-supplied URLs." }
      ];
    }
    if (!Array.isArray(this.data.achievements) || this.data.achievements.length === 0) {
      const earnedFirst = (this.data.userProfile && this.data.userProfile.modulesCompleted || 0) > 0;
      this.data.achievements = [
        { id:1, name:"First Steps", description:"Complete your first module", icon:"🎯", earned: earnedFirst },
        { id:2, name:"Access Control Master", description:"Master Broken Access Control (A01)", icon:"🔐", earned:false },
        { id:3, name:"Crypto Expert", description:"Master Cryptographic Failures (A02)", icon:"🔒", earned:false },
        { id:4, name:"Injection Hunter", description:"Master Injection vulnerabilities (A03)", icon:"💉", earned:false },
        { id:5, name:"Speed Learner", description:"Maintain a 7-day learning streak", icon:"🔥", earned:false },
        { id:6, name:"OWASP Master", description:"Complete all 10 OWASP modules", icon:"🏆", earned:false },
        { id:7, name:"Level 5 Hero", description:"Reach Level 5", icon:"⭐", earned:false },
        { id:8, name:"Animation Enthusiast", description:"Watch 5 complete animations", icon:"🎬", earned:false },
        { id:9, name:"Lab Warrior", description:"Complete 5 hands-on labs", icon:"🧪", earned:false },
        { id:10, name:"Assessment Ace", description:"Pass 5 assessments with 80%+ score", icon:"📝", earned:false }
      ];
    }
    
    if (!Array.isArray(this.data.leaderboard) || this.data.leaderboard.length === 0) {
      this.data.leaderboard = [
        { name: "Alex Chen", level: 8, totalXP: 4200, modulesCompleted: 8, streak: 15, avatar: "🥇" },
        { name: "Sarah Johnson", level: 7, totalXP: 3800, modulesCompleted: 7, streak: 12, avatar: "🥈" },
        { name: "Mike Rodriguez", level: 6, totalXP: 2900, modulesCompleted: 6, streak: 8, avatar: "🥉" },
        { name: "Emily Davis", level: 5, totalXP: 2200, modulesCompleted: 5, streak: 5, avatar: "👩‍💻" },
        { name: "David Kim", level: 4, totalXP: 1800, modulesCompleted: 4, streak: 3, avatar: "👨‍💻" },
        { name: "Lisa Wang", level: 4, totalXP: 1650, modulesCompleted: 3, streak: 7, avatar: "👩‍🔬" },
        { name: "Tom Wilson", level: 3, totalXP: 1200, modulesCompleted: 3, streak: 2, avatar: "👨‍🔬" },
        { name: this.data.userProfile?.name || 'You', level: this.data.userProfile?.level || 1, totalXP: this.data.userProfile?.totalXP || 0, modulesCompleted: this.data.userProfile?.modulesCompleted || 0, streak: this.data.userProfile?.streak || 0, avatar: "🛡️" }
      ];
    }
    if (!this.data.assessmentQuestions || Object.keys(this.data.assessmentQuestions).length === 0) {
      this.data.assessmentQuestions = {
        A01: [
          { question:"What commonly causes Broken Access Control?", options:["Missing/ineffective authorization checks","Weak TLS","Pretty UI","CDN config"], correct:0 },
          { question:"A clear example of BAC?", options:["Modifying a URL to access another user’s resource","Brute-forcing a password","Adding CSP headers","Using HTTP/2"], correct:0 }
        ],
        A02: [{ question:"Bad crypto practice?", options:["Storing plaintext passwords","Using AES-GCM"], correct:0 }],
        A03: [{ question:"Most common injection?", options:["Command injection","SQL injection","LDAP injection","XPath injection"], correct:1 }]
      };
    }
  }

  async _fallbackBootstrapFromDOM() {
    const readInt = (sel) => {
      const el = document.querySelector(sel);
      return el ? parseInt((el.textContent || '0').replace(/[^\d]/g, ''), 10) || 0 : 0;
    };
    const nameEl = document.getElementById('username');
    
    // Ensure userProfile exists before accessing it
    if (!this.data.userProfile) {
      this._ensureSeed();
    }
    
    const prof = this.data.userProfile;
    prof.name = nameEl ? nameEl.textContent.trim() : prof.name;
    prof.modulesCompleted = readInt('#completed-modules');
    prof.totalXP = readInt('#total-xp');
    prof.currentXP = readInt('#current-xp');
    prof.nextLevelXP = readInt('#next-level-xp') || 1000;

    const apiProg = await this._safeGET('/api/progress');
    if (apiProg && apiProg.completed) {
      const done = new Set(apiProg.completed);
      this.data.owaspModules.forEach(m => { if (done.has(m.id)) m.status = 'completed'; });
      if (typeof apiProg.xp === 'number') prof.totalXP = apiProg.xp;
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const navLink = e.target.closest('.nav-item');
      if (navLink && navLink.dataset.tab) {
        const tab = navLink.dataset.tab;
        if (location.pathname === '/dashboard' || location.pathname === '/' || location.pathname === '') {
          e.preventDefault();
          this.switchTab(tab);
          if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
        }
        return;
      }

      if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) { this.closeModal(); return; }
      if (e.target.classList.contains('modal')) { this.closeModal(); return; }

      const moduleCard = e.target.closest('[data-module-id]');
      if (moduleCard) { this.openModuleDetail(moduleCard.dataset.moduleId); return; }

      const labCard = e.target.closest('[data-lab-id]');
      if (labCard) { this.startLab(labCard.dataset.labId); return; }

      const assessCard = e.target.closest('[data-assessment]');
      if (assessCard) { 
        const moduleId = assessCard.dataset.assessment;
        // Navigate to dedicated assessment page instead of modal
        window.location.href = `/assessment/${moduleId}`;
        return; 
      }

      if (e.target.id === 'submit-answer') { this.submitAnswer(); return; }
      if (e.target.id === 'next-question') { this.nextQuestion(); return; }
      if (e.target.id === 'close-assessment') { this.closeModal(); return; }
      
      // Handle start module button clicks
      if (e.target.id === 'start-module') {
        e.preventDefault();
        console.log('Start module button clicked via global listener');
        
        // Get the current module ID from the modal title
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
          const titleText = modalTitle.textContent;
          const moduleId = titleText.split(':')[0]; // Extract A01, A02, etc.
          console.log('Extracted module ID:', moduleId);
          // Use the new learning path system
          if (window.learningPath && window.gamificationEngine) {
            console.log('Starting module with new learning path system');
            
            // Check if module is unlocked
            if (window.gamificationEngine.isModuleUnlocked(moduleId)) {
              window.learningPath.startActivity(moduleId, 'documentation');
              this.closeModal(); // Close the module detail modal
            } else {
              console.log('Module is locked:', moduleId);
              this.showError(`Module ${moduleId} is locked. Complete previous modules first.`);
            }
          } else {
            console.log('Learning path system not available, using fallback');
            this.startLearningPath(moduleId);
          }
        } else {
          console.error('Could not determine module ID from modal');
        }
        return;
      }
      
      // Handle documentation link clicks
      const docLink = e.target.closest('a[href*="docs/"]');
      if (docLink && docLink.href.includes('.md')) {
        this.trackDocumentationAccess(docLink.href);
        return;
      }
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (btn && !btn.disabled) {
        btn.style.transform = 'scale(0.97)';
        setTimeout(() => btn.style.transform = 'scale(1)', 120);
      }
    });
  }

  switchTab(tabName) {
    const target = document.getElementById(tabName);
    if (!target) return;

    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
    const targetNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (targetNav) targetNav.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    target.classList.add('active');

    this.currentTab = tabName;
    this.loadTabContent(tabName);

    if (location.pathname === '/dashboard' || location.pathname === '/' || location.pathname === '') {
      if (location.hash !== `#${tabName}`) history.replaceState(null, '', `#${tabName}`);
    }
  }

  loadTabContent(tabName) {
    switch (tabName) {
      case 'dashboard': this.loadDashboard(); break;
      case 'modules': this.loadModules(); break;
      case 'documentation': this.loadDocumentation(); break;
      case 'animations': this.loadAnimations(); break;
      case 'labs': this.loadLabs(); break;
      case 'assessments': this.loadAssessments(); break;
      case 'leaderboard': this.loadLeaderboard(); break;
      case 'profile': this.loadProfile(); break;
      case 'certificates': this.loadCertificates(); break;
    }
  }

  updateUserStats() {
    const p = this.data.userProfile || {};
    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
    set('username', p.name||'Security Learner');
    set('completed-modules', window.stateManager ? window.stateManager.state.completedModules.size : 0);
    set('total-xp', p.totalXP||0);
    set('badges-earned', (p.badgesEarned||[]).length);
    set('streak-days', p.streak||0);
    set('current-level', p.level||1);
    set('current-xp', p.currentXP||0);
    set('next-level-xp', p.nextLevelXP||1000);
    const pct = (p.currentXP||0) / Math.max(1,(p.nextLevelXP||1000)) * 100;
    const fill = document.getElementById('xp-progress');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  async loadDashboard(){ 
    // Refresh data from server first
    await this.refreshDashboardData();
    this.loadRecentAchievements(); 
    setTimeout(()=>this.initializeProgressChart(), 120); 
  }

  async refreshDashboardData() {
    try {
      console.log('📊 Refreshing dashboard data from server...');
      const response = await fetch('/api/bootstrap');
      const data = await response.json();
      
      if (data.userProfile) {
        // Update user profile data
        this.data.userProfile = { ...this.data.userProfile, ...data.userProfile };
        console.log('📊 Dashboard stats updated:', {
          level: data.userProfile.level,
          totalXP: data.userProfile.totalXP,
          modulesCompleted: data.userProfile.modulesCompleted,
          streak: data.userProfile.streak
        });
        
        // Force update user stats display
        this.updateUserStats();
      }
      
      // Update module progression data
      if (data.unlocked_modules) {
        this.data.unlocked_modules = data.unlocked_modules;
        console.log('📊 Unlocked modules updated:', data.unlocked_modules);
        
        // Update StateManager if available
        if (window.stateManager) {
          data.unlocked_modules.forEach(moduleId => {
            if (!window.stateManager.isModuleUnlocked(moduleId)) {
              window.stateManager.state.unlockedModules.add(moduleId);
            }
          });
        }
      }
      
      // Also refresh modules display
      this.loadModules();
      
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  }

  loadRecentAchievements() {
    const c = document.getElementById('recent-badges'); if(!c) return;
    const achievements = Array.isArray(this.data.achievements) ? this.data.achievements : (this.data.achievements instanceof Set ? Array.from(this.data.achievements) : []);
    const earned = achievements.filter(a=>a && a.earned);
    c.innerHTML = earned.length
      ? earned.map(a=>`
        <div class="badge-item">
          <div class="badge-icon">${a.icon}</div>
          <div class="badge-content"><h4>${a.name}</h4><p>${a.description}</p></div>
        </div>`).join('')
      : `<p>No badges yet — complete a lab to earn one.</p>`;
  }

  loadModules() {
    // Check if we're on the dashboard tab first
    const dashboardTab = document.getElementById("dashboard");
    if (!dashboardTab || dashboardTab.style.display === 'none') {
      console.log("Not on dashboard tab, skipping module loading");
      return;
    }
    
    const c = document.getElementById("modules-container"); 
    if(!c) { 
      console.error("modules-container element not found"); 
      // Only retry a few times to avoid infinite loop
      if (!this.moduleLoadRetries) this.moduleLoadRetries = 0;
      if (this.moduleLoadRetries < 5) {
        this.moduleLoadRetries++;
        setTimeout(() => this.loadModules(), 200);
      }
      return; 
    } 
    
    // Reset retry counter on success
    this.moduleLoadRetries = 0;
    console.log("Loading modules, data available:", !!this.data, "owaspModules:", !!this.data?.owaspModules);
    if (!this.data || !this.data.owaspModules) { console.error("No modules data available"); this._ensureSeed(); if (!this.data.owaspModules) return; } c.innerHTML = this.data.owaspModules.map(m=>{
      // Check module status from the central StateManager
      const isUnlocked = window.stateManager.isModuleUnlocked(m.id);
      const isCompleted = window.stateManager.isModuleCompleted(m.id);
      let moduleStatus = 'locked';

      if (isCompleted) {
        moduleStatus = 'completed';
      } else if (isUnlocked) {
        moduleStatus = 'available';
      }

      console.log(`Module ${m.id}: unlocked=${isUnlocked}, completed=${isCompleted}, status=${moduleStatus}`);
      
      const lp = this.data.labProgress[m.id];
      const labStatus = lp ? (lp.status || 'started') : (m.labAvailable ? 'not-started' : 'unavailable');
      const labChip = m.labAvailable ? `<span class="lab-status ${labStatus==='completed'?'available':'unavailable'}">${labStatus}</span>` : '';
      const progress = this.getModuleProgress(m.id);
      const progressBar = progress > 0 ? `
        <div class="module-progress">
          <div class="progress-bar-small">
            <div class="progress-fill-small" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text-small">${Math.round(progress)}% Complete</span>
        </div>
      ` : '';
      
      // Build a safe filename from the module title:
      // - replace spaces with hyphens
      // - remove non-alphanumeric/hyphen characters
      // - collapse multiple hyphens into one
      // - trim leading/trailing hyphens
      const sanitizedTitle = m.title
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const docFileName = `${m.id}-${sanitizedTitle}.md`;
      
      // Different button based on unlock status
      const moduleButton = isUnlocked 
        ? `<button class="btn btn--primary btn--sm" onclick="window.location.href = '/docs/${docFileName}'">
             <i class="fas fa-play"></i> Start Module
           </button>`
        : `<button class="btn btn--outline btn--sm" disabled>
             <i class="fas fa-lock"></i> Locked
           </button>`;
      
      return `
      <div class="module-card ${moduleStatus} ${!isUnlocked ? 'locked' : ''}" data-module-id="${m.id}">
        <div class="module-header"><div class="module-id">${m.id}</div><div class="module-status ${moduleStatus}">${moduleStatus.replace('-', ' ')}</div></div>
        <h3 class="module-title">${m.title}</h3>
        <p class="module-description">${m.description || ''}</p>
        ${progressBar}
        <div class="module-actions" style="margin: 16px 0; display: flex; justify-content: center;">
          ${moduleButton}
        </div>
        <div class="module-footer">
          <span class="difficulty-badge difficulty-${(m.difficulty||'Medium').toLowerCase()}">${m.difficulty||'Medium'}</span>
          <span class="module-points"><i class="fas fa-star"></i> ${m.points} XP</span>
          ${labChip}
        </div>
      </div>`;
    }).join('');
  }

  loadDocumentation() {
    const container = document.getElementById('documentation-container');
    if (!container) return;

    const documentationModules = [
      { id: 'A01', title: 'Broken Access Control', difficulty: 'beginner', studyTime: '4-5 hours', xp: 50, topics: ['Authorization', 'Privilege Escalation', 'IDOR'], docFile: 'A01-Broken-Access-Control.md' },
      { id: 'A02', title: 'Cryptographic Failures', difficulty: 'intermediate', studyTime: '5-6 hours', xp: 50, topics: ['Encryption', 'Hashing', 'Key Management'], docFile: 'A02-Cryptographic-Failures.md' },
      { id: 'A03', title: 'Injection', difficulty: 'intermediate', studyTime: '6-7 hours', xp: 50, topics: ['SQL Injection', 'NoSQL Injection', 'Command Injection'], docFile: 'A03-Injection.md' },
      { id: 'A04', title: 'Insecure Design', difficulty: 'advanced', studyTime: '5-6 hours', xp: 50, topics: ['Threat Modeling', 'Secure Architecture', 'Design Patterns'], docFile: 'A04-Insecure-Design.md' },
      { id: 'A05', title: 'Security Misconfiguration', difficulty: 'beginner', studyTime: '3-4 hours', xp: 50, topics: ['Server Hardening', 'Default Configurations', 'Security Headers'], docFile: 'A05-Security-Misconfiguration.md' },
      { id: 'A06', title: 'Vulnerable and Outdated Components', difficulty: 'beginner', studyTime: '3-4 hours', xp: 50, topics: ['Dependency Management', 'Vulnerability Scanning', 'Component Inventory'], docFile: 'A06-Vulnerable-Outdated-Components.md' },
      { id: 'A07', title: 'Identification and Authentication Failures', difficulty: 'intermediate', studyTime: '5-6 hours', xp: 50, topics: ['Authentication', 'Session Management', 'MFA'], docFile: 'A07-Identification-Authentication-Failures.md' },
      { id: 'A08', title: 'Software and Data Integrity Failures', difficulty: 'advanced', studyTime: '4-5 hours', xp: 50, topics: ['Supply Chain Security', 'CI/CD Security', 'Code Signing'], docFile: 'A08-Software-Data-Integrity-Failures.md' },
      { id: 'A09', title: 'Security Logging and Monitoring Failures', difficulty: 'advanced', studyTime: '4-5 hours', xp: 50, topics: ['Security Logging', 'SIEM Integration', 'Incident Response'], docFile: 'A09-Security-Logging-Monitoring-Failures.md' },
      { id: 'A10', title: 'Server-Side Request Forgery (SSRF)', difficulty: 'intermediate', studyTime: '3-4 hours', xp: 50, topics: ['SSRF Attacks', 'URL Validation', 'Network Security'], docFile: 'A10-Server-Side-Request-Forgery.md' }
    ];

    container.innerHTML = documentationModules.map(doc => `
      <div class="doc-card" data-difficulty="${doc.difficulty}">
        <div class="doc-header">
          <span class="module-id">${doc.id}</span>
          <span class="difficulty-badge difficulty-${doc.difficulty}">${doc.difficulty}</span>
        </div>
        <h3 class="doc-title">${doc.title}</h3>
        <div class="doc-meta">
          <span><i class="fas fa-clock"></i> ${doc.studyTime}</span>
          <span><i class="fas fa-star"></i> ${doc.xp} XP</span>
          <span><i class="fas fa-tags"></i> ${doc.topics.length} topics</span>
        </div>
        <div class="doc-topics">
          ${doc.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
        </div>
        <div class="doc-actions">
          <a href="docs/${doc.docFile}" target="_blank" class="btn btn--primary btn--sm" onclick="window.app.trackDocumentationAccess('docs/${doc.docFile}')">
            <i class="fas fa-book-open"></i> View Documentation
          </a>
          <button class="btn btn--outline btn--sm" onclick="window.app.openModuleDetail('${doc.id}')">
            <i class="fas fa-play"></i> Start Module
          </button>
        </div>
      </div>
    `).join('');

    // Setup search and filter
    this.setupDocumentationSearch(documentationModules);
  }

  setupDocumentationSearch(modules) {
    const searchInput = document.getElementById('doc-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = modules.filter(m =>
          m.title.toLowerCase().includes(query) ||
          m.topics.some(t => t.toLowerCase().includes(query))
        );
        this.renderDocumentationCards(filtered);
      });
    }

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        const filtered = filter === 'all' ? modules : modules.filter(m => m.difficulty === filter);
        this.renderDocumentationCards(filtered);
      });
    });
  }

  renderDocumentationCards(modules) {
    const container = document.getElementById('documentation-container');
    if (!container) return;

    container.innerHTML = modules.map(doc => `
      <div class="doc-card" data-difficulty="${doc.difficulty}">
        <div class="doc-header">
          <span class="module-id">${doc.id}</span>
          <span class="difficulty-badge difficulty-${doc.difficulty}">${doc.difficulty}</span>
        </div>
        <h3 class="doc-title">${doc.title}</h3>
        <div class="doc-meta">
          <span><i class="fas fa-clock"></i> ${doc.studyTime}</span>
          <span><i class="fas fa-star"></i> ${doc.xp} XP</span>
          <span><i class="fas fa-tags"></i> ${doc.topics.length} topics</span>
        </div>
        <div class="doc-topics">
          ${doc.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
        </div>
        <div class="doc-actions">
          <a href="docs/${doc.docFile}" target="_blank" class="btn btn--primary btn--sm" onclick="window.app.trackDocumentationAccess('docs/${doc.docFile}')">
            <i class="fas fa-book-open"></i> View Documentation
          </a>
          <button class="btn btn--outline btn--sm" onclick="window.app.openModuleDetail('${doc.id}')">
            <i class="fas fa-play"></i> Start Module
          </button>
        </div>
      </div>
    `).join('');
  }

  loadAnimations() {
    // Check if any animations are unlocked through learning flow
    let hasUnlockedAnimations = false;
    if (window.learningPath) {
      // Check if any module has completed documentation (which unlocks animations)
      const modules = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10'];
      hasUnlockedAnimations = modules.some(moduleId => 
        window.learningPath.isActivityUnlocked(moduleId, 'animation')
      );
    }
    
    const animationDashboard = document.getElementById('animation-dashboard');
    const animationPlayer = document.getElementById('animation-player');
    
    if (animationDashboard) {
      if (false) {
        // Show locked state message
        animationDashboard.innerHTML = `
          <div class="locked-content">
            <div class="lock-icon">🔒</div>
            <h2>Animations Locked</h2>
            <p>Complete the documentation for any module to unlock animations.</p>
            <p>Start with <strong>A01 - Broken Access Control</strong> documentation to begin your learning journey.</p>
            <button class="btn btn--primary" onclick="window.app.switchTab('modules')">Go to Learning Modules</button>
          </div>
        `;
      } else {
        animationDashboard.style.display = 'block';
      }
    }
    
    if (animationPlayer) animationPlayer.classList.add('hidden');
    
    // Initialize animation platform if not already done and animations are unlocked
    if (hasUnlockedAnimations && window.initAnimationPlatform) {
      window.initAnimationPlatform();
    }
  }

  loadLabs() {
    const c = document.getElementById('labs-container'); if(!c) return;
    if (!this.data || !this.data.owaspModules) { console.error("No modules data available"); this._ensureSeed(); if (!this.data.owaspModules) return; } c.innerHTML = this.data.owaspModules.map(m=>{
      const lp = this.data.labProgress[m.id];
      const progress = lp ? (lp.status || 'started') : (m.labAvailable ? 'not-started' : 'coming-soon');
      
      // Check if lab is unlocked through learning flow
      let isUnlocked = m.labAvailable;
      if (window.learningPath && m.labAvailable) {
        isUnlocked = window.learningPath.isActivityUnlocked(m.id, 'lab');
      }
      
      const badge = isUnlocked
        ? `<div class="lab-status ${progress==='completed'?'available':'unavailable'}">${progress}</div>`
        : '<div class="lab-status locked">🔒 locked</div>';
        
      return `
      <div class="lab-card ${isUnlocked ? 'available':'locked'}" data-lab-id="${m.id}">
        <div class="module-header"><div class="module-id">${m.id}</div>${badge}</div>
        <h3 class="module-title">${m.title} Lab</h3>
        <p class="module-description">${isUnlocked ? `Hands-on practice with ${m.title.toLowerCase()} vulnerabilities.` : 'Complete documentation to unlock this lab.'}</p>
        <div class="module-footer">
          ${isUnlocked
            ? `<button class="btn btn--primary btn--sm">Open Lab</button>`
            : '<button class="btn btn--secondary btn--sm" disabled>🔒 Locked</button>'}
        </div>
      </div>`;
    }).join('');
  }

  loadAssessments() {
    const c = document.getElementById('assessments-container'); if(!c) return;
    if (!this.data || !this.data.owaspModules) { console.error("No modules data available"); this._ensureSeed(); if (!this.data.owaspModules) return; } c.innerHTML = this.data.owaspModules.map(m=>{
      const qcount = (this.data.assessmentQuestions[m.id]?.length) ?? 3;
      
      // Check if assessment is unlocked through learning flow
      let isUnlocked = true;
      if (window.learningPath) {
        isUnlocked = window.learningPath.isActivityUnlocked(m.id, 'quiz');
      }
      
      return `
        <div class="assessment-card ${isUnlocked ? 'available' : 'locked'}" data-assessment="${m.id}">
          <div class="module-header">
            <div class="module-id">${m.id}</div>
            <div class="assessment-type">${isUnlocked ? 'Quiz' : '🔒 Locked'}</div>
          </div>
          <h3 class="module-title">${m.title} Assessment</h3>
          <p class="module-description">${isUnlocked ? `Test your knowledge of ${m.title.toLowerCase()}.` : 'Complete documentation to unlock this assessment.'}</p>
          <div class="module-footer">
            ${isUnlocked ? `
              <span class="question-count"><i class="fas fa-question-circle"></i> ${qcount} Questions</span>
              <span class="module-points"><i class="fas fa-star"></i> ${Math.floor((m.points||0) * 0.5)} XP</span>
            ` : `
              <span class="locked-message"><i class="fas fa-lock"></i> Complete ${m.id} documentation first</span>
            `}
          </div>
        </div>`;
    }).join('');
  }

  loadLeaderboard() {
    const c = document.getElementById('leaderboard-list'); if(!c) return;
    
    // Update current user data in leaderboard
    const currentUserIndex = this.data.leaderboard.findIndex(u => u.name === this.data.userProfile.name);
    if (currentUserIndex !== -1) {
      this.data.leaderboard[currentUserIndex] = {
        ...this.data.leaderboard[currentUserIndex],
        level: this.data.userProfile.level,
        totalXP: this.data.userProfile.totalXP,
        modulesCompleted: this.data.userProfile.modulesCompleted,
        streak: this.data.userProfile.streak
      };
    }
    
    // Sort leaderboard by XP and assign ranks
    const sortedLeaderboard = [...this.data.leaderboard].sort((a, b) => b.totalXP - a.totalXP);
    sortedLeaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });
    
    const levelTitle=(lvl)=> lvl>=10?'Expert':(lvl>=7?'Advanced':(lvl>=4?'Intermediate':'Beginner'));
    const rankClass=(r)=> r===1?'gold':(r===2?'silver':(r===3?'bronze':'default'));
    
    c.innerHTML = sortedLeaderboard.map(u=>`
      <div class="leaderboard-item ${u.name===this.data.userProfile.name ? 'current-user' : ''} ${u.rank <= 3 ? 'top-3' : ''}">
        <div class="rank-badge ${rankClass(u.rank)}">${u.rank}</div>
        <div class="user-info">
          <h4>${u.avatar} ${u.name}</h4>
          <p>Security ${levelTitle(u.level)} • ${u.streak} day streak</p>
        </div>
        <div class="user-level">Level ${u.level}</div>
        <div class="user-xp">${u.totalXP} XP</div>
      </div>`).join('');
  }

  loadProfile() {
    const profile = this.data.userProfile;
    
    // Update basic profile info
    const n=document.getElementById('profile-name'); if(n) n.textContent=profile.name||'Security Learner';
    const l=document.getElementById('profile-level'); if(l) l.textContent=profile.level||1;
    const j=document.getElementById('join-date'); if(j) j.textContent=profile.joinDate||'';
    
    // Add detailed stats to profile
    this.updateProfileStats();
    
    // Load achievements
    const c=document.getElementById('all-achievements'); if(!c) return;
    c.innerHTML = (this.data.achievements||[]).map(a=>`
      <div class="achievement-card ${a.earned?'earned':''}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-description">${a.description}</div>
        ${a.earned ? '<div class="achievement-earned-date">✅ Earned</div>' : '<div class="achievement-locked">🔒 Locked</div>'}
      </div>`).join('');
  }
  
  updateProfileStats() {
    const profile = this.data.userProfile;
    
    // Ensure profile exists and has proper structure
    if (!profile || !profile.completedActivities) {
      console.warn('Profile or completedActivities not initialized, skipping stats update');
      return;
    }
    
    // Find or create profile stats container
    let statsContainer = document.querySelector('.profile-stats-detailed');
    if (!statsContainer) {
      const profileContent = document.querySelector('.profile-content');
      if (profileContent) {
        statsContainer = document.createElement('div');
        statsContainer.className = 'profile-stats-detailed';
        profileContent.insertBefore(statsContainer, profileContent.firstChild.nextSibling);
      }
    }
    
    if (statsContainer) {
      const completedModules = profile.completedActivities.modules ? profile.completedActivities.modules.size : 0;
      const completedAnimations = profile.completedActivities.animations ? profile.completedActivities.animations.size : 0;
      const completedLabs = profile.completedActivities.labs ? profile.completedActivities.labs.size : 0;
      const completedAssessments = profile.completedActivities.assessments ? profile.completedActivities.assessments.size : 0;
      const earnedAchievements = (this.data.achievements || []).filter(a => a.earned).length;
      
      statsContainer.innerHTML = `
        <div class="card">
          <div class="card__header">
            <h3>📊 Learning Statistics</h3>
          </div>
          <div class="card__body">
            <div class="stats-grid-detailed">
              <div class="stat-item-detailed">
                <div class="stat-icon-large">🎯</div>
                <div class="stat-content-detailed">
                  <div class="stat-number-large">${profile.totalXP}</div>
                  <div class="stat-label-detailed">Total XP Earned</div>
                </div>
              </div>
              <div class="stat-item-detailed">
                <div class="stat-icon-large">⭐</div>
                <div class="stat-content-detailed">
                  <div class="stat-number-large">Level ${profile.level}</div>
                  <div class="stat-label-detailed">Current Level</div>
                </div>
              </div>
              <div class="stat-item-detailed">
                <div class="stat-icon-large">🔥</div>
                <div class="stat-content-detailed">
                  <div class="stat-number-large">${profile.streak}</div>
                  <div class="stat-label-detailed">Day Streak</div>
                </div>
              </div>
              <div class="stat-item-detailed">
                <div class="stat-icon-large">🏆</div>
                <div class="stat-content-detailed">
                  <div class="stat-number-large">${earnedAchievements}</div>
                  <div class="stat-label-detailed">Achievements</div>
                </div>
              </div>
            </div>
            
            <div class="learning-progress-detailed">
              <h4>📚 Learning Progress</h4>
              <div class="progress-items">
                <div class="progress-item">
                  <span>📖 Modules Completed</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${(completedModules / 10) * 100}%"></div>
                    </div>
                    <span class="progress-text">${completedModules}/10</span>
                  </div>
                </div>
                <div class="progress-item">
                  <span>🎬 Animations Watched</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${(completedAnimations / 10) * 100}%"></div>
                    </div>
                    <span class="progress-text">${completedAnimations}/10</span>
                  </div>
                </div>
                <div class="progress-item">
                  <span>🧪 Labs Completed</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${(completedLabs / 10) * 100}%"></div>
                    </div>
                    <span class="progress-text">${completedLabs}/10</span>
                  </div>
                </div>
                <div class="progress-item">
                  <span>✅ Assessments Passed</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${(completedAssessments / 10) * 100}%"></div>
                    </div>
                    <span class="progress-text">${completedAssessments}/10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  loadCertificates() {
    const c = document.getElementById('earned-certificates'); if(!c) return;
    const earned = (this.data.owaspModules || []).filter(m=>m.status==="completed");
    if (!earned.length) {
      c.innerHTML = `
        <div class="no-certificates" style="text-align:center;padding:2rem;">
          <i class="fas fa-certificate" style="font-size:3rem;color:var(--color-text-secondary);margin-bottom:1rem;"></i>
          <h3>No Certificates Yet</h3>
          <p>Complete modules to earn your security certificates!</p>
        </div>`;
      return;
    }
    c.innerHTML = earned.map(m=>`
      <div class="certificate-card">
        <i class="fas fa-certificate" style="font-size:2rem;color: var(--color-primary);margin-bottom: 1rem;"></i>
        <h3>${m.title}</h3>
        <p>Certificate of Completion</p>
        <p><strong>${m.id}</strong> - OWASP Top 10</p>
        <p style="font-size:0.8rem;color:var(--color-text-secondary);">Earned: ${m.completedAt ? new Date(m.completedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
      </div>`).join('');
  }

  openModuleDetail(id) {
    // Check if module is unlocked
    if (window.gamificationEngine && !window.gamificationEngine.isModuleUnlocked(id)) {
      window.learningPath.showError(`Module ${id} is locked. Complete previous modules to unlock it.`);
      return;
    }
    
    const m = this.data.owaspModules.find(x=>x.id===id); if(!m) return;
    const t = document.getElementById('modal-title'); if(t) t.textContent = `${m.id}: ${m.title}`;
    const c = document.getElementById('modal-content'); if(c){
      // Map module IDs to documentation files
      const docMapping = {
        'A01': 'A01-Broken-Access-Control.md',
        'A02': 'A02-Cryptographic-Failures.md',
        'A03': 'A03-Injection.md',
        'A04': 'A04-Insecure-Design.md',
        'A05': 'A05-Security-Misconfiguration.md',
        'A06': 'A06-Vulnerable-Outdated-Components.md',
        'A07': 'A07-Identification-Authentication-Failures.md',
        'A08': 'A08-Software-Data-Integrity-Failures.md',
        'A09': 'A09-Security-Logging-Monitoring-Failures.md',
        'A10': 'A10-Server-Side-Request-Forgery.md'
      };
      
      const docFile = docMapping[id];
      const docUrl = docFile ? `docs/${docFile}` : null;
      
      c.innerHTML = `
        <div class="module-detail">
          <div class="module-meta" style="display:flex; gap:12px; margin-bottom:16px;">
            <span class="difficulty-badge difficulty-${(m.difficulty||'Medium').toLowerCase()}">${m.difficulty||'Medium'}</span>
            <span class="status status--info">${m.points||0} XP</span>
            <span class="status status--warning">${m.status.replace('-', ' ')}</span>
          </div>
          <p>${m.description || ''}</p>
          
          ${docUrl ? `
          <div class="documentation-section" style="background: var(--color-bg-1); border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h4 style="margin: 0 0 12px 0; color: var(--color-primary); display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-book"></i> 📚 Comprehensive Documentation
            </h4>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: var(--color-text-secondary);">
              Access detailed learning materials, code examples, lab exercises, and prevention strategies for ${m.title}.
            </p>
            <div style="display: flex; gap: 12px; align-items: center;">
              <a href="${docUrl}" target="_blank" class="btn btn--primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-external-link-alt"></i> View Documentation (+50 XP)
              </a>
              <span style="font-size: 12px; color: var(--color-text-secondary);">
                <i class="fas fa-clock"></i> Est. 4-6 hours study time
              </span>
            </div>
          </div>
          ` : ''}
          
          <h4>Learning Objectives</h4>
          <ul>
            <li>Understand the nature of ${m.title.toLowerCase()}</li>
            <li>Learn common attack vectors and scenarios</li>
            <li>Implement effective prevention techniques</li>
            <li>Practice identification in real-world contexts</li>
          </ul>
          
          <div class="learning-path" style="background: var(--color-surface); border-radius: 8px; padding: 16px; margin-top: 16px;">
            <h4 style="margin: 0 0 12px 0; color: var(--color-primary);">🎯 Learning Path</h4>
            <div class="learning-steps" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
              <div class="learning-step" data-module-id="${id}" data-activity-type="documentation" style="text-align: center; padding: 12px; background: var(--color-bg-1); border-radius: 6px; border: 1px solid var(--color-border);">
                <div style="font-size: 24px; margin-bottom: 4px;">📖</div>
                <div style="font-size: 12px; font-weight: 600;">Documentation</div>
                <div style="font-size: 11px; color: var(--color-text-secondary);">50 XP</div>
              </div>
              <div class="learning-step" data-module-id="${id}" data-activity-type="animation" style="text-align: center; padding: 12px; background: var(--color-bg-1); border-radius: 6px; border: 1px solid var(--color-border);">
                <div style="font-size: 24px; margin-bottom: 4px;">🎬</div>
                <div style="font-size: 12px; font-weight: 600;">Animation</div>
                <div style="font-size: 11px; color: var(--color-text-secondary);">25 XP</div>
              </div>
              <div class="learning-step" data-module-id="${id}" data-activity-type="lab" style="text-align: center; padding: 12px; background: var(--color-bg-1); border-radius: 6px; border: 1px solid var(--color-border);">
                <div style="font-size: 24px; margin-bottom: 4px;">🧪</div>
                <div style="font-size: 12px; font-weight: 600;">Lab</div>
                <div style="font-size: 11px; color: var(--color-text-secondary);">75 XP</div>
              </div>
              <div class="learning-step" data-module-id="${id}" data-activity-type="quiz" style="text-align: center; padding: 12px; background: var(--color-bg-1); border-radius: 6px; border: 1px solid var(--color-border);">
                <div style="font-size: 24px; margin-bottom: 4px;">✅</div>
                <div style="font-size: 12px; font-weight: 600;">Quiz</div>
                <div style="font-size: 11px; color: var(--color-text-secondary);">50+ XP</div>
              </div>
            </div>
          </div>
        </div>`;
    }
    
    // Open modal first, then set up buttons
    this.openModal('module-modal');
    
    // Use setTimeout to ensure modal is fully rendered
    setTimeout(() => {
      const startBtn = document.getElementById('start-module');
      const labBtn = document.getElementById('view-lab');
      
      if (startBtn){
        console.log('Setting up start button for module:', id);
        startBtn.onclick = (e) => {
          e.preventDefault();
          console.log('Start button clicked for module:', id);
          window.startModuleWithGamification ? window.startModuleWithGamification(id) : this.startLearningPath(id);
        };
        if (m.status==='locked'){ 
          startBtn.textContent='Locked'; 
          startBtn.disabled=true; 
          startBtn.className='btn btn--outline'; 
        } else { 
          startBtn.disabled=false; 
          startBtn.className='btn btn--primary'; 
          startBtn.textContent = (m.status==='completed'?'Review Module':'Start Learning Path'); 
        }
      } else {
        console.warn('Start button not found after modal opened - this may be normal for some modal types');
      }
      
      if (labBtn){
        labBtn.onclick = () => this.startLab(id);
        labBtn.style.display = m.labAvailable? 'inline-flex':'none';
      }
    }, 100);
  }

  startLearningPath(moduleId) {
    console.log('Starting learning path for module:', moduleId);
    
    if (window.learningPath) {
      console.log('Learning flow system found');
      
      // Check if module is unlocked
      if (window.gamificationEngine && !window.gamificationEngine.isModuleUnlocked(moduleId)) {
        console.log('Module is locked:', moduleId);
        window.learningPath.showError(`Module ${moduleId} is locked. Complete previous modules first.`);
        return;
      }
      
      // Start with documentation (first activity)
      const nextActivity = 'documentation';
      console.log('Next activity for', moduleId, ':', nextActivity);
      
      if (nextActivity) {
        this.startDocumentation(moduleId);
      } else {
        console.log('No next activity - module completed');
        window.learningPath.showNotification({
          type: 'info',
          title: 'Module Completed',
          message: 'This module is already completed!',
          icon: '✅',
          duration: 3000
        });
      }
    } else {
      console.log('Learning flow system not found, using fallback');
      // Fallback
      this.startDocumentation(moduleId);
    }
    this.closeModal();
  }
  
  startDocumentation(moduleId) {
    // Navigate to documentation
    const docMapping = {
      'A01': 'A01-Broken-Access-Control.md',
      'A02': 'A02-Cryptographic-Failures.md',
      'A03': 'A03-Injection.md',
      'A04': 'A04-Insecure-Design.md',
      'A05': 'A05-Security-Misconfiguration.md',
      'A06': 'A06-Vulnerable-Outdated-Components.md',
      'A07': 'A07-Identification-Authentication-Failures.md',
      'A08': 'A08-Software-Data-Integrity-Failures.md',
      'A09': 'A09-Security-Logging-Monitoring-Failures.md',
      'A10': 'A10-Server-Side-Request-Forgery.md'
    };
    
    const docFile = docMapping[moduleId];
    if (docFile) {
      window.location.href = `/docs/${docFile}`;
      // Mark as started and track reading time
      setTimeout(() => {
        this.completeActivity(moduleId, 'documentation', { timeSpent: 300 });
      }, 5000); // Auto-complete after 5 seconds for demo
    }
  }

  startLab(id){
    this.closeModal();
    
    // Check if learning flow system is available and enforce access control
    if (window.learningPath) {
      if (!window.learningPath.startActivity(id, 'lab')) {
        return; // Access denied, error message already shown by learning flow
      }
    }
    
    if (!this.data.auth || this.data.auth.loggedIn === false) {
      const go = confirm("Open lab now? (Login is optional in this demo build)");
      if (!go) return;
    }
    window.location.href = `/labs/${id}`;
  }

  startAssessment(id){
    // Check if learning flow system is available and enforce access control
    if (window.learningPath) {
      if (!window.learningPath.startActivity(id, 'quiz')) {
        return; // Access denied, error message already shown by learning flow
      }
    }
    
    if (!this.data.assessmentQuestions[id]){ alert('Assessment coming soon for this module!'); return; }
    this.currentModuleId = id; this.currentQuestion = 0; this.assessmentScore = 0; this.selectedAnswer = null;
    this.loadQuestion(id); this.openModal('assessment-modal');
  }

  loadQuestion(id){
    const qs = this.data.assessmentQuestions[id]; if(!qs || !qs[this.currentQuestion]) return;
    const q = qs[this.currentQuestion];
    const qt = document.getElementById('question-text'); if(qt) qt.textContent = `Question ${this.currentQuestion+1} of ${qs.length}: ${q.question}`;
    const oc = document.getElementById('question-options');
    if (oc){
      oc.innerHTML = q.options.map((option, index) => `<button class="option-button" data-index="${index}">${option}</button>`).join('');
      oc.onclick = (ev)=>{ const b = ev.target.closest('.option-button'); if(!b) return; this.selectAnswer(Number(b.dataset.index)); };
    }
    const sb = document.getElementById('submit-answer'); const nb = document.getElementById('next-question');
    if(sb) sb.style.display='inline-flex'; if(nb) nb.style.display='none'; this.selectedAnswer = null;
  }

  selectAnswer(index){
    document.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
    const buttons = document.querySelectorAll('.option-button'); if(buttons[index]) buttons[index].classList.add('selected');
    this.selectedAnswer = index;
  }

  submitAnswer(){
    if (this.selectedAnswer === null){ alert('Please select an answer first!'); return; }
    const qs = this.data.assessmentQuestions[this.currentModuleId];
    const question = qs[this.currentQuestion];
    const isCorrect = this.selectedAnswer === question.correct;
    if (isCorrect) this.assessmentScore++;
    document.querySelectorAll('.option-button').forEach((btn, idx) => {
      if (idx === question.correct) btn.classList.add('correct');
      else if (idx === this.selectedAnswer && !isCorrect) btn.classList.add('incorrect');
      btn.disabled = true;
    });
    const sb = document.getElementById('submit-answer'); const nb = document.getElementById('next-question');
    if (sb) sb.style.display='none';
    if (this.currentQuestion < qs.length - 1){ if (nb) nb.style.display='inline-flex'; }
    else { setTimeout(()=> this.showAssessmentResults(this.currentModuleId), 900); }
  }

  nextQuestion(){ this.currentQuestion++; this.loadQuestion(this.currentModuleId); }

  async showAssessmentResults(id){
    const qs = this.data.assessmentQuestions[id];
    const pct = Math.round((this.assessmentScore / qs.length) * 100);
    const content = document.getElementById('assessment-content'); const results = document.getElementById('assessment-results');
    if (content) content.style.display='none';
    if (results) results.style.display='block';
    const msg = pct>=80?`Excellent! You scored ${this.assessmentScore}/${qs.length} (${pct}%). You've mastered this topic!`:
                (pct>=60?`Good job! You scored ${this.assessmentScore}/${qs.length} (${pct}%). Review and try again.`:
                          `You scored ${this.assessmentScore}/${qs.length} (${pct}%). Review and retake.`);
    const score = document.getElementById('score-text'); if (score) score.textContent = msg;

    this._showAndAward(id, pct);
    await this._persist();
  }

  _unlockNext(id){ const i = this.data.owaspModules.findIndex(m=>m.id===id); const next = this.data.owaspModules[i+1]; if(next && next.status==='locked') next.status='in-progress'; }
  _maybeBadge(id){ const map={A01:'Access Control Master',A02:'Crypto Expert',A03:'Injection Hunter'}; const name=map[id]; if(!name) return; const b=this.data.achievements.find(x=>x.name===name); if(b && !b.earned) b.earned=true;
    if (name && !this.data.userProfile.badgesEarned?.includes(name)) {
      this.data.userProfile.badgesEarned = [...(this.data.userProfile.badgesEarned || []), name];
    }
  }

  _showAndAward(id, pct){
    const m = this.data.owaspModules.find(x=>x.id===id); if(!m) return;
    const award = Math.floor(((m.points||0)*0.5) * (pct/100));
    const p = this.data.userProfile;
    p.totalXP = (p.totalXP||0) + award;
    p.currentXP = (p.currentXP||0) + award;
    while (p.currentXP >= p.nextLevelXP){ p.level = (p.level||1)+1; p.currentXP -= p.nextLevelXP; p.nextLevelXP = Math.floor(p.nextLevelXP * 1.25); }
    if (pct>=70 && m.status!=='completed'){ m.status='completed'; m.completedAt = m.completedAt || new Date().toISOString(); p.modulesCompleted = (p.modulesCompleted||0)+1; this._unlockNext(id); this._maybeBadge(id); }
    this.updateUserStats(); this.loadModules(); this.loadCertificates(); this.loadDashboard();
  }

  async _persist(){
    try {
      const r = await fetch('/api/progress', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userProfile: this.data.userProfile, owaspModules: this.data.owaspModules, achievements: this.data.achievements }),
        credentials: 'same-origin'
      });
      return r.ok;
    } catch { return false; }
  }

  async _safeGET(url){
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (!r.ok) return null;
      if (!((r.headers.get('content-type')||'').includes('application/json'))) return null;
      return await r.json();
    } catch { return null; }
  }

  openModal(id){ const m=document.getElementById(id); if(!m) return; m.classList.remove('hidden'); m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); document.body.style.overflow='hidden'; }
  closeModal(){ document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden')); document.body.style.overflow='auto';
    const ac=document.getElementById('assessment-content'); const ar=document.getElementById('assessment-results'); if(ac) ac.style.display='block'; if(ar) ar.style.display='none'; }

  // ===== GAMIFICATION SYSTEM =====
  
  awardXP(amount, activity, moduleId = null) {
    const profile = this.data.userProfile;
    
    // Ensure profile exists
    if (!profile) {
      console.warn('Profile not initialized, skipping XP award');
      return;
    }
    
    const oldLevel = profile.level || 1;
    
    // Apply streak bonus
    if (this.checkStreak()) {
      amount += this.XP_REWARDS.STREAK_BONUS;
      this.showNotification(`🔥 Streak bonus! +${this.XP_REWARDS.STREAK_BONUS} XP`, 'success');
    }
    
    // Award XP
    profile.totalXP = (profile.totalXP || 0) + amount;
    profile.currentXP = (profile.currentXP || 0) + amount;
    
    // Check for level up
    const newLevel = this.calculateLevel(profile.totalXP);
    if (newLevel > oldLevel) {
      this.levelUp(oldLevel, newLevel);
    }
    
    // Update activity tracking
    if (moduleId && activity && profile.completedActivities && profile.completedActivities[activity]) {
      profile.completedActivities[activity].add(moduleId);
    }
    
    // Update last activity
    profile.lastActivity = new Date().toISOString();
    
    // Save progress
    this.saveProgress();
    this.updateUserStats();
    
    // Show XP notification
    this.showXPNotification(amount, activity);
    
    // Check for achievements
    this.checkAchievements();
    
    return amount;
  }
  
  calculateLevel(totalXP) {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= this.LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }
  
  levelUp(oldLevel, newLevel) {
    const profile = this.data.userProfile;
    profile.level = newLevel;
    
    // Calculate XP for current level
    const currentLevelXP = this.LEVEL_THRESHOLDS[newLevel - 1] || 0;
    const nextLevelXP = this.LEVEL_THRESHOLDS[newLevel] || (currentLevelXP + 1000);
    
    profile.currentXP = profile.totalXP - currentLevelXP;
    profile.nextLevelXP = nextLevelXP - currentLevelXP;
    
    // Show level up notification
    this.showLevelUpModal(oldLevel, newLevel);
    
    // Award level up achievement if applicable
    this.checkLevelAchievements(newLevel);
  }
  
  checkStreak() {
    const profile = this.data.userProfile;
    
    // Ensure profile exists
    if (!profile) {
      return false;
    }
    
    const today = new Date().toDateString();
    const lastActivity = profile.lastActivity ? new Date(profile.lastActivity).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (!lastActivity) {
      profile.streak = 1;
      return false;
    }
    
    if (lastActivity === today) {
      return (profile.streak || 0) > 0;
    }
    
    if (lastActivity === yesterday) {
      profile.streak = (profile.streak || 0) + 1;
      return true;
    }
    
    // Streak broken
    profile.streak = 1;
    return false;
  }
  
  checkAchievements() {
    const profile = this.data.userProfile;
    const achievements = this.data.achievements;
    
    achievements.forEach(achievement => {
      if (!achievement.earned && this.isAchievementUnlocked(achievement)) {
        this.unlockAchievement(achievement);
      }
    });
  }
  
  isAchievementUnlocked(achievement) {
    const profile = this.data.userProfile;
    
    // Ensure profile and completedActivities exist
    if (!profile || !profile.completedActivities) {
      return false;
    }
    
    const activities = profile.completedActivities;
    
    switch (achievement.id) {
      case 1: // First Steps
        return (activities.modules && activities.modules.size > 0) || false;
      case 2: // Access Control Master
        return (activities.modules && activities.modules.has('A01')) && 
               (activities.labs && activities.labs.has('A01')) && 
               (activities.assessments && activities.assessments.has('A01'));
      case 3: // Crypto Expert
        return (activities.modules && activities.modules.has('A02')) && 
               (activities.labs && activities.labs.has('A02')) && 
               (activities.assessments && activities.assessments.has('A02'));
      case 4: // Injection Hunter
        return (activities.modules && activities.modules.has('A03')) && 
               (activities.labs && activities.labs.has('A03')) && 
               (activities.assessments && activities.assessments.has('A03'));
      case 5: // Speed Learner
        return (profile.streak || 0) >= 7;
      case 6: // OWASP Master
        return (activities.modules && activities.modules.size >= 10) || false;
      case 7: // Level 5 Hero
        return (profile.level || 0) >= 5;
      case 8: // Animation Enthusiast
        return (activities.animations && activities.animations.size >= 5) || false;
      case 9: // Lab Warrior
        return (activities.labs && activities.labs.size >= 5) || false;
      case 10: // Assessment Ace
        return (activities.assessments && activities.assessments.size >= 5) || false;
      default:
        return false;
    }
  }
  
  unlockAchievement(achievement) {
    achievement.earned = true;
    
    // Ensure badgesEarned array exists
    if (!this.data.userProfile.badgesEarned) {
      this.data.userProfile.badgesEarned = [];
    }
    
    this.data.userProfile.badgesEarned.push(achievement.id);
    
    // Award bonus XP for achievement
    this.awardXP(100, 'achievement');
    
    // Show achievement notification
    this.showAchievementModal(achievement);
    
    this.saveProgress();
    this.loadRecentAchievements();
  }
  
  checkLevelAchievements(level) {
    const levelAchievements = (this.data.achievements || []).filter(a => 
      a.name.includes('Level') && !a.earned
    );
    
    levelAchievements.forEach(achievement => {
      if (this.isAchievementUnlocked(achievement)) {
        this.unlockAchievement(achievement);
      }
    });
  }
  
  // ===== LEARNING FLOW SYSTEM =====
  
  initializeLearningFlow() {
    this.data.owaspModules.forEach(module => {
      if (!this.data.learningFlow[module.id]) {
        this.data.learningFlow[module.id] = {
          documentation: { completed: false, timeSpent: 0 },
          animation: { completed: false, timeSpent: 0 },
          lab: { completed: false, timeSpent: 0 },
          assessment: { completed: false, score: 0, attempts: 0 }
        };
      }
    });
  }
  
  completeActivity(moduleId, activityType, data = {}) {
    // Use the learning flow manager if available
    if (window.learningPath) {
      return window.learningPath.completeActivity(moduleId, activityType, data);
    }
    
    // Fallback to original implementation
    const flow = this.data.learningFlow[moduleId];
    if (!flow) return;
    
    // Mark activity as completed
    flow[activityType].completed = true;
    if (data.timeSpent) flow[activityType].timeSpent = data.timeSpent;
    if (data.score !== undefined) flow[activityType].score = data.score;
    if (data.attempts !== undefined) flow[activityType].attempts = data.attempts;
    
    // Award XP based on activity type
    let xpAmount = 0;
    switch (activityType) {
      case 'documentation':
        xpAmount = this.XP_REWARDS.DOCUMENTATION;
        break;
      case 'animation':
        xpAmount = this.XP_REWARDS.ANIMATION;
        break;
      case 'lab':
        xpAmount = this.XP_REWARDS.LAB;
        break;
      case 'quiz':
      case 'assessment':
        xpAmount = this.XP_REWARDS.QUIZ;
        if (data.score >= 80) xpAmount += 25; // Bonus for high score
        break;
    }
    
    this.awardXP(xpAmount, activityType, moduleId);
    
    // Check if module is fully completed
    this.checkModuleCompletion(moduleId);
    // Update module status and unlock next module
    this.updateModuleProgression();
  }
  
  startModule(moduleId) {
    console.log(`Starting module: ${moduleId}`);
    
    // Find the module
    const module = this.data.owaspModules.find(m => m.id === moduleId);
    if (!module) {
      console.error(`Module ${moduleId} not found`);
      return;
    }
    
    // Mark as started
    module.started = true;
    
    // Start gamification tracking if learning flow is available
    if (window.startModuleWithGamification) {
      window.startModuleWithGamification(moduleId);
    } else {
      // Fallback to regular module start
      this.showModuleStartModal(module);
    }
    
    // Save progress
    this.saveProgress();
  }
  
  updateModuleProgression() {
    const modules = this.data.owaspModules;
    
    // Unlock next module if current is completed
    for (let i = 0; i < modules.length - 1; i++) {
      if (modules[i].status === 'completed' && modules[i + 1].status === 'locked') {
        modules[i + 1].status = 'in-progress';
        this.showNotification(`🔓 ${modules[i + 1].title} unlocked!`, 'success');
      }
    }
  }
  
  getModuleProgress(moduleId) {
    // Check if module is completed using StateManager
    if (window.stateManager && window.stateManager.isModuleCompleted(moduleId)) {
      return 100;
    }
    
    // Check if module is unlocked and has some progress
    if (window.stateManager && window.stateManager.isModuleUnlocked(moduleId)) {
      // If unlocked but not completed, show some progress (e.g., 25% for being started)
      return 25;
    }
    
    return 0;
  }
  
  // ===== NOTIFICATION SYSTEM =====
  
  showXPNotification(amount, activity) {
    const activityNames = {
      modules: '📚 Module',
      animations: '🎬 Animation',
      labs: '🧪 Lab',
      assessments: '✅ Assessment',
      achievement: '🏆 Achievement',
      completion: '🎉 Completion'
    };
    
    const activityName = activityNames[activity] || activity;
    this.showNotification(`+${amount} XP from ${activityName}!`, 'success');
  }
  
  showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });
  }
  
  showLevelUpModal(oldLevel, newLevel) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎉 Level Up!</h2>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">⬆️</div>
            <h3>Congratulations!</h3>
            <p>You've advanced from <strong>Level ${oldLevel}</strong> to <strong>Level ${newLevel}</strong>!</p>
            <div style="margin: 20px 0; padding: 20px; background: var(--color-bg-1); border-radius: 8px;">
              <p>Keep learning to unlock more achievements and reach higher levels!</p>
            </div>
            <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Continue Learning</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  showAchievementModal(achievement) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🏆 Achievement Unlocked!</h2>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">${achievement.icon}</div>
            <h3>${achievement.name}</h3>
            <p>${achievement.description}</p>
            <div style="margin: 20px 0; padding: 20px; background: var(--color-bg-3); border-radius: 8px; border: 1px solid var(--color-success);">
              <p><strong>+100 XP Bonus!</strong></p>
            </div>
            <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Awesome!</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  showModuleCompletionModal(module) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎉 Module Completed!</h2>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h3>${module.title}</h3>
            <p>You've successfully completed all activities for this module!</p>
            <div style="margin: 20px 0; padding: 20px; background: var(--color-bg-3); border-radius: 8px; border: 1px solid var(--color-success);">
              <p><strong>+${this.XP_REWARDS.FIRST_TIME_BONUS} XP Completion Bonus!</strong></p>
            </div>
            <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Continue Learning</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  // ===== PROGRESS PERSISTENCE =====
  
  saveProgress() {
    const saveData = {
      userProfile: {
        ...this.data.userProfile,
        completedActivities: {
          modules: Array.from(this.data.userProfile.completedActivities?.modules || []),
          animations: Array.from(this.data.userProfile.completedActivities?.animations || []),
          labs: Array.from(this.data.userProfile.completedActivities?.labs || []),
          assessments: Array.from(this.data.userProfile.completedActivities?.assessments || [])
        }
      },
      achievements: this.data.achievements,
      learningFlow: this.data.learningFlow,
      owaspModules: this.data.owaspModules
    };
    
    localStorage.setItem('owaspTrainingProgress', JSON.stringify(saveData));
  }
  
  loadProgress() {
    try {
      const saved = localStorage.getItem('owaspTrainingProgress');
      if (saved) {
        const data = JSON.parse(saved);
        
        if (data.userProfile) {
          this.data.userProfile = { ...this.data.userProfile, ...data.userProfile };
          
          // Convert arrays back to Sets
          if (data.userProfile.completedActivities) {
            this.data.userProfile.completedActivities = {
              modules: new Set(data.userProfile.completedActivities.modules || []),
              animations: new Set(data.userProfile.completedActivities.animations || []),
              labs: new Set(data.userProfile.completedActivities.labs || []),
              assessments: new Set(data.userProfile.completedActivities.assessments || [])
            };
          }
        }
        
        if (data.achievements) this.data.achievements = data.achievements;
        if (data.learningFlow) this.data.learningFlow = data.learningFlow;
        if (data.owaspModules) this.data.owaspModules = data.owaspModules;
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  initializeProgressChart() {
    if (this._chartInitPending) return;
    this._chartInitPending = true;
    
    // Check if gamification integration is handling charts
    if (window.gamificationIntegration && window.gamificationIntegration.isManagingCharts) {
      console.log('Gamification integration is managing charts, skipping app chart init');
      this._chartInitPending = false;
      return;
    }
    
    const canvas = document.getElementById('progressChart');
    if (!canvas) {
      console.log('Progress chart canvas not found - this is normal for non-dashboard pages');
      this._chartInitPending = false;
      return;
    }
    
    if (!window.Chart) {
      console.log('Chart.js not available - loading from CDN');
      this._chartInitPending = false;
      return;
    }

    try {
      // More robust chart cleanup
      if (this.progressChart) {
        this.progressChart.destroy();
        this.progressChart = null;
      }
      
      // Clear any existing Chart.js instances on this canvas
      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvas.getContext('2d');
      const completedCount = (this.data.owaspModules || []).filter(m => m.status === "completed").length;
      const inProgressCount = (this.data.owaspModules || []).filter(m => m.status === "in-progress").length;
      const lockedCount = (this.data.owaspModules || []).filter(m => m.status === "locked").length;

      this.progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Locked'],
          datasets: [{
            data: [completedCount, inProgressCount, lockedCount],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(245, 158, 11, 0.8)', 
              'rgba(156, 163, 175, 0.8)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(156, 163, 175, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });
      
      console.log('Progress chart initialized successfully');
    } catch (error) {
      console.error('Error initializing progress chart:', error);
      // If chart creation fails, clear any partial state
      if (this.progressChart) {
        try {
          this.progressChart.destroy();
        } catch (e) {
          // Ignore destruction errors
        }
        this.progressChart = null;
      }
    } finally {
      this._chartInitPending = false;
    }
  }

  // Gamification Methods
  trackDocumentationAccess(docUrl) {
    // Extract module ID from URL (e.g., "docs/A01-Broken-Access-Control.md" -> "A01")
    const moduleMatch = docUrl.match(/([A-Z]\d{2})-/);
    if (!moduleMatch) return;
    
    const moduleId = moduleMatch[1];
    const activityKey = `doc_${moduleId}`;
    
    // Ensure profile and completedActivities exist
    if (!this.data.userProfile || !this.data.userProfile.completedActivities || !this.data.userProfile.completedActivities.modules) {
      console.warn('Profile or completedActivities not initialized, skipping documentation tracking');
      return;
    }
    
    // Check if this documentation has already been accessed
    if (!this.data.userProfile.completedActivities.modules.has(activityKey)) {
      this.data.userProfile.completedActivities.modules.add(activityKey);
      this.awardXP(this.XP_REWARDS.MODULE_READ, 'documentation', moduleId);
      this.completeActivity(moduleId, 'documentation');
      this.saveProgress();
      
      // Show XP notification
      this.showXPNotification(this.XP_REWARDS.MODULE_READ, 'Documentation Read');
    }
  }


  calculateLevel(totalXP) {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= this.LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  levelUp(newLevel) {
    this.showLevelUpModal(newLevel);
    this.checkLevelAchievements(newLevel);
  }


  completeActivity(moduleId, activityType, data = {}) {
    console.log('🎯 completeActivity called:', { moduleId, activityType, data });
    
    if (!this.data) {
      console.error('❌ this.data is undefined in completeActivity');
      return;
    }
    
    const activityKey = `${moduleId}_${activityType}`;
    
    // Ensure completedActivities structure exists with all buckets
    if (!this.data.userProfile) {
      console.error('❌ this.data.userProfile is undefined');
      return;
    }
    if (!this.data.userProfile.completedActivities) {
      this.data.userProfile.completedActivities = {
        modules: new Set(),
        animations: new Set(),
        labs: new Set(),
        assessments: new Set()
      };
    }
    // Map activity types to the correct bucket names
    const bucketMap = {
      documentation: 'modules',
      module: 'modules',
      animation: 'animations',
      lab: 'labs',
      assessment: 'assessments'
    };
    const bucketName = bucketMap[activityType] || (activityType + 's');
    if (!this.data.userProfile.completedActivities[bucketName]) {
      this.data.userProfile.completedActivities[bucketName] = new Set();
    }
    this.data.userProfile.completedActivities[bucketName].add(activityKey);
    
    // Update learning flow
    if (!this.data.learningFlow) {
      this.data.learningFlow = {};
    }
    
    if (!this.data.learningFlow[moduleId]) {
      this.data.learningFlow[moduleId] = {};
    }
    
    this.data.learningFlow[moduleId][activityType] = {
      completed: true,
      completedAt: new Date().toISOString(),
      ...data
    };
    
    this.checkModuleCompletion(moduleId);
    this.saveProgress();
  }

  checkModuleCompletion(moduleId) {
    const flow = this.data.learningFlow[moduleId];
    if (!flow) return;
    
    const requiredActivities = ['documentation', 'animation', 'lab', 'assessment'];
    const completedActivities = requiredActivities.filter(activity => 
      flow[activity] && flow[activity].completed
    );
    
    if (completedActivities.length === requiredActivities.length) {
      this.showModuleCompletionModal(moduleId);
      this.unlockAchievement('module_master');
    }
  }

  checkAchievements(category, moduleId) {
    // Implementation would check various achievement conditions
    // For now, just a basic example
    if (category === 'documentation') {
      this.unlockAchievement('knowledge_seeker');
    }
  }

  checkLevelAchievements(level) {
    if (level >= 5) {
      this.unlockAchievement('rising_star');
    }
    if (level >= 10) {
      this.unlockAchievement('security_expert');
    }
  }

  unlockAchievement(achievementId) {
    const achievement = this.data.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.earned) {
      achievement.earned = true;
      achievement.earnedAt = new Date().toISOString();
      this.showAchievementModal(achievement);
      this.saveProgress();
    }
  }

  showXPNotification(amount, reason) {
    this.showNotification(`+${amount} XP`, `${reason}`, 'success');
  }

  showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <div class="notification__title">${title}</div>
        <div class="notification__message">${message}</div>
      </div>
      <button class="notification__close">&times;</button>
    `;
    
    // Use the same container as gamification engine to prevent overlap
    let container = document.getElementById('notifications-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications-container';
      container.className = 'notifications-container';
      document.body.appendChild(container);
    }
    
    // Add to container (stacks notifications)
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('notification--show'), 100);
    
    // Auto remove
    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, 3000);
    
    // Manual close
    notification.querySelector('.notification__close').addEventListener('click', () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });
  }

  removeNotification(notificationEl) {
    notificationEl.classList.add('notification--hide');
    setTimeout(() => {
      if (notificationEl.parentNode) {
        notificationEl.parentNode.removeChild(notificationEl);
      }
    }, 300);
  }

  showLevelUpModal(level) {
    const modal = document.createElement('div');
    modal.className = 'modal modal--celebration';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="celebration-content">
          <div class="celebration-icon">🎉</div>
          <h2>Level Up!</h2>
          <p>Congratulations! You've reached <strong>Level ${level}</strong></p>
          <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showAchievementModal(achievement) {
    const modal = document.createElement('div');
    modal.className = 'modal modal--celebration';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="celebration-content">
          <div class="celebration-icon">${achievement.icon}</div>
          <h2>Achievement Unlocked!</h2>
          <h3>${achievement.name}</h3>
          <p>${achievement.description}</p>
          <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Awesome!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showModuleCompletionModal(moduleId) {
    const module = this.data.owaspModules.find(m => m.id === moduleId);
    if (!module) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal modal--celebration';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="celebration-content">
          <div class="celebration-icon">🏆</div>
          <h2>Module Complete!</h2>
          <h3>${module.title}</h3>
          <p>You've completed all activities for this module!</p>
          <button class="btn btn--primary" onclick="this.closest('.modal').remove()">Continue Learning</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  saveProgress() {
    try {
      const progressData = {
        userProfile: {
          ...this.data.userProfile,
          completedActivities: {
            modules: Array.from(this.data.userProfile.completedActivities?.modules || []),
            animations: Array.from(this.data.userProfile.completedActivities?.animations || []),
            labs: Array.from(this.data.userProfile.completedActivities?.labs || []),
            assessments: Array.from(this.data.userProfile.completedActivities?.assessments || [])
          }
        },
        achievements: this.data.achievements,
        learningFlow: this.data.learningFlow,
        owaspModules: this.data.owaspModules
      };
      
      localStorage.setItem('owaspTrainingProgress', JSON.stringify(progressData));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  updateUserStats() {
    // Update various UI elements with current stats
    const profile = this.data.userProfile;
    
    // Update level display
    const levelElements = document.querySelectorAll('.user-level');
    levelElements.forEach(el => el.textContent = `Level ${profile.level}`);
    
    // Update XP display
    const xpElements = document.querySelectorAll('.user-xp');
    xpElements.forEach(el => el.textContent = `${profile.totalXP} XP`);
    
    // Update streak display
    const streakElements = document.querySelectorAll('.user-streak');
    streakElements.forEach(el => el.textContent = `${profile.streak} day streak`);
  }
}

// Global functions for HTML event handlers
function closeAnimationModal() {
  const modal = document.getElementById('animation-completion-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Demo functions for testing gamification
function demoGamification() {
  console.log('🎮 Testing Gamification System...');
  
  // Test XP award
  window.app.awardXP(50, 'modules', 'A01');
  
  // Test achievement unlock
  setTimeout(() => {
    window.app.awardXP(75, 'labs', 'A01');
  }, 2000);
  
  // Test level up
  setTimeout(() => {
    window.app.awardXP(200, 'assessments', 'A01');
  }, 4000);
  
  // Test streak bonus
  setTimeout(() => {
    window.app.data.userProfile.streak = 7;
    window.app.awardXP(25, 'animations', 'A02');
  }, 6000);
}

function quickProgress() {
  console.log('🚀 Quick Progress Demo...');
  
  // Simulate completing A01 activities
  window.app.completeActivity('A01', 'documentation');
  setTimeout(() => window.app.completeActivity('A01', 'animation'), 1000);
  setTimeout(() => window.app.completeActivity('A01', 'lab'), 2000);
  setTimeout(() => window.app.completeActivity('A01', 'assessment', { score: 85 }), 3000);
}

function resetProgress() {
  if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
    localStorage.removeItem('owaspTrainingProgress');
    location.reload();
  }
}

// Make app instance globally available
window.app = new OWASPTrainingPlatform();
window.app.init();

// Export global functions
window.closeAnimationModal = closeAnimationModal;
window.demoGamification = demoGamification;
window.quickProgress = quickProgress;
window.resetProgress = resetProgress;

// Enhanced gamification demo
function demoGamificationSystem() {
  console.log('🎮 Testing Enhanced Gamification System...');
  
  if (window.gamification) {
    // Test documentation reading
    setTimeout(() => {
      window.gamification.trackDocumentationReading('A01', 300, 85);
    }, 1000);
    
    // Test lab completion
    setTimeout(() => {
      window.gamification.completeActivity('A01', 'lab', 95, 600);
    }, 3000);
    
    // Test assessment completion
    setTimeout(() => {
      window.gamification.completeActivity('A01', 'assessment', 100, 180);
    }, 5000);
    
    // Test XP award
    setTimeout(() => {
      window.gamification.awardXP(50, 'Bonus Activity', 'special');
    }, 7000);
  } else {
    console.log('Gamification system not loaded yet');
  }
}

// Export enhanced demo
window.demoGamificationSystem = demoGamificationSystem;

// Demo learning flow system
function demoLearningFlow() {
  console.log('🎓 Testing Complete Learning Flow System...');
  
  if (window.learningPath) {
    console.log('Starting A01 Documentation...');
    window.learningPath.startActivity('A01', 'documentation');
  } else {
    console.log('Learning flow system not loaded yet');
  }
}

// Demo complete flow with modals
function demoCompleteFlow() {
  console.log('🎓 Testing Complete Learning Flow with Modals...');
  
  if (window.learningPath) {
    // Reset progress first
    window.learningPath.resetProgress();
    
    // Start the complete flow
    setTimeout(() => {
      console.log('📖 Starting Documentation...');
      window.learningPath.startActivity('A01', 'documentation');
    }, 1000);
  } else {
    console.log('Learning flow system not loaded yet');
  }
}

// Export demo functions
window.demoLearningFlow = demoLearningFlow;
window.demoCompleteFlow = demoCompleteFlow;

// Function to unlock all modules (for testing only)
function unlockAllModules() {
  console.log('🔓 Unlocking all modules (TEST MODE)...');
  
  // Update learning flow system
  if (window.learningPath) {
    window.learningPath.unlockedModules = new Set(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10']);
    window.learningPath.saveProgress();
    window.learningPath.updateUI();
  }
  
  // Update main app modules
  if (window.app) {
    window.app.data.owaspModules.forEach(module => {
      if (module.status === 'locked') {
        module.status = 'in-progress';
      }
    });
    window.app.saveProgress();
    window.app.loadModules();
  }
  
  console.log('✅ All modules unlocked! (Remember: this is for testing only)');
}

// Export unlock function
window.unlockAllModules = unlockAllModules;

// Test function to check if everything is working
function testStartModule() {
  console.log('🧪 Testing Start Module functionality...');
  console.log('Learning flow available:', !!window.learningPath);
  console.log('App available:', !!window.app);
  
  if (window.app) {
    console.log('Attempting to start A01...');
    window.app.startLearningPath('A01');
  }
}

// Export test function
window.testStartModule = testStartModule;

// Comprehensive debug function
function debugStartModule() {
  console.log('🔍 DEBUGGING START MODULE FUNCTIONALITY');
  console.log('=====================================');
  
  // Check if systems are loaded
  console.log('1. System Availability:');
  console.log('   - window.app:', !!window.app);
  console.log('   - window.learningPath:', !!window.learningPath);
  console.log('   - window.gamification:', !!window.gamification);
  
  // Check DOM elements
  console.log('2. DOM Elements:');
  const startBtn = document.getElementById('start-module');
  const modal = document.getElementById('module-modal');
  console.log('   - start-module button:', !!startBtn);
  console.log('   - module-modal:', !!modal);
  
  if (startBtn) {
    console.log('   - button disabled:', startBtn.disabled);
    console.log('   - button text:', startBtn.textContent);
    console.log('   - button onclick:', !!startBtn.onclick);
  }
  
  // Check learning flow state
  if (window.learningPath) {
    console.log('3. Learning Flow State:');
    console.log('   - A01 unlocked:', window.learningPath.isModuleUnlocked('A01'));
    console.log('   - A01 next activity:', window.learningPath.getNextActivity('A01'));
    console.log('   - Unlocked modules:', Array.from(window.learningPath.unlockedModules));
  }
  
  // Try to manually trigger
  console.log('4. Manual Test:');
  if (window.app) {
    try {
      console.log('   - Attempting manual startLearningPath...');
      window.app.startLearningPath('A01');
    } catch (error) {
      console.error('   - Error:', error);
    }
  }
  
  console.log('=====================================');
}

// Export debug function
window.debugStartModule = debugStartModule;

// Force start module for testing
function forceStartModule(moduleId = 'A01') {
  console.log('🚀 Force starting module:', moduleId);
  
  // Ensure learning flow is available
  if (!window.learningPath) {
    console.error('Learning flow not available!');
    return;
  }
  
  // Ensure app is available
  if (!window.app) {
    console.error('App not available!');
    return;
  }
  
  // Try to start the learning path directly
  try {
    window.app.startLearningPath(moduleId);
    console.log('✅ Successfully triggered startLearningPath');
  } catch (error) {
    console.error('❌ Error starting learning path:', error);
  }
}

// Export force start function
window.forceStartModule = forceStartModule;

// Test opening module modal and clicking button
function testModuleModal(moduleId = 'A01') {
  console.log('🧪 Testing module modal and button for:', moduleId);
  
  if (!window.app) {
    console.error('App not available!');
    return;
  }
  
  // Open the module detail modal
  console.log('Opening module detail modal...');
  window.app.openModuleDetail(moduleId);
  
  // Wait a bit then check if button is available
  setTimeout(() => {
    const startBtn = document.getElementById('start-module');
    const modal = document.getElementById('module-modal');
    
    console.log('Modal visible:', modal && !modal.classList.contains('hidden'));
    console.log('Start button found:', !!startBtn);
    
    if (startBtn) {
      console.log('Button text:', startBtn.textContent);
      console.log('Button disabled:', startBtn.disabled);
      console.log('Button onclick:', !!startBtn.onclick);
      
      // Try clicking the button programmatically
      console.log('Simulating button click...');
      startBtn.click();
    }
  }, 200);
}

// Export test function
window.testModuleModal = testModuleModal;

// Test gamification system
function testGamification() {
  console.log('🎮 Testing Gamification System...');
  console.log('=====================================');
  
  // Check if gamification is loaded
  console.log('1. System Status:');
  console.log('   - Gamification available:', !!window.gamification);
  console.log('   - Learning flow available:', !!window.learningPath);
  
  if (window.gamification) {
    console.log('2. Current Profile:');
    console.log('   - Level:', window.gamification.userProfile.level);
    console.log('   - Total XP:', window.gamification.userProfile.total_xp);
    console.log('   - Current XP:', window.gamification.userProfile.current_xp);
    console.log('   - Streak:', window.gamification.userProfile.current_streak);
    console.log('   - Achievements:', window.gamification.userProfile.earned_achievements.length);
    
    console.log('3. Testing XP Awards:');
    
    // Test different XP awards
    setTimeout(() => {
      console.log('   - Awarding Documentation XP...');
      window.gamification.awardXP(50, 'documentation');
    }, 1000);
    
    setTimeout(() => {
      console.log('   - Awarding Animation XP...');
      window.gamification.awardXP(25, 'animation');
    }, 2000);
    
    setTimeout(() => {
      console.log('   - Awarding Lab XP...');
      window.gamification.awardXP(75, 'lab');
    }, 3000);
    
    setTimeout(() => {
      console.log('   - Awarding Quiz XP...');
      window.gamification.awardXP(50, 'quiz');
    }, 4000);
    
    setTimeout(() => {
      console.log('   - Awarding Module Completion Bonus...');
      window.gamification.awardXP(100, 'module_completion');
    }, 5000);
    
    setTimeout(() => {
      console.log('4. Final Profile:');
      console.log('   - Level:', window.gamification.userProfile.level);
      console.log('   - Total XP:', window.gamification.userProfile.total_xp);
      console.log('   - Achievements:', window.gamification.userProfile.earned_achievements.length);
    }, 6000);
  }
  
  console.log('=====================================');
}

// Export gamification test
window.testGamification = testGamification;

// Test backend gamification system
async function testBackendGamification() {
  console.log('🎮 Testing Backend Gamification System...');
  console.log('=====================================');
  
  try {
    // Test profile loading
    console.log('1. Testing profile loading...');
    const profileResponse = await fetch('/api/gamification/profile');
    const profileResult = await profileResponse.json();
    console.log('   Profile result:', profileResult);
    
    // Test XP awarding
    console.log('2. Testing XP awarding...');
    const xpResponse = await fetch('/api/gamification/award-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xp_amount: 50,
        activity_type: 'documentation',
        module_id: 'A01',
        time_spent: 300
      })
    });
    const xpResult = await xpResponse.json();
    console.log('   XP award result:', xpResult);
    
    // Test achievements
    console.log('3. Testing achievements...');
    const achievementsResponse = await fetch('/api/gamification/achievements');
    const achievementsResult = await achievementsResponse.json();
    console.log('   Achievements result:', achievementsResult);
    
    // Test leaderboard
    console.log('4. Testing leaderboard...');
    const leaderboardResponse = await fetch('/api/gamification/leaderboard');
    const leaderboardResult = await leaderboardResponse.json();
    console.log('   Leaderboard result:', leaderboardResult);
    
    console.log('✅ Backend gamification tests completed');
    
  } catch (error) {
    console.error('❌ Backend gamification test error:', error);
  }
  
  console.log('=====================================');
}

// Export backend test
window.testBackendGamification = testBackendGamification;

// Initialize the app
window.app = new OWASPTrainingPlatform();
window.app.init();
// Integration with new gamification system
if (window.gamificationEngine && window.learningPath) {
  console.log('✅ New gamification and learning path systems loaded');
  
  // Set up activity completion handler to sync with backend
  document.addEventListener('activityCompleted', async (event) => {
    const { moduleId, activityType, data } = event.detail;
    try {
      const response = await fetch('/api/gamification/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          activity_type: activityType,
          score: data.score || 0,
          time_spent: data.timeSpent || 0
        })
      });
      const result = await response.json();
      if (result.success) {
        console.log('✅ Activity completion synced with backend:', result.data);
      } else {
        console.error('Backend sync failed:', result.error);
      }
    } catch (error) {
      console.error('Error syncing activity completion:', error);
    }
  });
} else {
  console.warn('⚠️ New gamification systems not available, using fallback');
}
