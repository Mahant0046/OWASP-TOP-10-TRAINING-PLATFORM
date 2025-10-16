/**
 * Modern Gamification Engine for OWASP Training Platform
 * Handles XP, levels, achievements, and user progression
 */

class GamificationEngine {
    constructor() {
        this.config = {
            // XP Rewards System
            xpRewards: {
                documentation: 50,
                animation: 25,
                lab: 75,
                quiz: 50,
                assessment: 50,
                moduleCompletion: 100,
                perfectScore: 25, // 90%+ on assessments
                firstTime: 25,
                streakBonus: 15,
                speedBonus: 20, // Complete within time limit
                helpingOthers: 30 // Future: forum help, etc.
            },

            // Level Progression (Exponential growth)
            levelThresholds: [
                0,     // Level 1
                200,   // Level 2
                500,   // Level 3
                900,   // Level 4
                1500,  // Level 5
                2300,  // Level 6
                3400,  // Level 7
                4800,  // Level 8
                6600,  // Level 9
                8800,  // Level 10
                11500, // Level 11
                14700, // Level 12
                18500, // Level 13
                22900, // Level 14
                28000  // Level 15 (Master)
            ],

            // Achievement Categories
            achievements: {
                progress: [
                    { id: 'first_steps', name: 'First Steps', description: 'Complete your first activity', icon: '🎯', xp: 50, condition: 'activities >= 1' },
                    { id: 'getting_started', name: 'Getting Started', description: 'Earn your first 100 XP', icon: '⭐', xp: 25, condition: 'totalXP >= 100' },
                    { id: 'xp_collector', name: 'XP Collector', description: 'Earn 1000 total XP', icon: '💎', xp: 100, condition: 'totalXP >= 1000' },
                    { id: 'xp_master', name: 'XP Master', description: 'Earn 5000 total XP', icon: '👑', xp: 200, condition: 'totalXP >= 5000' }
                ],
                learning: [
                    { id: 'bookworm', name: 'Bookworm', description: 'Read 5 documentation sections', icon: '📚', xp: 75, condition: 'documentation >= 5' },
                    { id: 'visual_learner', name: 'Visual Learner', description: 'Watch 5 animations', icon: '🎬', xp: 75, condition: 'animations >= 5' },
                    { id: 'hands_on', name: 'Hands-On Learner', description: 'Complete 3 labs', icon: '🧪', xp: 100, condition: 'labs >= 3' },
                    { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Complete all learning activities in a module', icon: '🎓', xp: 125, condition: 'moduleFullyComplete >= 1' }
                ],
                mastery: [
                    { id: 'access_control_expert', name: 'Access Control Expert', description: 'Master A01 - Broken Access Control', icon: '🔐', xp: 150, condition: 'moduleComplete_A01' },
                    { id: 'crypto_specialist', name: 'Crypto Specialist', description: 'Master A02 - Cryptographic Failures', icon: '🔒', xp: 150, condition: 'moduleComplete_A02' },
                    { id: 'injection_hunter', name: 'Injection Hunter', description: 'Master A03 - Injection', icon: '💉', xp: 150, condition: 'moduleComplete_A03' },
                    { id: 'owasp_champion', name: 'OWASP Champion', description: 'Complete 5 OWASP modules', icon: '🏆', xp: 300, condition: 'modulesCompleted >= 5' },
                    { id: 'security_master', name: 'Security Master', description: 'Complete all 10 OWASP modules', icon: '👑', xp: 500, condition: 'modulesCompleted >= 10' }
                ],
                performance: [
                    { id: 'perfectionist', name: 'Perfectionist', description: 'Score 100% on an assessment', icon: '💯', xp: 100, condition: 'perfectScores >= 1' },
                    { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a module in under 30 minutes', icon: '⚡', xp: 125, condition: 'speedCompletions >= 1' },
                    { id: 'consistent_learner', name: 'Consistent Learner', description: 'Maintain a 7-day streak', icon: '🔥', xp: 150, condition: 'maxStreak >= 7' },
                    { id: 'dedication', name: 'Dedication', description: 'Maintain a 30-day streak', icon: '🌟', xp: 400, condition: 'maxStreak >= 30' }
                ]
            },

            // Streak multipliers
            streakMultipliers: {
                3: 1.1,   // 10% bonus after 3 days
                7: 1.2,   // 20% bonus after 7 days
                14: 1.3,  // 30% bonus after 14 days
                30: 1.5   // 50% bonus after 30 days
            }
        };

        // The user profile is now managed by the StateManager.
        // Handle case where StateManager might not be fully initialized
        const state = window.stateManager ? window.stateManager.getState() : null;
        this.userProfile = state && state.userProfile ? this.normalizeUserProfile(state.userProfile) : this.getDefaultUserProfile();
        this.lastSync = new Date();

        // Subscribe to state changes to keep the engine's profile in sync.
        if (window.stateManager) {
            window.stateManager.subscribe((newState) => {
                this.userProfile = newState && newState.userProfile ? this.normalizeUserProfile(newState.userProfile) : this.getDefaultUserProfile();
            });
        }
        this.init();
    }

    normalizeUserProfile(profile) {
        // Ensure Sets are properly restored from JSON (arrays)
        if (profile.completedModules && !profile.completedModules.add) {
            profile.completedModules = new Set(profile.completedModules);
        }
        if (profile.unlockedModules && !profile.unlockedModules.add) {
            profile.unlockedModules = new Set(profile.unlockedModules);
        }
        
        // Ensure unlockedModules exists and has at least A01
        if (!profile.unlockedModules || profile.unlockedModules.size === 0) {
            profile.unlockedModules = new Set(['A01']);
        }
        
        // Ensure completedModules exists
        if (!profile.completedModules) {
            profile.completedModules = new Set();
        }
        
        return profile;
    }

    getDefaultUserProfile() {
        return {
            name: 'Security Learner',
            username: 'user',
            level: 1,
            totalXP: 0,
            currentXP: 0,
            nextLevelXP: 1000,
            streak: 0,
            maxStreak: 0,
            lastActivity: null,
            achievements: [],
            completedModules: new Set(),
            unlockedModules: new Set(['A01']),
            stats: {
                activities: 0,
                documentation: 0,
                animations: 0,
                labs: 0,
                quizzes: 0,
                modulesCompleted: 0,
                perfectScores: 0,
                speedCompletions: 0,
                totalTimeSpent: 0
            }
        };
    }

    init() {
        this.setupEventListeners();
    }

    saveState() {
        if (window.stateManager && window.stateManager.updateState) {
            // Convert Sets to Arrays for JSON serialization
            const profileToSave = {
                ...this.userProfile,
                completedModules: Array.from(this.userProfile.completedModules || []),
                unlockedModules: Array.from(this.userProfile.unlockedModules || [])
            };
            window.stateManager.updateState({ userProfile: profileToSave });
        } else {
            console.warn('StateManager not available for saving gamification state');
        }
    }

    saveUserProfile() {
        // Alias for saveState to maintain compatibility
        this.saveState();
    }

    setupEventListeners() {
        // Listen for activity completions
        document.addEventListener('activityCompleted', (event) => {
            const { moduleId, activityType, data } = event.detail;
            this.handleActivityCompletion(moduleId, activityType, data);
        });

        // Listen for module completions
        document.addEventListener('moduleCompleted', (event) => {
            const { moduleId } = event.detail;
            this.handleModuleCompletion(moduleId);
        });
    }

    handleActivityCompletion(moduleId, activityType, data = {}) {
        const { score = 0, timeSpent = 0, isFirstTime = false } = data;
        
        // Calculate base XP
        let xpEarned = this.config.xpRewards[activityType] || 0;
        
        // Apply bonuses
        if (isFirstTime) {
            xpEarned += this.config.xpRewards.firstTime;
        }
        
        if (score >= 90) {
            xpEarned += this.config.xpRewards.perfectScore;
            this.userProfile.stats.perfectScores++;
        }
        
        // Apply streak multiplier
        const streakMultiplier = this.getStreakMultiplier();
        if (streakMultiplier > 1) {
            const bonusXP = Math.floor(xpEarned * (streakMultiplier - 1));
            xpEarned += bonusXP;
        }
        
        // Award XP
        this.awardXP(xpEarned, `${activityType} completion`);
        
        // Update stats
        this.userProfile.stats.activities++;
        this.userProfile.stats[activityType]++;
        this.userProfile.stats.totalTimeSpent += timeSpent;
        
        // Update streak
        this.updateStreak();
        
        // Check for achievements
        this.checkAchievements();
        
        // Save progress
        this.saveState();
        
        // Show notification
        this.showXPNotification(xpEarned, activityType, streakMultiplier > 1);
    }

    handleModuleCompletion(moduleId) {
        // Mark module as completed
        this.userProfile.completedModules.add(moduleId);
        this.userProfile.stats.modulesCompleted++;
        
        // Unlock next module
        this.unlockNextModule(moduleId);
        
        // Award completion bonus
        const bonusXP = this.config.xpRewards.moduleCompletion;
        this.awardXP(bonusXP, `${moduleId} module completion`);
        
        // Check for achievements
        this.checkAchievements();
        
        // Save progress
        this.saveState();
        
        // Show celebration
        this.showModuleCompletionCelebration(moduleId, bonusXP);
    }

    awardXP(amount, reason) {
        const oldLevel = this.userProfile.level;
        
        this.userProfile.currentXP += amount;
        this.userProfile.totalXP += amount;
        
        // Check for level up
        const newLevel = this.calculateLevel(this.userProfile.totalXP);
        if (newLevel > oldLevel) {
            this.userProfile.level = newLevel;
            this.userProfile.currentXP = this.userProfile.totalXP - this.config.levelThresholds[newLevel - 1];
            this.showLevelUpCelebration(oldLevel, newLevel);
        }
        
        this.updateUI();
        
        // Dispatch XP awarded event
        this.dispatchEvent('xpAwarded', {
            amount,
            reason,
            totalXP: this.userProfile.totalXP,
            level: this.userProfile.level,
            levelUp: newLevel > oldLevel
        });
    }

    calculateLevel(totalXP) {
        for (let i = this.config.levelThresholds.length - 1; i >= 0; i--) {
            if (totalXP >= this.config.levelThresholds[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    getStreakMultiplier() {
        const streak = this.userProfile.streak;
        for (const [days, multiplier] of Object.entries(this.config.streakMultipliers).reverse()) {
            if (streak >= parseInt(days)) {
                return multiplier;
            }
        }
        return 1;
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastActivity = this.userProfile.lastActivity;
        
        if (lastActivity === today) {
            // Already active today
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActivity === yesterday.toDateString()) {
            // Consecutive day
            this.userProfile.streak++;
        } else if (lastActivity !== today) {
            // Streak broken or first activity
            this.userProfile.streak = 1;
        }
        
        this.userProfile.maxStreak = Math.max(this.userProfile.maxStreak, this.userProfile.streak);
        this.userProfile.lastActivity = today;
    }

    checkDailyStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (this.userProfile.lastActivity !== today && 
            this.userProfile.lastActivity !== yesterday.toDateString() && 
            this.userProfile.streak > 0) {
            // Streak was broken
            this.userProfile.streak = 0;
            this.saveState();
        }
    }

    unlockNextModule(completedModuleId) {
        const moduleOrder = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10'];
        const currentIndex = moduleOrder.indexOf(completedModuleId);
        
        if (currentIndex >= 0 && currentIndex < moduleOrder.length - 1) {
            const nextModule = moduleOrder[currentIndex + 1];
            
            // Update local state
            this.userProfile.unlockedModules.add(nextModule);
            
            // Update StateManager
            if (window.stateManager) {
                window.stateManager.unlockModule(nextModule);
            }
            
            // Save state
            this.saveState();
            
            // Show notification
            this.showUnlockNotification(nextModule);
            
            console.log(`🔓 Module ${nextModule} unlocked after completing ${completedModuleId}`);
            
            return nextModule;
        }
        
        return null;
    }

    checkAchievements() {
        const newAchievements = [];
        
        // Check all achievement categories
        for (const [category, achievements] of Object.entries(this.config.achievements)) {
            for (const achievement of achievements) {
                if (!this.userProfile.achievements.includes(achievement.id) && 
                    this.evaluateAchievementCondition(achievement.condition)) {
                    
                    this.userProfile.achievements.push(achievement.id);
                    this.awardXP(achievement.xp, `Achievement: ${achievement.name}`);
                    newAchievements.push(achievement);
                }
            }
        }
        
        // Show achievement notifications
        newAchievements.forEach(achievement => {
            this.showAchievementNotification(achievement);
        });
    }

    evaluateAchievementCondition(condition) {
        try {
            const context = {
                activities: this.userProfile.stats.activities,
                documentation: this.userProfile.stats.documentation,
                animations: this.userProfile.stats.animations,
                labs: this.userProfile.stats.labs,
                quizzes: this.userProfile.stats.quizzes,
                modulesCompleted: this.userProfile.stats.modulesCompleted,
                perfectScores: this.userProfile.stats.perfectScores,
                speedCompletions: this.userProfile.stats.speedCompletions,
                totalXP: this.userProfile.totalXP,
                maxStreak: this.userProfile.maxStreak,
                moduleFullyComplete: this.userProfile.stats.modulesCompleted,
                // Module-specific completions
                moduleComplete_A01: this.userProfile.completedModules.has('A01'),
                moduleComplete_A02: this.userProfile.completedModules.has('A02'),
                moduleComplete_A03: this.userProfile.completedModules.has('A03')
            };
            
            return eval(condition.replace(/(\w+)/g, (match) => {
                return context.hasOwnProperty(match) ? `context.${match}` : match;
            }));
        } catch (error) {
            console.error('Error evaluating achievement condition:', condition, error);
            return false;
        }
    }

    isModuleUnlocked(moduleId) {
        return window.stateManager.isModuleUnlocked(moduleId);
    }

    isModuleCompleted(moduleId) {
        return window.stateManager.isModuleCompleted(moduleId);
    }

    getNextLevelXP() {
        const currentLevel = this.userProfile.level;
        if (currentLevel < this.config.levelThresholds.length) {
            return this.config.levelThresholds[currentLevel];
        }
        return this.config.levelThresholds[this.config.levelThresholds.length - 1] + 1000;
    }

    getLevelProgress() {
        const currentLevelXP = this.config.levelThresholds[this.userProfile.level - 1] || 0;
        const nextLevelXP = this.getNextLevelXP();
        const progressXP = this.userProfile.totalXP - currentLevelXP;
        const requiredXP = nextLevelXP - currentLevelXP;
        
        return {
            current: progressXP,
            required: requiredXP,
            percentage: Math.min(100, (progressXP / requiredXP) * 100)
        };
    }

    updateUI() {
        // Update header stats
        this.updateElement('current-level', this.userProfile.level);
        this.updateElement('total-xp', this.userProfile.totalXP);
        this.updateElement('streak-days', this.userProfile.streak);
        
        // Update progress bar
        const progress = this.getLevelProgress();
        this.updateElement('current-xp', progress.current);
        this.updateElement('next-level-xp', progress.required);
        
        const progressBar = document.getElementById('xp-progress');
        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }
        
        // Update achievements count
        this.updateElement('badges-earned', this.userProfile.achievements.length);
        this.updateElement('completed-modules', this.userProfile.stats.modulesCompleted);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Notification methods
    showXPNotification(amount, activityType, hasStreakBonus = false) {
        const notification = {
            type: 'xp',
            title: `+${amount} XP`,
            message: `Earned from ${activityType}${hasStreakBonus ? ' (Streak Bonus!)' : ''}`,
            icon: '✨',
            duration: 3000
        };
        
        this.showNotification(notification);
    }

    showLevelUpCelebration(oldLevel, newLevel) {
        const notification = {
            type: 'levelup',
            title: `Level Up! 🎉`,
            message: `Congratulations! You've reached Level ${newLevel}`,
            icon: '⭐',
            duration: 5000,
            special: true
        };
        
        this.showNotification(notification);
        this.dispatchEvent('levelUp', { oldLevel, newLevel });
    }

    showModuleCompletionCelebration(moduleId, bonusXP) {
        const notification = {
            type: 'module',
            title: `Module Completed! 🏆`,
            message: `${moduleId} completed! +${bonusXP} bonus XP`,
            icon: '🎓',
            duration: 4000,
            special: true
        };
        
        this.showNotification(notification);
    }

    showAchievementNotification(achievement) {
        const notification = {
            type: 'achievement',
            title: `Achievement Unlocked! ${achievement.icon}`,
            message: `${achievement.name}: ${achievement.description}`,
            icon: achievement.icon,
            duration: 5000,
            special: true
        };
        
        this.showNotification(notification);
    }

    showUnlockNotification(moduleId) {
        const notification = {
            type: 'unlock',
            title: `Module Unlocked! 🔓`,
            message: `${moduleId} is now available`,
            icon: '🔓',
            duration: 4000
        };
        
        this.showNotification(notification);
    }

    showNotification(notification) {
        // Create notification element
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification--${notification.type} ${notification.special ? 'notification--special' : ''}`;
        
        notificationEl.innerHTML = `
            <div class="notification__icon">${notification.icon}</div>
            <div class="notification__content">
                <div class="notification__title">${notification.title}</div>
                <div class="notification__message">${notification.message}</div>
            </div>
            <button class="notification__close">&times;</button>
        `;
        
        // Add to container
        let container = document.getElementById('notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notificationEl);
        
        // Animate in
        setTimeout(() => notificationEl.classList.add('notification--show'), 100);
        
        // Auto remove
        const autoRemove = setTimeout(() => {
            this.removeNotification(notificationEl);
        }, notification.duration || 3000);
        
        // Manual close
        notificationEl.querySelector('.notification__close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeNotification(notificationEl);
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

    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`gamification:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Public API methods
    completeActivity(moduleId, activityType, data = {}) {
        this.handleActivityCompletion(moduleId, activityType, data);
    }

    completeModule(moduleId) {
        this.handleModuleCompletion(moduleId);
    }

    getUserProfile() {
        return { ...this.userProfile };
    }

    getLeaderboard() {
        // This would typically fetch from backend
        // For now, return mock data with current user
        return [
            {
                name: this.userProfile.username,
                level: this.userProfile.level,
                totalXP: this.userProfile.totalXP,
                streak: this.userProfile.streak,
                modulesCompleted: this.userProfile.stats.modulesCompleted,
                rank: 1
            }
        ];
    }

    reset() {
        localStorage.removeItem('gamificationProfile');
        this.userProfile = this.loadUserProfile();
        this.updateUI();
    }
}

// Initialize global gamification engine after StateManager is ready
function initializeGamificationEngine() {
    if (window.stateManager && window.stateManager.initialized) {
        window.gamificationEngine = new GamificationEngine();
        console.log('✅ GamificationEngine initialized with StateManager');
    } else {
        // Wait for StateManager to be ready
        setTimeout(initializeGamificationEngine, 100);
    }
}

// Start initialization
initializeGamificationEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamificationEngine;
}
