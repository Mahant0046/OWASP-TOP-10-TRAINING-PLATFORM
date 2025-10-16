/**
 * Gamification Integration Script
 * Provides missing methods and ensures proper integration between
 * the new gamification system and the existing app
 */

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Initializing gamification integration...');
    
    // Add missing showError method to the app instance
    if (window.app && !window.app.showError) {
        window.app.showError = function(message) {
            console.log('📢 Showing error:', message);
            
            // Use the new gamification engine's notification system if available
            if (window.gamificationEngine) {
                window.gamificationEngine.showNotification({
                    type: 'error',
                    title: 'Access Denied',
                    message: message,
                    icon: '🔒',
                    duration: 4000
                });
            } else {
                // Fallback to alert
                alert(message);
            }
        };
        console.log('✅ Added showError method to app');
    }
    
    // Enhanced module start functionality
    function enhancedModuleStart() {
        console.log('🚀 Setting up enhanced module start functionality');
        
        // Override the start module button click handler
        document.addEventListener('click', function(e) {
            if (e.target.id === 'start-module') {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🎯 Enhanced start module clicked');
                
                // Get module ID from modal title
                const modalTitle = document.getElementById('modal-title');
                if (!modalTitle) {
                    console.error('❌ Could not find modal title');
                    return;
                }
                
                const titleText = modalTitle.textContent;
                const moduleId = titleText.split(':')[0].trim();
                console.log('📋 Extracted module ID:', moduleId);
                console.log('📋 Full title text:', titleText);
                
                // Check if new systems are available
                if (window.gamificationEngine && window.learningPath) {
                    console.log('✅ New gamification systems available');
                    
                    // Check if module is unlocked
                    if (window.gamificationEngine.isModuleUnlocked(moduleId)) {
                        console.log('🔓 Module is unlocked, starting activity');
                        
                        // Call API to start module tracking
                        fetch('/api/start-module', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                module_id: moduleId
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                console.log('✅ Module tracking started:', data);
                                // Start the module progression by redirecting to documentation
                                window.location.href = `/module/${moduleId}/documentation`;
                            } else {
                                console.error('❌ Failed to start module tracking:', data.error);
                                // Still redirect to documentation even if tracking fails
                                window.location.href = `/module/${moduleId}/documentation`;
                            }
                        })
                        .catch(error => {
                            console.error('❌ Error starting module:', error);
                            // Still redirect to documentation even if API fails
                            window.location.href = `/module/${moduleId}/documentation`;
                        });
                        
                        // Close the modal
                        if (window.app && window.app.closeModal) {
                            window.app.closeModal();
                        }
                        
                        // Show success notification
                        window.gamificationEngine.showNotification({
                            type: 'info',
                            title: 'Module Started! 📖',
                            message: `Beginning ${moduleId} with documentation`,
                            icon: '🎓',
                            duration: 3000
                        });
                        
                    } else {
                        console.log('🔒 Module is locked:', moduleId);
                        
                        // Show error using the enhanced method
                        if (window.app && window.app.showError) {
                            window.app.showError(`Module ${moduleId} is locked. Complete previous modules first.`);
                        } else {
                            alert(`Module ${moduleId} is locked. Complete previous modules first.`);
                        }
                    }
                } else {
                    console.log('⚠️ New systems not available, using direct fallback');
                    
                    // Direct fallback - just redirect to documentation
                    console.log('🔄 Redirecting directly to documentation for:', moduleId);
                    window.location.href = `/module/${moduleId}/documentation`;
                }
            }
        }, true); // Use capture phase to ensure we handle it first
    }
    
    // Activity completion integration
    function setupActivityCompletionIntegration() {
        console.log('🎯 Setting up activity completion integration');
        
        // Listen for activity completions from the learning path system
        document.addEventListener('activityCompleted', async function(event) {
            console.log('🎉 Activity completed event received:', event.detail);
            
            const { moduleId, activityType, data } = event.detail;
            
            try {
                // Send to backend gamification system
                const response = await fetch('/api/gamification/award-xp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        module_id: moduleId,
                        activity_type: activityType,
                        score: data.score || 0,
                        time_spent: data.timeSpent || 0
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Backend gamification updated:', result);
                    
                    // Sync frontend with backend data
                    await syncGamificationData();
                    
                    // Show success notification
                    if (window.gamificationEngine) {
                        window.gamificationEngine.showNotification({
                            type: 'xp',
                            title: `+${result.data?.xp_earned || 0} XP`,
                            message: `Earned from ${activityType} completion`,
                            icon: '✨',
                            duration: 3000
                        });
                    }
                } else {
                    console.error('❌ Failed to update backend gamification');
                }
            } catch (error) {
                console.error('❌ Error syncing activity completion:', error);
            }
        });
    }
    
    
    // Fix Chart.js canvas reuse issues
    function fixChartCanvasIssues() {
        console.log('🔧 Setting up Chart.js canvas fix...');
        
        // Override the app's chart initialization to handle canvas reuse properly
        if (window.app && window.app.initializeProgressChart) {
            const originalInitChart = window.app.initializeProgressChart.bind(window.app);
            
            window.app.initializeProgressChart = function() {
                console.log('📊 Initializing progress chart with canvas fix...');
                
                // Destroy all existing Chart.js instances
                if (window.Chart && window.Chart.instances) {
                    Object.keys(window.Chart.instances).forEach(key => {
                        const chart = window.Chart.instances[key];
                        if (chart && chart.canvas && chart.canvas.id === 'progressChart') {
                            console.log('🗑️ Destroying existing chart instance:', key);
                            chart.destroy();
                        }
                    });
                }
                
                // Also check the app's stored chart reference
                if (this.progressChart) {
                    console.log('🗑️ Destroying app chart reference');
                    try {
                        this.progressChart.destroy();
                    } catch (e) {
                        console.log('Chart already destroyed or invalid');
                    }
                    this.progressChart = null;
                }
                
                // Clear the canvas
                const canvas = document.getElementById('progressChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                
                // Call the original method
                try {
                    originalInitChart();
                } catch (error) {
                    console.error('❌ Chart initialization error:', error);
                    
                    // If still failing, try a more aggressive approach
                    if (error.message.includes('Canvas is already in use')) {
                        console.log('🔄 Attempting aggressive canvas cleanup...');
                        
                        // Remove and recreate the canvas element
                        if (canvas && canvas.parentNode) {
                            const newCanvas = document.createElement('canvas');
                            newCanvas.id = 'progressChart';
                            newCanvas.width = canvas.width;
                            newCanvas.height = canvas.height;
                            canvas.parentNode.replaceChild(newCanvas, canvas);
                            
                            // Try again with new canvas
                            setTimeout(() => {
                                try {
                                    originalInitChart();
                                } catch (retryError) {
                                    console.error('❌ Chart retry failed:', retryError);
                                }
                            }, 100);
                        }
                    }
                }
            };
            
            console.log('✅ Chart.js canvas fix applied');
        }
    }

    // Initialize everything when systems are ready
    function initializeWhenReady() {
        // Check if all required systems are loaded
        if (window.app && window.gamificationEngine && window.learningPath) {
            console.log('✅ All systems loaded, initializing integration');
            
            enhancedModuleStart();
            setupActivityCompletionIntegration();
            fixChartCanvasIssues();
            
            // The StateManager now handles initial state loading.
            
            console.log('🎮 Gamification integration complete!');
            
            // Show ready notification
            setTimeout(() => {
                if (window.gamificationEngine) {
                    window.gamificationEngine.showNotification({
                        type: 'info',
                        title: 'Gamification Ready! 🎮',
                        message: 'Click "Start Module" to begin learning',
                        icon: '🚀',
                        duration: 4000
                    });
                }
            }, 1000);
            
        } else {
            console.log('⏳ Waiting for systems to load...');
            setTimeout(initializeWhenReady, 500);
        }
    }
    
    // Start initialization
    initializeWhenReady();
});

// Export functions for debugging
window.gamificationIntegration = {
    syncData: async function() {
        const response = await fetch('/api/gamification/profile');
        const result = await response.json();
        console.log('Gamification profile:', result);
        return result;
    },
    
    testModuleStart: function(moduleId = 'A01') {
        console.log('🧪 Testing module start for:', moduleId);
        
        if (window.gamificationEngine && window.learningPath) {
            if (window.gamificationEngine.isModuleUnlocked(moduleId)) {
                window.learningPath.startActivity(moduleId, 'documentation');
                console.log('✅ Module started successfully');
            } else {
                console.log('🔒 Module is locked');
            }
        } else {
            console.log('❌ Systems not available');
        }
    },
    
    checkSystems: function() {
        console.log('System Status:');
        console.log('- App:', !!window.app);
        console.log('- Gamification Engine:', !!window.gamificationEngine);
        console.log('- Learning Path:', !!window.learningPath);
        console.log('- showError method:', !!(window.app && window.app.showError));
        console.log('- Chart.js:', !!window.Chart);
        console.log('- Chart instances:', window.Chart ? Object.keys(window.Chart.instances || {}).length : 0);
    },
    
    fixChartIssues: function() {
        console.log('🔧 Manually fixing chart issues...');
        
        // Destroy all Chart.js instances
        if (window.Chart && window.Chart.instances) {
            Object.keys(window.Chart.instances).forEach(key => {
                const chart = window.Chart.instances[key];
                console.log('🗑️ Destroying chart instance:', key);
                chart.destroy();
            });
        }
        
        // Clear app chart reference
        if (window.app && window.app.progressChart) {
            try {
                window.app.progressChart.destroy();
            } catch (e) {
                console.log('Chart already destroyed');
            }
            window.app.progressChart = null;
        }
        
        console.log('✅ Chart cleanup complete');
    },
    
    testNotificationSystem: function() {
        console.log('🔔 Testing notification system...');
        
        if (!window.gamificationEngine) {
            console.log('❌ Gamification engine not available');
            return;
        }
        
        // Test XP notification
        window.gamificationEngine.showNotification({
            type: 'xp',
            title: '+50 XP',
            message: 'Test XP notification',
            icon: '✨',
            duration: 3000
        });
        
        setTimeout(() => {
            // Test achievement notification
            window.gamificationEngine.showNotification({
                type: 'achievement',
                title: 'Achievement Unlocked! 🏆',
                message: 'Test achievement notification',
                icon: '🎯',
                duration: 3000
            });
        }, 1000);
        
        setTimeout(() => {
            // Test error notification
            window.gamificationEngine.showNotification({
                type: 'error',
                title: 'Test Error',
                message: 'This is a test error notification',
                icon: '🔒',
                duration: 3000
            });
        }, 2000);
    }
};


// Add missing completeDocumentationAndNext function
window.completeDocumentationAndNext = function(moduleId) {
    console.log("Completing documentation and navigating to animation for:", moduleId);
    
    // Mark documentation as completed if learning path is available
    if (window.learningPath) {
        window.learningPath.completeActivity(moduleId, 'documentation', {
            score: 100,
            timeSpent: 300
        });
    }
    
    // Navigate to animation
    window.location.href = `/module/${moduleId}/animation`;
};

console.log("✅ Added completeDocumentationAndNext function");

// Add missing completeAnimationAndNext function
window.completeAnimationAndNext = function(moduleId) {
    console.log("🎬 Completing animation and navigating to lab for:", moduleId);
    
    // Mark animation as completed if learning path is available
    if (window.learningPath) {
        window.learningPath.completeActivity(moduleId, 'animation', {
            score: 100,
            timeSpent: 180
        });
    }
    
    // Navigate to lab
    window.location.href = `/labs/${moduleId}`;
};

console.log("✅ Added completeAnimationAndNext function");
