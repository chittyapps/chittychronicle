/**
 * ChittyTrust Frontend
 * Handles persona selection, trust calculations, and visualizations
 */

class TrustEngine {
    constructor() {
        this.currentPersona = null;
        this.radarChart = null;
        this.personas = [];
    }

    static init() {
        const engine = new TrustEngine();
        engine.loadPersonas();
        return engine;
    }

    async loadPersonas() {
        try {
            const response = await fetch('/api/personas');
            this.personas = await response.json();
            this.renderPersonaSelector();
        } catch (error) {
            console.error('Failed to load personas:', error);
        }
    }

    renderPersonaSelector() {
        const selector = document.getElementById('persona-selector');
        if (!selector) return;

        selector.innerHTML = this.personas.map(persona => {
            // Determine initial trust level visual based on persona
            let trustLevel = 'L2';
            let sparkType = 'spark-over';
            
            if (persona.id === 'alice') {
                trustLevel = 'L4';
                sparkType = 'spark-emanating';
            } else if (persona.id === 'bob') {
                trustLevel = 'L2';
                sparkType = 'spark-inside';
            } else if (persona.id === 'charlie') {
                trustLevel = 'L3';
                sparkType = 'spark-over';
            }
            
            return `
                <div class="persona-card" data-persona-id="${persona.id}" onclick="trustEngine.selectPersona('${persona.id}')">
                    <div class="persona-header">
                        <div class="persona-avatar">${persona.avatar}</div>
                        <div class="shield-spark ${sparkType} trust-level-${trustLevel} verification-pending">
                            <i data-feather="shield" style="font-size: 0.8em;"></i>
                            <span class="spark"></span>
                        </div>
                    </div>
                    <div class="persona-name">${persona.name}</div>
                    <div class="persona-description">${persona.description}</div>
                    <div class="persona-type">${persona.type}</div>
                </div>
            `;
        }).join('');
        
        // Initialize feather icons for persona cards
        feather.replace();
        
        // Initialize dynamic sparks for persona cards
        setTimeout(() => {
            if (window.dynamicSparkSystem) {
                window.dynamicSparkSystem.initializeSparkElements();
            }
        }, 100);
    }

    async selectPersona(personaId) {
        // Update UI
        document.querySelectorAll('.persona-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-persona-id="${personaId}"]`).classList.add('active');

        // Show loading states
        this.showLoadingStates();
        
        // Show analysis section
        document.getElementById('trust-analysis').style.display = 'block';
        document.getElementById('dimension-explanations').style.display = 'block';

        try {
            // Load both basic trust data and advanced insights
            const [trustData, insightsData] = await Promise.all([
                fetch(`/api/trust/${personaId}`).then(r => r.json()),
                fetch(`/api/trust/${personaId}/insights`).then(r => r.json())
            ]);
            
            this.currentPersona = personaId;
            this.updateTrustDisplay(trustData);
            this.updateAdvancedAnalytics(insightsData);
            
        } catch (error) {
            console.error('Failed to load trust data:', error);
            this.showError('Failed to calculate trust score');
        }
    }

    async loadTrustInsights(personaId) {
        try {
            const response = await fetch(`/api/trust/${personaId}/insights`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('Insights loading error:', error);
            throw error;
        }
    }

    async loadTimeline(personaId) {
        try {
            const response = await fetch(`/api/trust/${personaId}/timeline`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data;
        } catch (error) {
            console.error('Timeline loading error:', error);
            throw error;
        }
    }

    showLoadingStates() {
        // Add loading animation to scores
        const scoreElements = [
            'composite-score', 'people-score', 'legal-score', 
            'state-score', 'chitty-score'
        ];
        
        scoreElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '--';
                element.classList.add('loading-pulse');
            }
        });

        // Clear ChittyID level
        const levelElement = document.getElementById('chitty-level');
        if (levelElement) {
            levelElement.innerHTML = '<span class="badge bg-secondary">Calculating...</span>';
        }
    }

    updateTrustDisplay(trustData) {
        // Remove loading states
        document.querySelectorAll('.loading-pulse').forEach(el => {
            el.classList.remove('loading-pulse');
        });

        // Update composite score
        this.animateScore('composite-score', trustData.scores.composite, '%');
        
        // Update output scores
        this.animateScore('people-score', trustData.scores.people);
        this.animateScore('legal-score', trustData.scores.legal);
        this.animateScore('state-score', trustData.scores.state);
        this.animateScore('chitty-score', trustData.scores.chitty);

        // Update ChittyID level
        this.updateChittyLevel(trustData.persona.chitty_level);

        // Update radar chart
        this.updateRadarChart(trustData.dimensions);

        // Update explanations
        this.updateExplanations(trustData.metadata.explanation);
        
        // Update shield-spark elements based on scores
        this.updateTrustScoreSparks(trustData);
        
        // Reinitialize dynamic sparks after content update
        if (window.dynamicSparkSystem) {
            window.dynamicSparkSystem.initializeSparkElements();
        }
    }

    animateScore(elementId, finalValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const roundedValue = Math.round(finalValue);
        let currentValue = 0;
        const increment = roundedValue / 30; // Animation duration
        
        element.classList.add('score-animate');
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= roundedValue) {
                currentValue = roundedValue;
                clearInterval(timer);
            }
            element.textContent = Math.round(currentValue) + suffix;
        }, 16); // ~60fps
    }

    updateChittyLevel(levelData) {
        const levelElement = document.getElementById('chitty-level');
        if (!levelElement || !levelData) return;

        // Update trust level class for spark animation
        const sparkElement = levelElement.querySelector('.shield-spark');
        if (sparkElement) {
            sparkElement.className = `shield-spark spark-over trust-level-${levelData.level}`;
        }

        levelElement.innerHTML = `
            <div class="shield-spark spark-over trust-level-${levelData.level}">
                <i data-feather="shield" style="color: ${levelData.color};"></i>
                <span class="spark"></span>
            </div>
            <span class="chitty-level-badge" style="background-color: ${levelData.color}20; color: ${levelData.color}; border: 1px solid ${levelData.color};">
                ${levelData.level} - ${levelData.name}
            </span>
        `;
        
        // Re-initialize feather icons
        feather.replace();
    }

    updateTrustScoreSparks(trustData) {
        // Update spark animations based on trust scores
        this.updateScoreSpark('people-score', trustData.scores.people, 'L3');
        this.updateScoreSpark('legal-score', trustData.scores.legal, 'L2');
        this.updateScoreSpark('state-score', trustData.scores.state, 'L2');
        this.updateScoreSpark('chitty-score', trustData.scores.chitty, 'L4');
        
        // Update radar chart spark
        this.updateRadarSpark(trustData.scores.composite);
    }

    updateScoreSpark(scoreId, score, defaultLevel) {
        const scoreCard = document.getElementById(scoreId)?.closest('.trust-score-card');
        if (!scoreCard) return;
        
        const sparkElement = scoreCard.querySelector('.shield-spark');
        if (sparkElement) {
            // Determine trust level based on score
            let level = 'L0';
            if (score >= 90) level = 'L4';
            else if (score >= 75) level = 'L3';
            else if (score >= 50) level = 'L2';
            else if (score >= 25) level = 'L1';
            
            // Update classes
            sparkElement.className = sparkElement.className.replace(/trust-level-L\d/, `trust-level-${level}`);
            
            // Add verification state for high scores
            let state = 'normal';
            if (score >= 85) {
                sparkElement.classList.add('verification-active');
                state = 'verification-active';
            } else if (score >= 60) {
                sparkElement.classList.remove('verification-active');
                sparkElement.classList.remove('verification-pending');
            } else {
                sparkElement.classList.add('verification-pending');
                state = 'verification-pending';
            }
            
            // Update spark visual state using dynamic spark system
            const sparkInner = sparkElement.querySelector('.spark');
            if (sparkInner && window.dynamicSparkSystem) {
                window.dynamicSparkSystem.updateSparkState(sparkInner, state);
            }
        }
    }

    updateRadarSpark(compositeScore) {
        const radarSpark = document.querySelector('.radar-chart-spark');
        if (radarSpark) {
            let level = 'L0';
            if (compositeScore >= 90) level = 'L4';
            else if (compositeScore >= 75) level = 'L3';
            else if (compositeScore >= 50) level = 'L2';
            else if (compositeScore >= 25) level = 'L1';
            
            radarSpark.className = `radar-chart-spark shield-spark spark-emanating trust-level-${level}`;
            
            if (compositeScore >= 85) {
                radarSpark.classList.add('verification-active');
            }
        }
    }

    updateRadarChart(dimensions) {
        const ctx = document.getElementById('trustRadarChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.radarChart) {
            this.radarChart.destroy();
        }

        const data = {
            labels: [
                'Source (Who)',
                'Temporal (When)', 
                'Channel (How)',
                'Outcome (Results)',
                'Network (Connections)',
                'Justice (Impact)'
            ],
            datasets: [{
                label: 'Trust Score',
                data: [
                    dimensions.source,
                    dimensions.temporal,
                    dimensions.channel,
                    dimensions.outcome,
                    dimensions.network,
                    dimensions.justice
                ],
                backgroundColor: 'rgba(0, 136, 255, 0.2)',
                borderColor: '#0088ff',
                borderWidth: 2,
                pointBackgroundColor: '#00ff88',
                pointBorderColor: '#00ff88',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        };

        const config = {
            type: 'radar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: '#666',
                            backdrop: 'rgba(0, 0, 0, 0)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: '#fff',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.1
                    }
                }
            }
        };

        this.radarChart = new Chart(ctx, config);
    }

    updateExplanations(explanations) {
        const grid = document.getElementById('explanations-grid');
        if (!grid || !explanations) return;

        const dimensionIcons = {
            source: 'user-check',
            temporal: 'clock',
            channel: 'send',
            outcome: 'target',
            network: 'share-2',
            justice: 'scale'
        };

        grid.innerHTML = Object.entries(explanations).map(([dimension, explanation]) => `
            <div class="col-md-6 col-lg-4">
                <div class="explanation-card">
                    <div class="d-flex align-items-center mb-2">
                        <i data-feather="${dimensionIcons[dimension]}" class="me-2 text-chitty-blue"></i>
                        <div class="explanation-title">${dimension}</div>
                    </div>
                    <div class="explanation-text">${explanation}</div>
                </div>
            </div>
        `).join('');

        // Re-initialize feather icons
        feather.replace();
    }

    updateAdvancedAnalytics(insightsData) {
        // Update insights section
        this.displayTrustInsights(insightsData.insights);
        
        // Update behavioral patterns
        this.displayBehavioralPatterns(insightsData.patterns);
        
        // Create advanced visualizations
        this.createTrendChart(insightsData.visualizations.trend_chart);
        this.displayConfidenceIntervals(insightsData.confidence_intervals);
        
        // Show analytics summary
        this.displayAnalyticsSummary(insightsData.analytics_summary);
    }

    displayTrustInsights(insights) {
        // Find or create insights container
        let insightsContainer = document.getElementById('insights-container');
        if (!insightsContainer) {
            const analysisSection = document.getElementById('trust-analysis');
            if (analysisSection) {
                insightsContainer = document.createElement('div');
                insightsContainer.id = 'insights-container';
                insightsContainer.className = 'col-12 mt-4';
                analysisSection.appendChild(insightsContainer);
            }
        }

        if (!insightsContainer || !insights) return;

        const insightsHtml = insights.map(insight => {
            const impactClass = {
                'positive': 'border-success text-success',
                'negative': 'border-danger text-danger',
                'neutral': 'border-secondary text-secondary'
            }[insight.impact] || 'border-secondary text-secondary';

            const trendIcon = {
                'improving': '📈',
                'declining': '📉', 
                'stable': '➡️'
            }[insight.trend] || '';

            return `
                <div class="insight-card card bg-dark ${impactClass.split(' ')[0]} mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="text-white mb-0">${insight.title}</h6>
                            <div class="d-flex align-items-center">
                                ${trendIcon ? `<span class="me-2">${trendIcon}</span>` : ''}
                                <small class="text-muted">${Math.round(insight.confidence)}% confidence</small>
                            </div>
                        </div>
                        <p class="text-muted mb-2">${insight.description}</p>
                        <div class="supporting-evidence">
                            <small class="text-muted">
                                Evidence: ${insight.supporting_evidence.join(' • ')}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        insightsContainer.innerHTML = `
            <div class="card bg-dark border-chitty-blue">
                <div class="card-header bg-chitty-darker border-chitty-blue">
                    <h5 class="mb-0 text-chitty-green">
                        <i data-feather="zap" class="me-2"></i>
                        Trust Insights & Analysis
                    </h5>
                </div>
                <div class="card-body">
                    ${insightsHtml}
                </div>
            </div>
        `;

        feather.replace();
    }

    displayBehavioralPatterns(patterns) {
        if (!patterns || patterns.length === 0) return;

        // Find or create patterns container  
        let patternsContainer = document.getElementById('patterns-container');
        if (!patternsContainer) {
            const analysisSection = document.getElementById('trust-analysis');
            if (analysisSection) {
                patternsContainer = document.createElement('div');
                patternsContainer.id = 'patterns-container';
                patternsContainer.className = 'col-12 mt-4';
                analysisSection.appendChild(patternsContainer);
            }
        }

        if (!patternsContainer) return;

        const patternsHtml = patterns.map(pattern => {
            const riskClass = {
                'low': 'text-success',
                'medium': 'text-warning',
                'high': 'text-danger'
            }[pattern.risk_level] || 'text-secondary';

            const riskIcon = {
                'low': '✅',
                'medium': '⚠️',
                'high': '🚨'
            }[pattern.risk_level] || 'ℹ️';

            return `
                <div class="pattern-card card bg-dark border-chitty-blue mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="text-white mb-0">${pattern.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h6>
                            <span class="${riskClass}">${riskIcon} ${pattern.risk_level.charAt(0).toUpperCase() + pattern.risk_level.slice(1)} Risk</span>
                        </div>
                        <p class="text-muted mb-2">${pattern.description}</p>
                        <div class="pattern-stats mb-2">
                            <small class="text-muted">
                                Frequency: ${pattern.frequency} occurrences • 
                                Last seen: ${new Date(pattern.last_occurrence).toLocaleDateString()}
                            </small>
                        </div>
                        <div class="recommendation">
                            <small class="text-chitty-green">
                                💡 ${pattern.recommendation}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        patternsContainer.innerHTML = `
            <div class="card bg-dark border-chitty-blue">
                <div class="card-header bg-chitty-darker border-chitty-blue">
                    <h5 class="mb-0 text-chitty-green">
                        <i data-feather="activity" class="me-2"></i>
                        Behavioral Patterns
                    </h5>
                </div>
                <div class="card-body">
                    ${patternsHtml}
                </div>
            </div>
        `;

        feather.replace();
    }

    createTrendChart(chartConfig) {
        const trendContainer = document.getElementById('trend-chart-container');
        if (!trendContainer) {
            // Create trend chart container
            const analysisSection = document.getElementById('trust-analysis');
            if (analysisSection) {
                const container = document.createElement('div');
                container.id = 'trend-chart-container';
                container.className = 'col-lg-6 mt-4';
                container.innerHTML = `
                    <div class="card bg-dark border-chitty-blue h-100">
                        <div class="card-header bg-chitty-darker border-chitty-blue">
                            <h5 class="mb-0 text-chitty-green">
                                <i data-feather="trending-up" class="me-2"></i>
                                Trust Trends Over Time
                            </h5>
                        </div>
                        <div class="card-body">
                            <canvas id="trustTrendChart" style="height: 300px;"></canvas>
                        </div>
                    </div>
                `;
                analysisSection.appendChild(container);
                feather.replace();
            }
        }

        const ctx = document.getElementById('trustTrendChart');
        if (ctx && chartConfig) {
            new Chart(ctx, chartConfig);
        }
    }

    displayConfidenceIntervals(intervals) {
        if (!intervals) return;

        // Create confidence intervals display
        let confidenceContainer = document.getElementById('confidence-container');
        if (!confidenceContainer) {
            const analysisSection = document.getElementById('trust-analysis');
            if (analysisSection) {
                confidenceContainer = document.createElement('div');
                confidenceContainer.id = 'confidence-container';
                confidenceContainer.className = 'col-lg-6 mt-4';
                analysisSection.appendChild(confidenceContainer);
            }
        }

        if (!confidenceContainer) return;

        const confidenceHtml = Object.entries(intervals).map(([dimension, [lower, upper]]) => {
            const dimensionName = dimension.charAt(0).toUpperCase() + dimension.slice(1);
            const range = upper - lower;
            const certainty = 100 - (range / 100 * 100);
            
            return `
                <div class="confidence-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="text-white">${dimensionName}</span>
                        <span class="text-muted">${Math.round(certainty)}% certainty</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-range" style="
                            left: ${lower}%; 
                            width: ${range}%; 
                            background: linear-gradient(90deg, #00ff88, #0088ff);
                            height: 6px; 
                            border-radius: 3px;
                            position: relative;
                        "></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${Math.round(lower)}</small>
                        <small class="text-muted">${Math.round(upper)}</small>
                    </div>
                </div>
            `;
        }).join('');

        confidenceContainer.innerHTML = `
            <div class="card bg-dark border-chitty-blue h-100">
                <div class="card-header bg-chitty-darker border-chitty-blue">
                    <h5 class="mb-0 text-chitty-green">
                        <i data-feather="bar-chart" class="me-2"></i>
                        Confidence Intervals
                    </h5>
                </div>
                <div class="card-body">
                    ${confidenceHtml}
                </div>
            </div>
        `;

        feather.replace();
    }

    displayAnalyticsSummary(summary) {
        if (!summary) return;

        // Add analytics summary to the top of insights
        const insightsContainer = document.getElementById('insights-container');
        if (insightsContainer) {
            const summaryHtml = `
                <div class="analytics-summary card bg-chitty-darker border-chitty-green mb-4">
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-3">
                                <div class="h4 text-chitty-green mb-0">${summary.total_insights}</div>
                                <small class="text-muted">Insights</small>
                            </div>
                            <div class="col-3">
                                <div class="h4 text-chitty-blue mb-0">${summary.total_patterns}</div>
                                <small class="text-muted">Patterns</small>
                            </div>
                            <div class="col-3">
                                <div class="h4 text-white mb-0">${summary.event_count}</div>
                                <small class="text-muted">Events</small>
                            </div>
                            <div class="col-3">
                                <div class="h4 text-chitty-green mb-0">${summary.analysis_depth}</div>
                                <small class="text-muted">Analysis</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            insightsContainer.insertAdjacentHTML('afterbegin', summaryHtml);
        }
    }

    showError(message) {
        const analysisSection = document.getElementById('trust-analysis');
        if (analysisSection) {
            analysisSection.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger" role="alert">
                        <i data-feather="alert-circle" class="me-2"></i>
                        ${message}
                    </div>
                </div>
            `;
            feather.replace();
        }
    }
}

// Global instance
let trustEngine;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    trustEngine = TrustEngine.init();
});
