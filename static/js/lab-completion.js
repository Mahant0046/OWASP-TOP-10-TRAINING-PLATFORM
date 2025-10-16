/**
 * Lab Completion Helper
 * Adds "Mark as Complete & Go to Assessment" button to all lab pages
 */

(function() {
    'use strict';
    
    // Check if we're on a lab page
    const isLabPage = window.location.pathname.includes('/labs/');
    
    if (!isLabPage) {
        return;
    }
    
    // Extract module ID from URL (e.g., /labs/A01 -> A01)
    const pathParts = window.location.pathname.split('/');
    const moduleId = pathParts[pathParts.length - 1].toUpperCase();
    
    // Only add button if moduleId matches OWASP format (A01-A10)
    if (!/^A(0[1-9]|10)$/.test(moduleId)) {
        console.log('Not an OWASP module lab page');
        return;
    }
    
    console.log(`Lab Completion Helper initialized for module: ${moduleId}`);
    
    // Add completion button to the page
    function addCompletionButton() {
        // Find a suitable place to add the button
        let targetContainer = document.querySelector('.section-header');
        
        if (!targetContainer) {
            targetContainer = document.querySelector('.card');
        }
        
        if (!targetContainer) {
            console.warn('Could not find suitable container for completion button');
            return;
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'lab-completion-container';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 1000;
            display: flex;
            gap: 12px;
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        // Create completion button
        const completeBtn = document.createElement('button');
        completeBtn.id = 'lab-complete-btn';
        completeBtn.className = 'btn btn--success';
        completeBtn.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Mark as Complete & Go to Assessment
        `;
        completeBtn.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            padding: 12px 24px;
        `;
        
        completeBtn.addEventListener('click', async () => {
            await markLabComplete(moduleId, completeBtn);
        });
        
        buttonContainer.appendChild(completeBtn);
        document.body.appendChild(buttonContainer);
        
        console.log('✅ Completion button added to lab page');
    }
    
    // Mark lab as complete and navigate to assessment
    async function markLabComplete(moduleId, button) {
        console.log(`Marking lab ${moduleId} as complete`);
        
        // Show loading state
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing...';
        button.disabled = true;
        
        try {
            // Try using learning path system first
            if (window.learningPath) {
                console.log('Using learning path system');
                
                await window.learningPath.completeActivity(moduleId, 'lab', {
                    score: 100,
                    timeSpent: 0
                });
                
                // Show success notification
                if (window.gamificationEngine) {
                    window.gamificationEngine.showNotification({
                        type: 'success',
                        title: 'Lab Completed! 🎉',
                        message: '+75 XP earned! Redirecting to assessment...',
                        icon: '✅',
                        duration: 2000
                    });
                }
                
                // Navigate after delay
                setTimeout(() => {
                    window.location.href = `/assessment/${moduleId}`;
                }, 2000);
                
            } else {
                // Fallback to API
                console.log('Using API fallback');
                
                const response = await fetch('/api/gamification/complete-activity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        module_id: moduleId,
                        activity_type: 'lab',
                        score: 100,
                        time_spent: 0
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccessMessage('Lab completed! +75 XP earned. Redirecting...');
                    setTimeout(() => {
                        window.location.href = `/assessment/${moduleId}`;
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Failed to complete lab');
                }
            }
        } catch (error) {
            console.error('Error completing lab:', error);
            button.innerHTML = originalHTML;
            button.disabled = false;
            showErrorMessage('Failed to complete lab: ' + error.message);
        }
    }
    
    // Show success message
    function showSuccessMessage(message) {
        showMessage(message, 'success', '#28a745');
    }
    
    // Show error message
    function showErrorMessage(message) {
        showMessage(message, 'error', '#dc3545');
    }
    
    // Show notification message
    function showMessage(message, type, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 16px;
            font-weight: 500;
            animation: slideDown 0.3s ease;
        `;
        notification.textContent = message;
        
        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translate(-50%, -100%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addCompletionButton);
    } else {
        addCompletionButton();
    }
})();
