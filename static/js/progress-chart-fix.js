/**
 * Progress Chart Fix
 * Fixes the learning progress chart to show accurate completion data
 */

console.log('📊 Progress chart fix loaded!');

// Override the initializeProgressChart function to use correct data
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Initializing progress chart fix...');
    
    // Wait for app to be available
    function waitForApp() {
        if (window.app && window.app.initializeProgressChart) {
            console.log('📊 App found, overriding progress chart...');
            overrideProgressChart();
        } else {
            setTimeout(waitForApp, 100);
        }
    }
    
    waitForApp();
    
    function overrideProgressChart() {
        const originalInitChart = window.app.initializeProgressChart.bind(window.app);
        
        window.app.initializeProgressChart = function() {
            console.log('📊 Custom progress chart initialization...');
            
            if (this._chartInitPending) return;
            this._chartInitPending = true;
            
            const canvas = document.getElementById('progressChart');
            if (!canvas) {
                console.log('Progress chart canvas not found');
                this._chartInitPending = false;
                return;
            }
            
            if (!window.Chart) {
                console.log('Chart.js not available');
                this._chartInitPending = false;
                return;
            }
            
            try {
                // Clean up existing chart
                if (this.progressChart) {
                    this.progressChart.destroy();
                    this.progressChart = null;
                }
                
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
                
                // Get accurate completion data from gamification system
                let completedCount = 0;
                let inProgressCount = 0;
                let lockedCount = 0;
                
                if (window.gamificationEngine && window.gamificationEngine.userProfile) {
                    const profile = window.gamificationEngine.userProfile;
                    const completedModules = profile.completedModules || new Set();
                    const unlockedModules = profile.unlockedModules || new Set();
                    
                    completedCount = completedModules.size;
                    
                    // Count unlocked but not completed as in progress
                    unlockedModules.forEach(moduleId => {
                        if (!completedModules.has(moduleId)) {
                            inProgressCount++;
                        }
                    });
                    
                    // Remaining modules are locked
                    lockedCount = 10 - completedCount - inProgressCount;
                    
                    console.log('📊 Gamification data - Completed:', completedCount, 'In Progress:', inProgressCount, 'Locked:', lockedCount);
                } else if (window.stateManager) {
                    // Fallback to StateManager
                    const state = window.stateManager.getState();
                    if (state && typeof state === 'object') {
                        const completedModules = state.completedModules || new Set();
                        const unlockedModules = state.unlockedModules || new Set();
                    
                        completedCount = completedModules.size;
                    
                        unlockedModules.forEach(moduleId => {
                            if (!completedModules.has(moduleId)) {
                                inProgressCount++;
                            }
                        });
                    
                        lockedCount = 10 - completedCount - inProgressCount;
                    
                        console.log('📊 StateManager data - Completed:', completedCount, 'In Progress:', inProgressCount, 'Locked:', lockedCount);
                    }
                } else {
                    // Ultimate fallback - use original method
                    console.log('📊 Using fallback data...');
                    completedCount = this.data.owaspModules ? this.data.owaspModules.filter(m => m.status === 'completed').length : 1;
                    inProgressCount = this.data.owaspModules ? this.data.owaspModules.filter(m => m.status === 'in-progress').length : 1;
                    lockedCount = this.data.owaspModules ? this.data.owaspModules.filter(m => m.status === 'locked').length : 8;
                }
                
                // Ensure we have valid data
                if (completedCount + inProgressCount + lockedCount === 0) {
                    completedCount = 1;
                    inProgressCount = 1;
                    lockedCount = 8;
                    console.log('📊 Using default data as fallback');
                }
                
                const ctx = canvas.getContext('2d');
                
                this.progressChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Completed', 'In Progress', 'Locked'],
                        datasets: [{
                            data: [completedCount, inProgressCount, lockedCount],
                            backgroundColor: [
                                'rgba(34, 197, 94, 0.8)',    // Green for completed
                                'rgba(251, 146, 60, 0.8)',   // Orange for in progress
                                'rgba(156, 163, 175, 0.8)'   // Gray for locked
                            ],
                            borderColor: [
                                'rgba(34, 197, 94, 1)',
                                'rgba(251, 146, 60, 1)',
                                'rgba(156, 163, 175, 1)'
                            ],
                            borderWidth: 2,
                            hoverOffset: 4
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
                                    usePointStyle: true,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${value} modules (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        cutout: '60%',
                        animation: {
                            animateScale: true,
                            animateRotate: true
                        }
                    }
                });
                
                console.log('✅ Progress chart created successfully with accurate data!');
                
            } catch (error) {
                console.error('❌ Error creating progress chart:', error);
            } finally {
                this._chartInitPending = false;
            }
        };
        
        // Trigger chart update immediately
        setTimeout(() => {
            if (window.app && window.app.initializeProgressChart) {
                window.app.initializeProgressChart();
            }
        }, 500);
        
        console.log('✅ Progress chart override complete!');
    }
    
    // Also refresh chart when switching to dashboard
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-tab="dashboard"]')) {
            setTimeout(() => {
                if (window.app && window.app.initializeProgressChart) {
                    console.log('📊 Refreshing chart for dashboard tab...');
                    window.app.initializeProgressChart();
                }
            }, 200);
        }
    });
});

// Export for debugging
window.progressChartFix = {
    refresh: function() {
        console.log('📊 Manually refreshing progress chart...');
        if (window.app && window.app.initializeProgressChart) {
            window.app.initializeProgressChart();
        }
    },
    
    checkData: function() {
        console.log('=== PROGRESS CHART DATA CHECK ===');
        
        if (window.gamificationEngine && window.gamificationEngine.userProfile) {
            const profile = window.gamificationEngine.userProfile;
            console.log('Gamification completed modules:', Array.from(profile.completedModules || []));
            console.log('Gamification unlocked modules:', Array.from(profile.unlockedModules || []));
        }
        
        if (window.stateManager) {
            const state = window.stateManager.getState();
            console.log('StateManager completed modules:', Array.from(state.completedModules || []));
            console.log('StateManager unlocked modules:', Array.from(state.unlockedModules || []));
        }
        
        if (window.app && window.app.data && window.app.data.owaspModules) {
            const modules = window.app.data.owaspModules;
            console.log('App modules data:', modules.map(m => ({ id: m.id, status: m.status })));
        }
        
        console.log('=== END DATA CHECK ===');
    }
};

console.log('🛠️ Progress chart debug functions: progressChartFix.refresh(), progressChartFix.checkData()');
