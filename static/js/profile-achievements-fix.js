/**
 * Profile Achievements Fix
 * Fixes the display of badges and achievements in the profile section
 */

// Add immediate debug logging
console.log('🚀 Profile achievements fix script loaded!');

// Try to fix achievements immediately when DOM is ready
function immediateAchievementsFix() {
    console.log('🔧 Attempting immediate achievements fix...');
    
    const achievementsContainer = document.getElementById('all-achievements') || document.getElementById('achievement-gallery');
    console.log('Container found:', !!achievementsContainer);
    console.log('GamificationEngine available:', !!window.gamificationEngine);
    console.log('StateManager available:', !!window.stateManager);
    
    if (achievementsContainer) {
        // Force display some test achievements to verify the container works
        achievementsContainer.innerHTML = `
            <div class="achievement-card earned">
                <div class="achievement-icon">🎯</div>
                <div class="achievement-name">Test Achievement</div>
                <div class="achievement-description">This is a test to verify the container works</div>
                <div class="achievement-xp">+50 XP</div>
                <div class="achievement-earned-date">✅ Test</div>
            </div>
        `;
        console.log('✅ Test achievement added to container!');
        
        // Update counter
        const countElement = document.querySelector('.achievement-count');
        if (countElement) {
            countElement.textContent = '1';
            console.log('✅ Achievement count updated!');
        }
    } else {
        console.log('❌ No achievements container found!');
    }
}

// Try immediate fix
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', immediateAchievementsFix);
} else {
    immediateAchievementsFix();
}

// Also try after a short delay
setTimeout(immediateAchievementsFix, 1000);
setTimeout(immediateAchievementsFix, 3000);

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏆 Initializing profile achievements fix...');
    
    // Override the loadProfile function to properly display achievements
    if (window.app && window.app.loadProfile) {
        const originalLoadProfile = window.app.loadProfile.bind(window.app);
        
        window.app.loadProfile = function() {
            // Call original function first
            originalLoadProfile();
            
            // Then fix the achievements display
            fixAchievementsDisplay.call(this);
        };
    }
    
    function fixAchievementsDisplay() {
        const profile = this.data.userProfile;
        
        // Fix the profile.completedActivities issue first
        if (!profile.completedActivities) {
            profile.completedActivities = {
                modules: new Set(),
                animations: new Set(),
                labs: new Set(),
                assessments: new Set()
            };
            console.log('🔧 Fixed missing completedActivities structure');
        }
        
        // Ensure each property exists and is a Set
        if (!profile.completedActivities.modules) profile.completedActivities.modules = new Set();
        if (!profile.completedActivities.animations) profile.completedActivities.animations = new Set();
        if (!profile.completedActivities.labs) profile.completedActivities.labs = new Set();
        if (!profile.completedActivities.assessments) profile.completedActivities.assessments = new Set();
        
        // Fix achievements display
        const achievementsContainer = document.getElementById('all-achievements') || document.getElementById('achievement-gallery');
        if (achievementsContainer && window.gamificationEngine) {
            console.log('🔧 Fixing achievements display...');
            
            // Get all available achievements from gamification engine
            let allAchievements = [];
            if (window.gamificationEngine.config.achievements) {
                const achievementCategories = window.gamificationEngine.config.achievements;
                Object.values(achievementCategories).forEach(category => {
                    allAchievements = allAchievements.concat(category);
                });
            }
            
            // Check which achievements are earned
            const earnedAchievements = profile.achievements || [];
            console.log('Earned achievements:', earnedAchievements);
            console.log('Available achievements:', allAchievements.length);
            
            // Update achievement count
            const countElement = document.querySelector('.achievement-count');
            if (countElement) {
                countElement.textContent = earnedAchievements.length;
            }
            
            // Generate achievements HTML
            achievementsContainer.innerHTML = allAchievements.map(achievement => {
                const isEarned = earnedAchievements.includes(achievement.id);
                return `
                    <div class="achievement-card ${isEarned ? 'earned' : ''}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-xp">+${achievement.xp} XP</div>
                        ${isEarned ? '<div class="achievement-earned-date">✅ Earned</div>' : '<div class="achievement-locked">🔒 Locked</div>'}
                    </div>`;
            }).join('');
            
            console.log('✅ Achievements display fixed!');
        }
        
        // Fix badges count in dashboard
        const badgesElement = document.getElementById('badges-earned');
        if (badgesElement && profile.achievements) {
            badgesElement.textContent = profile.achievements.length;
            console.log('✅ Badges count updated:', profile.achievements.length);
        }
        
        // Fix profile stats
        updateProfileStatsDisplay.call(this);
    }
    
    function updateProfileStatsDisplay() {
        const profile = this.data.userProfile;
        
        // Update detailed profile stats
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
            const completedModules = Array.from(profile.completedModules || []).length;
            const earnedAchievements = (profile.achievements || []).length;
            
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
                                    <div class="stat-number-large">${profile.totalXP || 0}</div>
                                    <div class="stat-label-detailed">Total XP Earned</div>
                                </div>
                            </div>
                            <div class="stat-item-detailed">
                                <div class="stat-icon-large">⭐</div>
                                <div class="stat-content-detailed">
                                    <div class="stat-number-large">Level ${profile.level || 1}</div>
                                    <div class="stat-label-detailed">Current Level</div>
                                </div>
                            </div>
                            <div class="stat-item-detailed">
                                <div class="stat-icon-large">🔥</div>
                                <div class="stat-content-detailed">
                                    <div class="stat-number-large">${profile.streak || 0}</div>
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
                                    <span>🏆 Achievements Earned</span>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${(earnedAchievements / 20) * 100}%"></div>
                                        </div>
                                        <span class="progress-text">${earnedAchievements}/20+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('✅ Profile stats updated!');
        }
    }
    
    // Also fix the dashboard stats when switching tabs
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-tab="profile"]')) {
            setTimeout(() => {
                if (window.app && window.app.loadProfile) {
                    window.app.loadProfile();
                } else {
                    // Fallback: manually trigger achievements display
                    manuallyFixAchievements();
                }
            }, 100);
        }
    });
    
    // Manual fix function for when app.loadProfile is not available
    function manuallyFixAchievements() {
        console.log('🔧 Manually fixing achievements...');
        
        const achievementsContainer = document.getElementById('all-achievements') || document.getElementById('achievement-gallery');
        if (achievementsContainer && window.gamificationEngine) {
            // Get profile data from StateManager or gamification engine
            let profile = {};
            if (window.stateManager) {
                profile = window.stateManager.getState().userProfile;
            } else if (window.gamificationEngine) {
                profile = window.gamificationEngine.getUserProfile();
            }
            
            // Fix the profile.completedActivities issue
            if (!profile.completedActivities) {
                profile.completedActivities = {
                    modules: new Set(),
                    animations: new Set(),
                    labs: new Set(),
                    assessments: new Set()
                };
            } else {
                // Ensure each property exists and is a Set
                if (!profile.completedActivities.modules) profile.completedActivities.modules = new Set();
                if (!profile.completedActivities.animations) profile.completedActivities.animations = new Set();
                if (!profile.completedActivities.labs) profile.completedActivities.labs = new Set();
                if (!profile.completedActivities.assessments) profile.completedActivities.assessments = new Set();
            }
            
            // Get all available achievements
            let allAchievements = [];
            if (window.gamificationEngine.config.achievements) {
                const achievementCategories = window.gamificationEngine.config.achievements;
                Object.values(achievementCategories).forEach(category => {
                    allAchievements = allAchievements.concat(category);
                });
            }
            
            // Check which achievements are earned
            const earnedAchievements = profile.achievements || [];
            console.log('Manual fix - Earned achievements:', earnedAchievements);
            console.log('Manual fix - Available achievements:', allAchievements.length);
            
            // Update achievement count
            const countElement = document.querySelector('.achievement-count');
            if (countElement) {
                countElement.textContent = earnedAchievements.length;
            }
            
            // Generate achievements HTML
            achievementsContainer.innerHTML = allAchievements.map(achievement => {
                const isEarned = earnedAchievements.includes(achievement.id);
                return `
                    <div class="achievement-card ${isEarned ? 'earned' : ''}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-xp">+${achievement.xp} XP</div>
                        ${isEarned ? '<div class="achievement-earned-date">✅ Earned</div>' : '<div class="achievement-locked">🔒 Locked</div>'}
                    </div>`;
            }).join('');
            
            console.log('✅ Manual achievements fix complete!');
        }
    }
    
    console.log('✅ Profile achievements fix initialized!');
});

// Export for debugging - make it available immediately
window.profileAchievementsFix = {
    forceRefresh: function() {
        console.log('🔄 Force refreshing achievements...');
        immediateAchievementsFix();
        if (window.app && window.app.loadProfile) {
            window.app.loadProfile();
        } else {
            manuallyFixAchievements();
        }
    },
    
    testContainer: function() {
        console.log('🧪 Testing container...');
        immediateAchievementsFix();
    },
    
    manualFix: function() {
        manuallyFixAchievements();
    },
    
    checkStatus: function() {
        console.log('=== PROFILE ACHIEVEMENTS STATUS ===');
        console.log('app.loadProfile available:', !!(window.app && window.app.loadProfile));
        console.log('gamificationEngine available:', !!window.gamificationEngine);
        console.log('stateManager available:', !!window.stateManager);
        
        const container = document.getElementById('all-achievements') || document.getElementById('achievement-gallery');
        console.log('achievements container found:', !!container);
        console.log('container element:', container);
        
        if (window.stateManager) {
            const profile = window.stateManager.getState().userProfile;
            console.log('user profile achievements:', profile.achievements);
        }
        
        // Check if we're on the profile tab
        const profileTab = document.querySelector('[data-tab="profile"]');
        const profileContent = document.getElementById('profile');
        console.log('profile tab found:', !!profileTab);
        console.log('profile content visible:', profileContent ? profileContent.classList.contains('active') : false);
        
        console.log('=== END STATUS ===');
    }
};

console.log('🛠️ Debug functions available: profileAchievementsFix.testContainer(), profileAchievementsFix.checkStatus()');
