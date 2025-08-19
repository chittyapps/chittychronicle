/**
 * Enhanced ChittyTrust Interactive Features
 * Advanced user experience enhancements
 */

class ChittyTrustEnhanced {
    constructor() {
        this.currentPersona = null;
        this.isLoading = false;
        this.trustData = null;
        this.particles = [];
        this.init();
    }

    init() {
        this.setupEnhancedLoading();
        this.setupInteractiveCharts();
        this.setupPersonaInteractions();
        this.setupParticleSystem();
        this.setupAdvancedAnimations();
        this.setupRealTimeUpdates();
    }

    // Enhanced Loading System
    setupEnhancedLoading() {
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            this.showAdvancedLoading();
            return originalFetch(...args)
                .then(response => {
                    this.hideAdvancedLoading();
                    return response;
                })
                .catch(error => {
                    this.hideAdvancedLoading();
                    this.showErrorState(error);
                    throw error;
                });
        };
    }

    showAdvancedLoading() {
        if (this.isLoading) return;
        this.isLoading = true;

        const loadingEl = document.createElement('div');
        loadingEl.id = 'advanced-loading';
        loadingEl.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-content">
                    <div class="trust-ring-loader"></div>
                    <div class="loading-text">
                        <div class="loading-title">Calculating Trust Score</div>
                        <div class="loading-subtitle">Analyzing 6D dimensions...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(loadingEl);
        setTimeout(() => loadingEl.classList.add('show'), 50);
    }

    hideAdvancedLoading() {
        this.isLoading = false;
        const loadingEl = document.getElementById('advanced-loading');
        if (loadingEl) {
            loadingEl.classList.add('hide');
            setTimeout(() => loadingEl.remove(), 300);
        }
    }

    // Interactive Chart Enhancements
    setupInteractiveCharts() {
        const originalUpdateCharts = window.updateCharts;
        window.updateCharts = (trustData) => {
            this.trustData = trustData;
            this.createEnhancedRadarChart(trustData);
            this.createTrustScoreRing(trustData);
            this.createDimensionBreakdown(trustData);
            if (originalUpdateCharts) originalUpdateCharts(trustData);
        };
    }

    createEnhancedRadarChart(trustData) {
        const ctx = document.getElementById('trustRadarChart');
        if (!ctx) return;

        // Enhanced radar chart with animations and interactions
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Source', 'Temporal', 'Channel', 'Outcome', 'Network', 'Justice'],
                datasets: [{
                    label: 'Trust Dimensions',
                    data: [
                        trustData.dimensions.source * 100,
                        trustData.dimensions.temporal * 100,
                        trustData.dimensions.channel * 100,
                        trustData.dimensions.outcome * 100,
                        trustData.dimensions.network * 100,
                        trustData.dimensions.justice * 100
                    ],
                    backgroundColor: 'rgba(0, 136, 255, 0.2)',
                    borderColor: 'rgba(0, 255, 136, 1)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(0, 255, 136, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff',
                            font: { size: 14, family: 'Inter' }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: {
                            color: '#ffffff',
                            font: { size: 12, family: 'Inter' }
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            backdropColor: 'transparent'
                        }
                    }
                },
                interaction: {
                    intersect: false
                },
                onHover: (event, elements) => {
                    if (elements.length > 0) {
                        this.showDimensionTooltip(elements[0].index, event);
                    }
                }
            }
        });
    }

    createTrustScoreRing(trustData) {
        const container = document.querySelector('.trust-score-display');
        if (!container) return;

        const score = Math.round(trustData.scores.chitty * 100);
        container.innerHTML = `
            <div class="trust-score-advanced">
                <div class="trust-ring" style="--score: ${score}"></div>
                <div class="trust-score-value">
                    <div class="trust-score-number" data-target="${score}">0</div>
                    <div class="trust-score-label">Chitty Score™</div>
                </div>
            </div>
        `;

        // Animate the score counter
        this.animateCounter('.trust-score-number', score, 2000);
    }

    createDimensionBreakdown(trustData) {
        const container = document.querySelector('.dimension-breakdown');
        if (!container) return;

        const dimensions = [
            { name: 'Source', value: trustData.dimensions.source, icon: 'user-check' },
            { name: 'Temporal', value: trustData.dimensions.temporal, icon: 'clock' },
            { name: 'Channel', value: trustData.dimensions.channel, icon: 'message-circle' },
            { name: 'Outcome', value: trustData.dimensions.outcome, icon: 'target' },
            { name: 'Network', value: trustData.dimensions.network, icon: 'users' },
            { name: 'Justice', value: trustData.dimensions.justice, icon: 'scales' }
        ];

        container.innerHTML = dimensions.map((dim, index) => `
            <div class="dimension-card glass-card" style="animation-delay: ${index * 0.1}s">
                <div class="dimension-icon">
                    <i data-feather="${dim.icon}"></i>
                </div>
                <div class="dimension-name">${dim.name}</div>
                <div class="dimension-value">${Math.round(dim.value * 100)}%</div>
                <div class="dimension-bar">
                    <div class="dimension-fill" style="width: ${dim.value * 100}%"></div>
                </div>
            </div>
        `).join('');

        feather.replace();
    }

    // Enhanced Persona Interactions
    setupPersonaInteractions() {
        document.addEventListener('click', (e) => {
            const personaCard = e.target.closest('.persona-card-enhanced');
            if (personaCard) {
                this.selectPersonaEnhanced(personaCard.dataset.persona);
            }
        });
    }

    selectPersonaEnhanced(personaId) {
        // Add visual feedback
        document.querySelectorAll('.persona-card-enhanced').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-persona="${personaId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            this.triggerSuccess('Persona selected!');
        }

        // Enhanced persona selection with animations
        this.currentPersona = personaId;
        this.loadPersonaWithTransition(personaId);
    }

    loadPersonaWithTransition(personaId) {
        // Fade out current content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.opacity = '0.3';
            mainContent.style.transform = 'scale(0.95)';
        }

        // Load new persona data
        fetch(`/api/trust/${personaId}`)
            .then(response => response.json())
            .then(data => {
                setTimeout(() => {
                    this.updateUIWithTransition(data);
                    if (mainContent) {
                        mainContent.style.opacity = '1';
                        mainContent.style.transform = 'scale(1)';
                    }
                }, 300);
            })
            .catch(error => this.showErrorState(error));
    }

    updateUIWithTransition(data) {
        // Update all UI elements with smooth transitions
        this.updateCharts(data);
        this.updateMetrics(data);
        this.updatePersonaDetails(data);
    }

    // Particle System for Visual Enhancement
    setupParticleSystem() {
        const canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        document.body.appendChild(canvas);

        this.initParticles(canvas);
    }

    initParticles(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Create particles
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.3
            });
        }

        this.animateParticles(ctx, canvas);
    }

    animateParticles(ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            ctx.fillStyle = `rgba(0, 136, 255, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(() => this.animateParticles(ctx, canvas));
    }

    // Advanced Animations
    setupAdvancedAnimations() {
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.glass-card, .neuro-card, .dashboard-metric').forEach(el => {
            observer.observe(el);
        });
    }

    // Real-time Updates
    setupRealTimeUpdates() {
        // Simulate real-time trust score updates
        setInterval(() => {
            if (this.currentPersona && this.trustData) {
                this.updateTrustMetrics();
            }
        }, 30000); // Update every 30 seconds
    }

    updateTrustMetrics() {
        // Simulate small trust score fluctuations
        const variance = 0.02;
        if (this.trustData && this.trustData.scores) {
            Object.keys(this.trustData.scores).forEach(key => {
                this.trustData.scores[key] += (Math.random() - 0.5) * variance;
                this.trustData.scores[key] = Math.max(0, Math.min(1, this.trustData.scores[key]));
            });
        }
        
        this.updateCharts(this.trustData);
    }

    // Utility Methods
    animateCounter(selector, target, duration) {
        const element = document.querySelector(selector);
        if (!element) return;

        const start = parseInt(element.textContent) || 0;
        const increment = (target - start) / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.round(current);
            
            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, 16);
    }

    triggerSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    showErrorState(error) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = `Error: ${error.message || 'Something went wrong'}`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }

    showDimensionTooltip(index, event) {
        const dimensions = ['Source', 'Temporal', 'Channel', 'Outcome', 'Network', 'Justice'];
        const descriptions = [
            'Identity verification and credentials',
            'Time-based behavioral consistency',
            'Communication channel trust levels',
            'Track record of positive outcomes',
            'Quality of network connections',
            'Alignment with justice principles'
        ];

        // Create and show tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'dimension-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-title">${dimensions[index]}</div>
            <div class="tooltip-description">${descriptions[index]}</div>
        `;
        
        tooltip.style.left = event.clientX + 'px';
        tooltip.style.top = event.clientY + 'px';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 3000);
    }
}

// Enhanced CSS for new features
const enhancedStyles = `
    <style>
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 26, 46, 0.95);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        #advanced-loading.show .loading-overlay {
            opacity: 1;
        }
        
        .loading-content {
            text-align: center;
            color: white;
        }
        
        .trust-ring-loader {
            width: 80px;
            height: 80px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #00ff88;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 2rem;
        }
        
        .loading-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .loading-subtitle {
            color: #8892b0;
        }
        
        .persona-card-enhanced.selected {
            border: 2px solid #00ff88;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
        }
        
        .dimension-card {
            padding: 1.5rem;
            text-align: center;
            opacity: 0;
            transform: translateY(20px);
            animation: slideInUp 0.6s ease forwards;
        }
        
        @keyframes slideInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .dimension-icon {
            width: 50px;
            height: 50px;
            margin: 0 auto 1rem;
            background: linear-gradient(45deg, #0088ff, #00ff88);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .dimension-name {
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .dimension-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #00ff88;
            margin-bottom: 1rem;
        }
        
        .dimension-bar {
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
        }
        
        .dimension-fill {
            height: 100%;
            background: linear-gradient(90deg, #0088ff, #00ff88);
            border-radius: 2px;
            transition: width 1s ease;
        }
        
        .success-notification, .error-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        }
        
        .success-notification {
            background: linear-gradient(45deg, #00ff88, #0088ff);
        }
        
        .error-notification {
            background: linear-gradient(45deg, #EF4444, #F59E0B);
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .dimension-tooltip {
            position: fixed;
            background: rgba(26, 26, 46, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 1rem;
            color: white;
            max-width: 250px;
            z-index: 10000;
            pointer-events: none;
        }
        
        .tooltip-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #00ff88;
        }
        
        .tooltip-description {
            font-size: 0.875rem;
            color: #8892b0;
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
`;

// Initialize enhanced features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add enhanced styles
    document.head.insertAdjacentHTML('beforeend', enhancedStyles);
    
    // Initialize enhanced ChittyTrust
    window.chittyTrustEnhanced = new ChittyTrustEnhanced();
});