/**
 * Profile Data Loader
 * Loads and displays learning progress and achievements in the profile page
 */

(function() {
    'use strict';
    
    console.log('📊 Profile Data Loader initialized');
    
    // Load profile data when profile tab is shown
    function loadProfileData() {
        console.log('🔄 Loading profile data...');
        
        // Fetch gamification profile data
        fetch('/api/gamification/profile')
            .then(response => {
                // Check if response is OK
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned non-JSON response. Check server logs for errors.');
                }
                
                return response.json();
            })
            .then(result => {
                if (result.success && result.data) {
                    updateLearningProgress(result.data);
                    updateAchievements(result.data);
                    console.log('✅ Profile data loaded successfully');
                } else {
                    console.error('❌ Failed to load profile data:', result.error || 'Unknown error');
                    showProfileErrorMessage(result.error || 'Failed to load profile data');
                }
            })
            .catch(error => {
                console.error('❌ Error loading profile data:', error);
                showProfileErrorMessage(error.message || 'Network error occurred');
            });
    }
    
    function showProfileErrorMessage(message) {
        console.warn('⚠️ Showing profile error message:', message);
        
        // Try to find profile content areas and show error message
        const progressWidget = document.querySelector('.learning-progress-widget');
        const achievementGallery = document.getElementById('achievement-gallery');
        
        const errorHtml = `
            <div class="profile-error-message" style="
                background: #fee; 
                border: 1px solid #fcc; 
                color: #c33; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 10px 0;
                text-align: center;
            ">
                <strong>⚠️ Profile Loading Error</strong><br>
                ${message}<br>
                <small>Please try refreshing the page or contact support if the issue persists.</small>
            </div>
        `;
        
        if (progressWidget) {
            progressWidget.innerHTML = errorHtml;
        }
        
        if (achievementGallery) {
            achievementGallery.innerHTML = errorHtml;
        }
    }
    
    function updateLearningProgress(profile) {
        console.log('📈 Updating learning progress...', profile);
        
        const activityStats = profile.activity_stats || {};
        
        // Count completed activities by type
        const docsCompleted = activityStats.documentation ? activityStats.documentation.count : 0;
        const labsCompleted = activityStats.lab ? activityStats.lab.count : 0;
        const assessmentsCompleted = activityStats.assessment ? activityStats.assessment.count : 0;
        const animationsCompleted = activityStats.animation ? activityStats.animation.count : 0;
        
        // Update XP progress
        const currentXP = profile.current_xp || 0;
        const nextLevelXP = profile.next_level_xp || 1000;
        const xpProgressPercent = (currentXP / nextLevelXP) * 100;
        
        const xpProgressBar = document.querySelector('.learning-progress-widget .progress-fill');
        const xpProgressText = document.querySelector('.learning-progress-widget .xp-progress-text');
        
        if (xpProgressBar) {
            xpProgressBar.style.width = `${xpProgressPercent}%`;
        }
        
        if (xpProgressText) {
            xpProgressText.textContent = `${currentXP} / ${nextLevelXP} XP`;
        }
        
        // Update activity completion counts
        const docsElement = document.getElementById('docs-completed');
        const labsElement = document.getElementById('labs-completed');
        const assessmentsElement = document.getElementById('assessments-completed');
        const animationsElement = document.getElementById('animations-completed');
        
        if (docsElement) docsElement.textContent = `${docsCompleted}/10`;
        if (labsElement) labsElement.textContent = `${labsCompleted}/10`;
        if (assessmentsElement) assessmentsElement.textContent = `${assessmentsCompleted}/10`;
        if (animationsElement) animationsElement.textContent = `${animationsCompleted}/10`;
        
        console.log('✅ Learning progress updated:', {
            docs: docsCompleted,
            labs: labsCompleted,
            assessments: assessmentsCompleted,
            animations: animationsCompleted
        });
    }
    
    function updateAchievements(profile) {
        console.log('🏆 Updating achievements...', profile);
        
        const achievementsContainer = document.getElementById('achievement-gallery');
        const achievementCount = document.querySelector('.achievement-count');
        
        if (!achievementsContainer) {
            console.warn('⚠️ Achievement gallery container not found');
            return;
        }
        
        const earnedAchievements = profile.achievements || [];
        
        // Update count
        if (achievementCount) {
            achievementCount.textContent = earnedAchievements.length;
        }
        
        // Define all available achievements
        const allAchievements = [
            {
                id: 'first_steps',
                name: 'First Steps',
                description: 'Complete your first activity',
                icon: '🎯',
                xp: 50,
                category: 'milestone'
            },
            {
                id: 'getting_started',
                name: 'Getting Started',
                description: 'Earn your first 100 XP',
                icon: '⭐',
                xp: 100,
                category: 'xp'
            },
            {
                id: 'xp_collector',
                name: 'XP Collector',
                description: 'Earn 1000 total XP',
                icon: '💎',
                xp: 200,
                category: 'xp'
            },
            {
                id: 'xp_master',
                name: 'XP Master',
                description: 'Earn 5000 total XP',
                icon: '👑',
                xp: 500,
                category: 'xp'
            },
            {
                id: 'bookworm',
                name: 'Bookworm',
                description: 'Read 5 documentation sections',
                icon: '📚',
                xp: 150,
                category: 'learning'
            },
            {
                id: 'visual_learner',
                name: 'Visual Learner',
                description: 'Watch 5 animations',
                icon: '🎬',
                xp: 150,
                category: 'learning'
            },
            {
                id: 'hands_on',
                name: 'Hands On',
                description: 'Complete 3 labs',
                icon: '🧪',
                xp: 200,
                category: 'practice'
            },
            {
                id: 'lab_master',
                name: 'Lab Master',
                description: 'Complete all 10 labs',
                icon: '🔬',
                xp: 500,
                category: 'practice'
            },
            {
                id: 'quick_learner',
                name: 'Quick Learner',
                description: 'Complete a module in under 30 minutes',
                icon: '⚡',
                xp: 250,
                category: 'speed'
            },
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Score 100% on an assessment',
                icon: '💯',
                xp: 300,
                category: 'achievement'
            }
        ];
        
        // Check which achievements are earned (match by name since we might not have IDs)
        const earnedNames = earnedAchievements.map(a => a.name.toLowerCase());
        
        // Generate HTML for all achievements
        achievementsContainer.innerHTML = allAchievements.map(achievement => {
            const isEarned = earnedNames.includes(achievement.name.toLowerCase()) || 
                           earnedAchievements.some(a => a.name === achievement.name);
            
            return `
                <div class="achievement-card ${isEarned ? 'earned' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-badge">${isEarned ? '+' + achievement.xp + ' XP' : '🔒 Locked'}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    ${isEarned ? '<div class="achievement-status">✅ Earned</div>' : ''}
                </div>
            `;
        }).join('');
        
        console.log('✅ Achievements updated:', earnedAchievements.length, 'earned');
    }
    
    // Load data when DOM is ready
    function init() {
        // Load immediately if profile tab is active
        const profileTab = document.getElementById('profile');
        if (profileTab && !profileTab.classList.contains('hidden')) {
            loadProfileData();
        }
        
        // Listen for tab changes
        document.addEventListener('click', function(e) {
            const tabButton = e.target.closest('[data-tab="profile"]');
            if (tabButton) {
                // Small delay to ensure tab content is visible
                setTimeout(loadProfileData, 100);
            }
        });
        
        // Also listen for custom events
        document.addEventListener('profileTabShown', loadProfileData);
        document.addEventListener('activityCompleted', function() {
            // Reload profile data when an activity is completed
            setTimeout(loadProfileData, 500);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export for manual refresh
    window.refreshProfileData = loadProfileData;
    
    console.log('✅ Profile Data Loader ready. Use window.refreshProfileData() to manually refresh.');
    
})();
