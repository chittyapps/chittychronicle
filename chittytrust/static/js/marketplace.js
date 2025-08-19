/**
 * ChittyID Verification Marketplace JavaScript
 * Handles marketplace interactions, trust history visualization, and user authentication
 */

class ChittyMarketplace {
    constructor() {
        this.currentUser = null;
        this.trustHistoryChart = null;
        this.marketplaceRequests = [];
        this.filters = {
            type: '',
            priority: '',
            minReward: 0
        };
        
        this.init();
    }
    
    init() {
        this.initializeFeatherIcons();
        this.initializeDynamicSparks();
        this.loadMarketplaceData();
        this.setupEventListeners();
        
        // Auto sign-in for demo (replace with actual Clerk integration)
        setTimeout(() => {
            this.simulateSignIn();
        }, 1000);
    }
    
    initializeFeatherIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    initializeDynamicSparks() {
        if (window.dynamicSparkSystem) {
            window.dynamicSparkSystem.initializeSparkElements();
        }
    }
    
    setupEventListeners() {
        // Filter form listeners
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-priority')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-min-reward')?.addEventListener('input', () => this.applyFilters());
        
        // Create request form
        document.getElementById('create-request-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createVerificationRequest();
        });
    }
    
    async simulateSignIn() {
        // Simulate Clerk authentication - replace with actual Clerk integration
        this.currentUser = {
            id: 'alice_demo_123',
            email: 'alice@example.com',
            first_name: 'Alice',
            last_name: 'Community',
            verification_level: 'L3',
            trust_score: 78.5,
            chitty_id: 'ALCE001'
        };
        
        this.updateAuthUI();
        await this.loadUserDashboard();
        await this.loadUserTrustHistory();
    }
    
    updateAuthUI() {
        const authSection = document.getElementById('auth-section');
        
        if (this.currentUser) {
            authSection.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-chitty-green dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        <i data-feather="user" class="me-2"></i>${this.currentUser.first_name}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li><a class="dropdown-item" href="#" onclick="marketplace.loadUserProfile()">Profile</a></li>
                        <li><a class="dropdown-item" href="#" onclick="marketplace.signOut()">Sign Out</a></li>
                    </ul>
                </div>
            `;
        } else {
            authSection.innerHTML = `
                <button class="btn btn-outline-chitty-green" onclick="marketplace.simulateSignIn()">
                    <i data-feather="log-in" class="me-2"></i>Sign In
                </button>
            `;
        }
        
        this.initializeFeatherIcons();
    }
    
    async loadUserDashboard() {
        if (!this.currentUser) return;
        
        const dashboard = document.getElementById('user-dashboard');
        dashboard.style.display = 'flex';
        
        // Update dashboard metrics
        document.getElementById('user-trust-score').textContent = this.currentUser.trust_score.toFixed(1);
        document.getElementById('user-verification-level').textContent = this.currentUser.verification_level;
        
        try {
            // Load real user data from API (when authentication is implemented)
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token || 'demo-token'}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                document.getElementById('user-active-requests').textContent = userData.active_requests || '3';
                document.getElementById('user-trust-trend').textContent = this.formatTrendValue(userData.trust_trends?.change || 2.3);
            } else {
                // Use demo data
                document.getElementById('user-active-requests').textContent = '3';
                document.getElementById('user-trust-trend').textContent = '+2.3%';
            }
        } catch (error) {
            console.log('Using demo data for user dashboard');
            document.getElementById('user-active-requests').textContent = '3';
            document.getElementById('user-trust-trend').textContent = '+2.3%';
        }
    }
    
    async loadUserTrustHistory() {
        if (!this.currentUser) return;
        
        const historySection = document.getElementById('trust-history-section');
        historySection.style.display = 'block';
        
        try {
            const response = await fetch('/api/user/trust-history?days=30', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token || 'demo-token'}`
                }
            });
            
            let historyData;
            if (response.ok) {
                historyData = await response.json();
            } else {
                // Generate demo trust history data
                historyData = this.generateDemoTrustHistory();
            }
            
            this.createTrustHistoryChart(historyData.history);
            
        } catch (error) {
            console.log('Using demo data for trust history');
            const demoData = this.generateDemoTrustHistory();
            this.createTrustHistoryChart(demoData.history);
        }
    }
    
    generateDemoTrustHistory() {
        const history = [];
        const baseScore = this.currentUser.trust_score || 75.0;
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const variation = (Math.random() - 0.5) * 10; // ±5 points
            const compositeScore = Math.max(0, Math.min(100, baseScore + variation));
            
            history.push({
                recorded_at: date.toISOString(),
                dimensions: {
                    source: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 20)),
                    temporal: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 16)),
                    channel: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 24)),
                    outcome: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 14)),
                    network: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 30)),
                    justice: Math.max(0, Math.min(100, compositeScore + (Math.random() - 0.5) * 10))
                },
                scores: {
                    composite: compositeScore,
                    people: compositeScore * 0.95 + Math.random() * 10,
                    legal: compositeScore * 1.05 - Math.random() * 10,
                    state: compositeScore * 1.1 - Math.random() * 15,
                    chitty: compositeScore * 0.9 + Math.random() * 15
                }
            });
        }
        
        return { history };
    }
    
    createTrustHistoryChart(historyData) {
        const ctx = document.getElementById('trustHistoryChart');
        if (!ctx) return;
        
        if (this.trustHistoryChart) {
            this.trustHistoryChart.destroy();
        }
        
        const dates = historyData.map(entry => new Date(entry.recorded_at).toLocaleDateString());
        const compositeScores = historyData.map(entry => entry.scores.composite);
        
        this.trustHistoryChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Composite Trust Score',
                        data: compositeScores,
                        backgroundColor: 'rgba(0, 136, 255, 0.1)',
                        borderColor: '#0088ff',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Chitty Score™',
                        data: historyData.map(entry => entry.scores.chitty),
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        borderColor: '#00ff88',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#fff',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#0088ff',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 40,
                        max: 100,
                        ticks: {
                            color: '#666',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#666',
                            maxTicksLimit: 10,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    async loadMarketplaceData() {
        try {
            const response = await fetch('/api/marketplace/requests');
            if (response.ok) {
                this.marketplaceRequests = await response.json();
            } else {
                // Use demo data if API fails
                this.marketplaceRequests = this.getDemoMarketplaceData();
            }
        } catch (error) {
            console.log('Using demo marketplace data');
            this.marketplaceRequests = this.getDemoMarketplaceData();
        }
        
        this.displayMarketplaceRequests(this.marketplaceRequests);
        this.updateRequestCount(this.marketplaceRequests.length);
    }
    
    getDemoMarketplaceData() {
        return [
            {
                id: 1,
                title: 'Verify Software Engineering Experience',
                description: 'Need verification of 5+ years Python development experience with Django framework. Have references from previous employers and project portfolio.',
                verification_type: 'experience',
                reward_amount: 75.00,
                priority: 'high',
                created_at: new Date().toISOString(),
                user: {
                    name: 'Alice Community',
                    trust_level: 'L3'
                }
            },
            {
                id: 2,
                title: 'Identity Document Verification',
                description: 'Verify government-issued ID and proof of address for KYC compliance. Documents ready for review.',
                verification_type: 'identity',
                reward_amount: 25.00,
                priority: 'urgent',
                created_at: new Date().toISOString(),
                user: {
                    name: 'Bob Business',
                    trust_level: 'L2'
                }
            },
            {
                id: 3,
                title: 'Academic Credential Verification',
                description: 'Verify Master\'s degree in Computer Science from Stanford University. Digital copies of transcripts available.',
                verification_type: 'document',
                reward_amount: 50.00,
                priority: 'normal',
                created_at: new Date().toISOString(),
                user: {
                    name: 'Charlie Changed',
                    trust_level: 'L1'
                }
            },
            {
                id: 4,
                title: 'Machine Learning Expertise Assessment',
                description: 'Verify proficiency in ML algorithms, TensorFlow, and PyTorch. Can provide code samples and project demonstrations.',
                verification_type: 'skill',
                reward_amount: 100.00,
                priority: 'normal',
                created_at: new Date().toISOString(),
                user: {
                    name: 'Alice Community',
                    trust_level: 'L3'
                }
            },
            {
                id: 5,
                title: 'Leadership Experience Validation',
                description: 'Verify 10+ years of team leadership and project management experience in tech industry.',
                verification_type: 'experience',
                reward_amount: 80.00,
                priority: 'low',
                created_at: new Date().toISOString(),
                user: {
                    name: 'Diana Developer',
                    trust_level: 'L4'
                }
            }
        ];
    }
    
    displayMarketplaceRequests(requests) {
        const grid = document.getElementById('requests-grid');
        if (!grid) return;
        
        grid.innerHTML = requests.map(req => this.createRequestCard(req)).join('');
        this.initializeFeatherIcons();
        this.initializeDynamicSparks();
    }
    
    createRequestCard(req) {
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="marketplace-card card h-100 priority-${req.priority}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="verification-type-badge">${req.verification_type}</span>
                            <div class="trust-level-indicator trust-level-${req.user.trust_level}">
                                <div class="shield-spark spark-over trust-level-${req.user.trust_level}">
                                    <i data-feather="shield" class="shield"></i>
                                    <div class="spark">⚡</div>
                                </div>
                                ${req.user.trust_level}
                            </div>
                        </div>
                        
                        <h5 class="card-title text-white mb-2">${req.title}</h5>
                        <p class="card-text text-muted small mb-3">${this.truncateText(req.description, 120)}</p>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="reward-amount">$${req.reward_amount.toFixed(2)}</div>
                            <small class="text-muted">
                                <i data-feather="user" width="14" height="14" class="me-1"></i>
                                ${req.user.name}
                            </small>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i data-feather="clock" width="14" height="14" class="me-1"></i>
                                ${new Date(req.created_at).toLocaleDateString()}
                            </small>
                            <button class="btn btn-sm btn-chitty-green" onclick="marketplace.claimRequest(${req.id})">
                                <i data-feather="check-circle" width="14" height="14" class="me-1"></i>
                                Claim
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    applyFilters() {
        this.filters.type = document.getElementById('filter-type')?.value || '';
        this.filters.priority = document.getElementById('filter-priority')?.value || '';
        this.filters.minReward = parseFloat(document.getElementById('filter-min-reward')?.value || 0);
        
        const filteredRequests = this.marketplaceRequests.filter(req => {
            if (this.filters.type && req.verification_type !== this.filters.type) return false;
            if (this.filters.priority && req.priority !== this.filters.priority) return false;
            if (this.filters.minReward && req.reward_amount < this.filters.minReward) return false;
            return true;
        });
        
        this.displayMarketplaceRequests(filteredRequests);
        this.updateRequestCount(filteredRequests.length);
    }
    
    updateRequestCount(count) {
        const countElement = document.getElementById('total-requests');
        if (countElement) {
            countElement.textContent = count;
        }
    }
    
    showCreateModal() {
        if (!this.currentUser) {
            alert('Please sign in to create verification requests.');
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('createRequestModal'));
        modal.show();
    }
    
    async createVerificationRequest() {
        if (!this.currentUser) return;
        
        const form = document.getElementById('create-request-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validate required fields
        if (!data.verification_type || !data.title || !data.description || !data.reward_amount) {
            alert('Please fill in all required fields.');
            return;
        }
        
        try {
            const response = await fetch('/api/marketplace/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentUser.token || 'demo-token'}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                alert('Verification request created successfully!');
                
                // Close modal and refresh data
                bootstrap.Modal.getInstance(document.getElementById('createRequestModal')).hide();
                form.reset();
                await this.loadMarketplaceData();
            } else {
                const error = await response.json();
                alert('Error creating request: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Request creation failed. Please try again.');
        }
    }
    
    async claimRequest(requestId) {
        if (!this.currentUser) {
            alert('Please sign in to claim verification requests.');
            return;
        }
        
        try {
            const response = await fetch(`/api/marketplace/requests/${requestId}/claim`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token || 'demo-token'}`
                }
            });
            
            if (response.ok) {
                alert('Request claimed successfully! Check your dashboard for details.');
                await this.loadMarketplaceData();
            } else {
                const error = await response.json();
                alert('Error claiming request: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error claiming request:', error);
            alert('Failed to claim request. Please try again.');
        }
    }
    
    signOut() {
        this.currentUser = null;
        this.updateAuthUI();
        document.getElementById('user-dashboard').style.display = 'none';
        document.getElementById('trust-history-section').style.display = 'none';
    }
    
    loadUserProfile() {
        if (!this.currentUser) return;
        
        // For now, just show an alert. In a real app, this would open a profile modal/page
        alert(`User Profile:\n\nName: ${this.currentUser.first_name} ${this.currentUser.last_name}\nEmail: ${this.currentUser.email}\nChitty ID: ${this.currentUser.chitty_id}\nTrust Level: ${this.currentUser.verification_level}\nTrust Score: ${this.currentUser.trust_score}`);
    }
    
    // Utility functions
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    formatTrendValue(value) {
        if (typeof value !== 'number') return '+2.3%';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    }
}

// Initialize marketplace when DOM is loaded
let marketplace;
document.addEventListener('DOMContentLoaded', function() {
    marketplace = new ChittyMarketplace();
});

// Global functions for onclick handlers
function showCreateModal() {
    marketplace?.showCreateModal();
}

function createRequest() {
    marketplace?.createVerificationRequest();
}

function applyFilters() {
    marketplace?.applyFilters();
}