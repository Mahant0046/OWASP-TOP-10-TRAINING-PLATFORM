/**
 * StateManager.js - Centralized State Management
 * Acts as a single source of truth for the application state.
 */
class StateManager {
    constructor() {
        this.state = null;
        this.listeners = [];
        this.initialized = false;
        
        // Initialize state asynchronously
        this.initializeState();

        window.addEventListener('storage', (event) => {
            if (event.key === 'appState') {
                console.log('State changed in another tab. Reloading...');
                this.notify();
            }
        });
    }

    async initializeState() {
        this.state = await this.loadState();
        this.initialized = true;
        console.log('StateManager initialized with state:', this.state);
        this.notify();
    }

    async loadState() {
        try {
            // Try to load from server first if user is authenticated
            const serverState = await this.loadFromServer();
            if (serverState) {
                return serverState;
            }
            
            // Fallback to localStorage
            const savedState = localStorage.getItem('appState');
            const defaultState = {
                userProfile: {
                    name: 'Security Learner',
                    username: 'user',
                    level: 1,
                    totalXP: 0,
                    currentXP: 0,
                    nextLevelXP: 1000,
                    modulesCompleted: 0,
                    badgesEarned: [],
                    streak: 0,
                    joinDate: new Date().toISOString(),
                    completedModules: new Set(),
                    achievements: [],
                    stats: {
                        documentation: 0,
                        animations: 0,
                        labs: 0,
                        quizzes: 0,
                        modulesCompleted: 0,
                        perfectScores: 0,
                        speedCompletions: 0,
                        totalTimeSpent: 0
                    }
                },
                unlockedModules: new Set(['A01']),
                completedModules: new Set(),
                completedActivities: {},
                achievements: new Set(),
                labProgress: {}
            };

            if (savedState) {
                const loaded = JSON.parse(savedState);
                // Revive Sets from arrays
                loaded.unlockedModules = new Set(loaded.unlockedModules || ['A01']);
                loaded.completedModules = new Set(loaded.completedModules || []);
                loaded.achievements = new Set(loaded.achievements || []);
                
                // Merge userProfile with defaults to ensure all properties exist
                if (loaded.userProfile) {
                    loaded.userProfile = {
                        ...defaultState.userProfile,
                        ...loaded.userProfile,
                        stats: {
                            ...defaultState.userProfile.stats,
                            ...(loaded.userProfile.stats || {})
                        }
                    };
                    
                    // Revive Sets in userProfile
                    if (loaded.userProfile.completedModules) {
                        loaded.userProfile.completedModules = new Set(
                            Array.isArray(loaded.userProfile.completedModules) 
                                ? loaded.userProfile.completedModules 
                                : []
                        );
                    }
                    
                    if (loaded.userProfile.achievements) {
                        loaded.userProfile.achievements = Array.isArray(loaded.userProfile.achievements)
                            ? loaded.userProfile.achievements
                            : [];
                    }
                }
                
                return { ...defaultState, ...loaded };
            }
            return defaultState;
        } catch (error) {
            console.error('Error loading state:', error);
            localStorage.removeItem('appState');
            return this.loadState(); // Recurse to get default state
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch('/api/user-progress');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const serverData = result.data;
                    
                    // Convert server data to StateManager format
                    return {
                        userProfile: {
                            name: 'Security Learner',
                            username: 'user',
                            level: 1,
                            totalXP: 0,
                            currentXP: 0,
                            nextLevelXP: 1000,
                            modulesCompleted: serverData.completed_modules.length,
                            badgesEarned: [],
                            streak: 0,
                            joinDate: new Date().toISOString(),
                            completedModules: new Set(serverData.completed_modules),
                            achievements: [],
                            stats: {
                                documentation: 0,
                                animations: 0,
                                labs: 0,
                                quizzes: 0,
                                modulesCompleted: serverData.completed_modules.length,
                                perfectScores: 0,
                                speedCompletions: 0,
                                totalTimeSpent: 0
                            }
                        },
                        unlockedModules: new Set(serverData.unlocked_modules),
                        completedModules: new Set(serverData.completed_modules),
                        completedActivities: {},
                        achievements: new Set(),
                        labProgress: {}
                    };
                }
            }
        } catch (error) {
            console.log('Could not load from server, using local state:', error);
        }
        return null;
    }

    saveState() {
        try {
            const stateToSave = {
                ...this.state,
                // Convert Sets to arrays for JSON serialization (with null checks)
                unlockedModules: Array.from(this.state.unlockedModules || []),
                completedModules: Array.from(this.state.completedModules || []),
                achievements: Array.from(this.state.achievements || []),
                userProfile: {
                    ...this.state.userProfile,
                    completedModules: Array.from(this.state.userProfile?.completedModules || [])
                }
            };
            localStorage.setItem('appState', JSON.stringify(stateToSave));
            this.notify();
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    getState() {
        return this.state;
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.saveState();
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all subscribers
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Module-specific methods
    isModuleUnlocked(moduleId) {
        return this.state.unlockedModules.has(moduleId);
    }

    isModuleCompleted(moduleId) {
        return this.state.completedModules.has(moduleId);
    }

    unlockModule(moduleId) {
        if (!this.isModuleUnlocked(moduleId)) {
            this.state.unlockedModules.add(moduleId);
            console.log(`STATE: Unlocked module ${moduleId}`);
            this.saveState();
            
            // Sync with server to persist unlocked state
            this.syncUnlockedModuleToServer(moduleId);
        }
    }

    async syncUnlockedModuleToServer(moduleId) {
        try {
            console.log(`🔄 Syncing unlocked module ${moduleId} to server...`);
            // This will ensure the module is marked as accessible in the database
            const response = await fetch('/api/complete-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module_id: moduleId,
                    activity_type: 'module_unlock',
                    score: 0,
                    time_spent: 0
                })
            });
            
            if (response.ok) {
                console.log(`✅ Module ${moduleId} unlock synced to server`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to sync module unlock to server:`, error);
        }
    }

    completeModule(moduleId) {
        if (!this.isModuleCompleted(moduleId)) {
            this.state.completedModules.add(moduleId);
            console.log(`STATE: Completed module ${moduleId}`);
            this.saveState();
        }
    }
    
    // Helper method to reset state (useful for debugging)
    resetState() {
        localStorage.removeItem('appState');
        this.state = this.loadState();
        this.notify();
        console.log('✅ State reset to defaults');
        return this.state;
    }
}

// Initialize and export a single instance
window.stateManager = new StateManager();
console.log('✅ StateManager initialized.');
console.log('💡 Tip: Use window.stateManager.resetState() to reset state if needed');

// Helper function to clear corrupted state on console
window.clearCorruptedState = function() {
    console.log('🧹 Clearing potentially corrupted state...');
    localStorage.removeItem('appState');
    localStorage.removeItem('owaspTrainingProgress');
    localStorage.removeItem('gamificationProfile');
    console.log('✅ State cleared. Refresh the page to reinitialize.');
};

console.log('💡 If you see Array.from errors, run: clearCorruptedState()');
