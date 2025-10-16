/**
 * Learning Path Manager - Smart Sequential Learning System
 */

class LearningPathManager {
    constructor() {
        this.modules = [
            { id: 'A01', title: 'Broken Access Control', difficulty: 'beginner' },
            { id: 'A02', title: 'Cryptographic Failures', difficulty: 'intermediate' },
            { id: 'A03', title: 'Injection', difficulty: 'intermediate' },
            { id: 'A04', title: 'Insecure Design', difficulty: 'advanced' },
            { id: 'A05', title: 'Security Misconfiguration', difficulty: 'beginner' },
            { id: 'A06', title: 'Vulnerable Components', difficulty: 'intermediate' },
            { id: 'A07', title: 'Authentication Failures', difficulty: 'intermediate' },
            { id: 'A08', title: 'Data Integrity Failures', difficulty: 'advanced' },
            { id: 'A09', title: 'Logging Failures', difficulty: 'intermediate' },
            { id: 'A10', title: 'SSRF', difficulty: 'advanced' }
        ];

        this.activities = ['documentation', 'animation', 'lab', 'quiz'];
        this.moduleProgress = this.loadProgress();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('learningPathProgress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading learning path progress:', error);
            return {};
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('learningPathProgress', JSON.stringify(this.moduleProgress));
        } catch (error) {
            console.error('Error saving learning path progress:', error);
        }
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const activityBtn = event.target.closest('[data-activity]');
            if (activityBtn) {
                const moduleId = activityBtn.dataset.module;
                const activityType = activityBtn.dataset.activity;
                this.startActivity(moduleId, activityType);
            }
        });
    }

    isActivityUnlocked(moduleId, activityType) {
        if (!window.gamificationEngine.isModuleUnlocked(moduleId)) {
            return false;
        }

        const progress = this.moduleProgress[moduleId];
        if (!progress) return activityType === 'documentation';

        const activityIndex = this.activities.indexOf(activityType);
        if (activityIndex === 0) return true; // Documentation always unlocked

        // Special case: Allow quiz (assessment) after lab is completed
        // This follows the proper learning flow: documentation → animation → lab → quiz
        if (activityType === 'quiz') {
            // Quiz unlocks after lab completion
            return progress['lab'] && progress['lab'].completed;
        }

        // Check if previous activity is completed
        const prevActivity = this.activities[activityIndex - 1];
        return progress[prevActivity] && progress[prevActivity].completed;
    }

    startActivity(moduleId, activityType) {
        if (!this.isActivityUnlocked(moduleId, activityType)) {
            this.showError('Complete previous activities first');
            return;
        }

        switch (activityType) {
            case 'documentation':
                this.startDocumentation(moduleId);
                break;
            case 'animation':
                this.startAnimation(moduleId);
                break;
            case 'lab':
                this.startLab(moduleId);
                break;
            case 'quiz':
                this.startQuiz(moduleId);
                break;
        }
    }

    completeActivity(moduleId, activityType, data = {}) {
        if (!this.moduleProgress[moduleId]) {
            this.moduleProgress[moduleId] = {};
        }

        this.moduleProgress[moduleId][activityType] = {
            completed: true,
            completedAt: new Date().toISOString(),
            score: data.score || 0,
            timeSpent: data.timeSpent || 0
        };

        // Notify gamification engine
        window.gamificationEngine.completeActivity(moduleId, activityType, {
            ...data,
            isFirstTime: !this.moduleProgress[moduleId][activityType]?.completed
        });

        // Check if module is complete
        const isModuleComplete = this.activities.every(activity => 
            this.moduleProgress[moduleId][activity]?.completed
        );

        if (isModuleComplete) {
            window.gamificationEngine.completeModule(moduleId);
        }

        this.saveProgress();
        this.updateUI();
    }

    startDocumentation(moduleId) {
        this.showActivityModal(moduleId, 'documentation', {
            title: `📖 ${moduleId} Documentation`,
            content: this.getDocumentationContent(moduleId),
            duration: 5000,
            buttonText: 'Complete Reading'
        });
    }

    startAnimation(moduleId) {
        this.showActivityModal(moduleId, 'animation', {
            title: `🎬 ${moduleId} Animation`,
            content: `<div class="animation-player">Interactive security animation for ${moduleId}</div>`,
            duration: 3000,
            buttonText: 'Animation Complete'
        });
    }

    startLab(moduleId) {
        this.showActivityModal(moduleId, 'lab', {
            title: `🧪 ${moduleId} Lab`,
            content: `<div class="lab-environment">Hands-on lab environment for ${moduleId}</div>`,
            duration: 8000,
            buttonText: 'Lab Complete'
        });
    }

    startQuiz(moduleId) {
        this.showQuizModal(moduleId);
    }

    showActivityModal(moduleId, activityType, config) {
        const modal = document.createElement('div');
        modal.className = 'modal activity-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${config.title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${config.content}
                    <div class="progress-bar">
                        <div class="progress-fill" id="activity-progress"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="complete-activity" class="btn btn--primary" disabled>
                        ${config.buttonText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        this.simulateProgress(modal, config.duration, () => {
            this.completeActivity(moduleId, activityType, {
                timeSpent: config.duration / 1000,
                score: 85 + Math.random() * 15
            });
            this.closeModal(modal);
        });
    }

    showQuizModal(moduleId) {
        const questions = this.getQuizQuestions(moduleId);
        let currentQuestion = 0;
        let score = 0;

        const modal = document.createElement('div');
        modal.className = 'modal quiz-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✅ ${moduleId} Assessment</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="quiz-content"></div>
                </div>
                <div class="modal-footer">
                    <button id="quiz-submit" class="btn btn--primary">Submit Answer</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        const showQuestion = () => {
            const question = questions[currentQuestion];
            document.getElementById('quiz-content').innerHTML = `
                <h4>Question ${currentQuestion + 1} of ${questions.length}</h4>
                <p>${question.question}</p>
                <div class="quiz-options">
                    ${question.options.map((option, index) => `
                        <label>
                            <input type="radio" name="answer" value="${index}">
                            ${option}
                        </label>
                    `).join('')}
                </div>
            `;
        };

        const submitAnswer = () => {
            const selected = modal.querySelector('input[name="answer"]:checked');
            if (!selected) return;

            const question = questions[currentQuestion];
            if (parseInt(selected.value) === question.correct) {
                score++;
            }

            currentQuestion++;
            if (currentQuestion < questions.length) {
                showQuestion();
            } else {
                const finalScore = Math.round((score / questions.length) * 100);
                this.completeActivity(moduleId, 'quiz', {
                    score: finalScore,
                    timeSpent: 300
                });
                this.closeModal(modal);
            }
        };

        showQuestion();
        modal.querySelector('#quiz-submit').addEventListener('click', submitAnswer);
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
    }

    simulateProgress(modal, duration, onComplete) {
        const progressFill = modal.querySelector('#activity-progress');
        const completeBtn = modal.querySelector('#complete-activity');
        let progress = 0;

        const interval = setInterval(() => {
            progress += 100 / (duration / 100);
            progressFill.style.width = `${Math.min(100, progress)}%`;

            if (progress >= 100) {
                clearInterval(interval);
                completeBtn.disabled = false;
                completeBtn.classList.add('btn--success');
                completeBtn.addEventListener('click', onComplete);
            }
        }, 100);
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    getDocumentationContent(moduleId) {
        const content = {
            A01: 'Access control enforces policy such that users cannot act outside of their intended permissions...',
            A02: 'Cryptographic failures occur when sensitive data is not properly protected through encryption...',
            A03: 'Injection flaws occur when untrusted data is sent to an interpreter as part of a command...'
        };
        return content[moduleId] || `Documentation content for ${moduleId}`;
    }

    getQuizQuestions(moduleId) {
        return [
            {
                question: `What is the primary risk associated with ${moduleId}?`,
                options: ['Performance issues', 'Security vulnerabilities', 'Network problems', 'Code complexity'],
                correct: 1
            },
            {
                question: 'Which prevention method is most effective?',
                options: ['Input validation', 'Output encoding', 'Both A and B', 'Neither'],
                correct: 2
            }
        ];
    }

    updateUI() {
        // Update module cards with progress and unlock status
        this.modules.forEach(module => {
            const moduleCard = document.querySelector(`[data-module-id="${module.id}"]`);
            if (moduleCard) {
                this.updateModuleCard(moduleCard, module.id);
            }
        });
    }

    updateModuleCard(card, moduleId) {
        const isUnlocked = window.gamificationEngine.isModuleUnlocked(moduleId);
        const progress = this.getModuleProgress(moduleId);

        card.classList.toggle('locked', !isUnlocked);
        card.classList.toggle('completed', progress.percentage === 100);

        // Update progress bar if exists
        const progressBar = card.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }

        // Update activity buttons
        this.activities.forEach(activity => {
            const btn = card.querySelector(`[data-activity="${activity}"]`);
            if (btn) {
                const unlocked = this.isActivityUnlocked(moduleId, activity);
                btn.disabled = !unlocked;
                btn.classList.toggle('locked', !unlocked);
            }
        });
    }

    getModuleProgress(moduleId) {
        const progress = this.moduleProgress[moduleId];
        if (!progress) return { completed: 0, total: 4, percentage: 0 };

        const completed = this.activities.filter(activity => 
            progress[activity]?.completed
        ).length;

        return {
            completed,
            total: this.activities.length,
            percentage: Math.round((completed / this.activities.length) * 100)
        };
    }

    showError(message) {
        const notification = {
            type: 'error',
            title: 'Access Denied',
            message,
            icon: '🔒',
            duration: 3000
        };
        
        if (window.gamificationEngine) {
            window.gamificationEngine.showNotification(notification);
        }
    }
}

// Initialize global learning path manager
window.learningPath = new LearningPathManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearningPathManager;
}
