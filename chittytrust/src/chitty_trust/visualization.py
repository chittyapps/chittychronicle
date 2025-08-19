"""
Advanced visualization utilities for trust data.
"""

from typing import Dict, List, Any, Optional
import json
from datetime import datetime, timedelta

from .models import TrustEntity, TrustEvent
from .analytics import TrustInsight, TrustPattern


class TrustVisualizationEngine:
    """Generate visualization data for trust analytics."""
    
    def __init__(self):
        self.dimension_colors = {
            "source": "#3b82f6",      # Blue
            "temporal": "#8b5cf6",    # Purple  
            "channel": "#06b6d4",     # Cyan
            "outcome": "#10b981",     # Green
            "network": "#f59e0b",     # Amber
            "justice": "#00ff88"      # ChittyGreen
        }
        
        self.score_colors = {
            "peoples": "#ef4444",     # Red
            "legal": "#f59e0b",       # Amber
            "state": "#3b82f6",       # Blue
            "chitty": "#00ff88"       # ChittyGreen
        }
    
    def generate_radar_config(self, dimension_scores: Dict[str, float]) -> Dict[str, Any]:
        """Generate Chart.js radar chart configuration."""
        return {
            "type": "radar",
            "data": {
                "labels": [
                    "Source (Who)",
                    "Temporal (When)", 
                    "Channel (How)",
                    "Outcome (Results)",
                    "Network (Connections)",
                    "Justice (Impact)"
                ],
                "datasets": [{
                    "label": "Trust Dimensions",
                    "data": [
                        dimension_scores.get("source", 0),
                        dimension_scores.get("temporal", 0),
                        dimension_scores.get("channel", 0),
                        dimension_scores.get("outcome", 0),
                        dimension_scores.get("network", 0),
                        dimension_scores.get("justice", 0)
                    ],
                    "backgroundColor": "rgba(0, 255, 136, 0.2)",
                    "borderColor": "#00ff88",
                    "borderWidth": 2,
                    "pointBackgroundColor": "#00ff88",
                    "pointBorderColor": "#ffffff",
                    "pointBorderWidth": 2,
                    "pointRadius": 6
                }]
            },
            "options": {
                "responsive": True,
                "maintainAspectRatio": False,
                "plugins": {
                    "legend": {
                        "display": False
                    }
                },
                "scales": {
                    "r": {
                        "beginAtZero": True,
                        "max": 100,
                        "min": 0,
                        "ticks": {
                            "stepSize": 20,
                            "color": "#6b7280",
                            "backdropColor": "transparent"
                        },
                        "grid": {
                            "color": "#374151",
                            "lineWidth": 1
                        },
                        "angleLines": {
                            "color": "#374151",
                            "lineWidth": 1
                        },
                        "pointLabels": {
                            "color": "#9ca3af",
                            "font": {
                                "size": 12,
                                "weight": "bold"
                            }
                        }
                    }
                },
                "animation": {
                    "duration": 1500,
                    "easing": "easeInOutQuart"
                }
            }
        }
    
    def generate_trend_chart_config(self, events: List[TrustEvent]) -> Dict[str, Any]:
        """Generate timeline trend chart configuration."""
        if not events:
            return self._empty_chart_config()
        
        # Group events by month for trend analysis
        monthly_data = {}
        for event in events:
            month_key = event.timestamp.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"positive": 0, "negative": 0, "neutral": 0}
            monthly_data[month_key][event.outcome] += 1
        
        # Sort by date and calculate success rates
        sorted_months = sorted(monthly_data.keys())
        labels = [datetime.strptime(m, "%Y-%m").strftime("%b %Y") for m in sorted_months]
        success_rates = []
        
        for month in sorted_months:
            data = monthly_data[month]
            total = data["positive"] + data["negative"] + data["neutral"]
            if total > 0:
                success_rate = (data["positive"] / total) * 100
            else:
                success_rate = 0
            success_rates.append(success_rate)
        
        return {
            "type": "line",
            "data": {
                "labels": labels,
                "datasets": [{
                    "label": "Success Rate",
                    "data": success_rates,
                    "borderColor": "#00ff88",
                    "backgroundColor": "rgba(0, 255, 136, 0.1)",
                    "borderWidth": 3,
                    "fill": True,
                    "tension": 0.4,
                    "pointBackgroundColor": "#00ff88",
                    "pointBorderColor": "#ffffff",
                    "pointBorderWidth": 2,
                    "pointRadius": 5
                }]
            },
            "options": {
                "responsive": True,
                "maintainAspectRatio": False,
                "plugins": {
                    "legend": {
                        "display": False
                    }
                },
                "scales": {
                    "y": {
                        "beginAtZero": True,
                        "max": 100,
                        "ticks": {
                            "color": "#6b7280",
                            "callback": "function(value) { return value + '%'; }"
                        },
                        "grid": {
                            "color": "#374151"
                        }
                    },
                    "x": {
                        "ticks": {
                            "color": "#6b7280"
                        },
                        "grid": {
                            "color": "#374151"
                        }
                    }
                },
                "animation": {
                    "duration": 1200,
                    "easing": "easeInOutCubic"
                }
            }
        }
    
    def generate_network_visualization(self, entity: TrustEntity) -> Dict[str, Any]:
        """Generate network visualization data."""
        connections = entity.connections or []
        
        if not connections:
            return {"nodes": [], "edges": []}
        
        # Create nodes
        nodes = [{
            "id": entity.id,
            "label": entity.name,
            "type": "entity",
            "trust_score": 100,  # Self
            "size": 30,
            "color": "#00ff88"
        }]
        
        # Add connection nodes
        for i, conn in enumerate(connections):
            color = self._get_trust_color(conn.trust_score)
            size = 10 + (conn.trust_score / 100) * 15
            
            nodes.append({
                "id": conn.entity_id,
                "label": conn.entity_id.replace("_", " ").title(),
                "type": "connection",
                "trust_score": conn.trust_score,
                "connection_type": conn.connection_type,
                "size": size,
                "color": color
            })
        
        # Create edges
        edges = []
        for conn in connections:
            edge_width = 1 + (conn.trust_score / 100) * 4
            
            edges.append({
                "from": entity.id,
                "to": conn.entity_id,
                "width": edge_width,
                "color": self._get_trust_color(conn.trust_score),
                "trust_score": conn.trust_score,
                "connection_type": conn.connection_type
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_connections": len(connections),
                "avg_trust": sum(c.trust_score for c in connections) / len(connections),
                "high_trust_count": len([c for c in connections if c.trust_score > 80])
            }
        }
    
    def generate_insights_html(self, insights: List[TrustInsight]) -> str:
        """Generate HTML for trust insights display."""
        if not insights:
            return "<p class='text-muted'>No insights available.</p>"
        
        html_parts = []
        
        # Group insights by category
        categories = {}
        for insight in insights:
            if insight.category not in categories:
                categories[insight.category] = []
            categories[insight.category].append(insight)
        
        for category, category_insights in categories.items():
            html_parts.append(f'<div class="insight-category mb-4">')
            html_parts.append(f'<h6 class="text-chitty-green text-uppercase mb-3">{category.title()}</h6>')
            
            for insight in category_insights:
                impact_class = {
                    "positive": "border-success",
                    "negative": "border-danger", 
                    "neutral": "border-secondary"
                }.get(insight.impact, "border-secondary")
                
                trend_icon = ""
                if insight.trend:
                    trend_icons = {
                        "improving": "📈",
                        "declining": "📉",
                        "stable": "➡️"
                    }
                    trend_icon = f'<span class="trend-indicator">{trend_icons.get(insight.trend, "")}</span>'
                
                html_parts.append(f'''
                <div class="insight-card card bg-dark {impact_class} mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="text-white mb-0">{insight.title}</h6>
                            <div class="d-flex align-items-center">
                                {trend_icon}
                                <small class="text-muted ms-2">{insight.confidence:.0f}% confidence</small>
                            </div>
                        </div>
                        <p class="text-muted mb-2">{insight.description}</p>
                        <div class="supporting-evidence">
                            <small class="text-muted">
                                Evidence: {" • ".join(insight.supporting_evidence)}
                            </small>
                        </div>
                    </div>
                </div>
                ''')
            
            html_parts.append('</div>')
        
        return ''.join(html_parts)
    
    def generate_patterns_html(self, patterns: List[TrustPattern]) -> str:
        """Generate HTML for behavioral patterns display."""
        if not patterns:
            return "<p class='text-muted'>No patterns detected.</p>"
        
        html_parts = []
        
        for pattern in patterns:
            risk_class = {
                "low": "text-success",
                "medium": "text-warning",
                "high": "text-danger"
            }.get(pattern.risk_level, "text-secondary")
            
            risk_icon = {
                "low": "✅",
                "medium": "⚠️", 
                "high": "🚨"
            }.get(pattern.risk_level, "ℹ️")
            
            html_parts.append(f'''
            <div class="pattern-card card bg-dark border-chitty-blue mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="text-white mb-0">{pattern.pattern_type.replace("_", " ").title()}</h6>
                        <span class="{risk_class}">{risk_icon} {pattern.risk_level.title()} Risk</span>
                    </div>
                    <p class="text-muted mb-2">{pattern.description}</p>
                    <div class="pattern-stats mb-2">
                        <small class="text-muted">
                            Frequency: {pattern.frequency} occurrences • 
                            Last seen: {pattern.last_occurrence.strftime("%b %d, %Y")}
                        </small>
                    </div>
                    <div class="recommendation">
                        <small class="text-chitty-green">
                            💡 {pattern.recommendation}
                        </small>
                    </div>
                </div>
            </div>
            ''')
        
        return ''.join(html_parts)
    
    def _get_trust_color(self, trust_score: float) -> str:
        """Get color based on trust score."""
        if trust_score >= 80:
            return "#10b981"  # Green
        elif trust_score >= 60:
            return "#f59e0b"  # Amber
        elif trust_score >= 40:
            return "#ef4444"  # Red
        else:
            return "#6b7280"  # Gray
    
    def _empty_chart_config(self) -> Dict[str, Any]:
        """Return empty chart configuration."""
        return {
            "type": "line",
            "data": {
                "labels": [],
                "datasets": []
            },
            "options": {
                "responsive": True,
                "plugins": {
                    "legend": {
                        "display": False
                    }
                }
            }
        }