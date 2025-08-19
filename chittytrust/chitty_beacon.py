"""
ChittyBeacon - Python Implementation
Dead simple app tracking for ChittyOS ecosystem
"""

import os
import json
import time
import platform
import socket
import subprocess
import threading
import atexit
import signal
import sys
from datetime import datetime
from typing import Dict, Optional, Any
import requests
import logging

class ChittyBeacon:
    def __init__(self):
        self.config = {
            'endpoint': os.getenv('BEACON_ENDPOINT', 'https://beacon.chitty.cc'),
            'interval': int(os.getenv('BEACON_INTERVAL', '300000')) / 1000,  # Convert to seconds
            'enabled': os.getenv('BEACON_DISABLED', 'true').lower() != 'true',  # Disabled by default until domain is set up
            'verbose': os.getenv('BEACON_VERBOSE', 'true').lower() == 'true'
        }
        
        self.app_info = None
        self.heartbeat_timer = None
        self.start_time = time.time()
        
        if self.config['enabled']:
            self._initialize()
    
    def _log(self, message: str):
        """Log message if verbose mode is enabled"""
        if self.config['verbose']:
            print(f"[ChittyBeacon] {message}")
    
    def _detect_app(self) -> Dict[str, Any]:
        """Auto-detect application information"""
        app = {
            # Identity
            'id': self._generate_app_id(),
            'name': self._detect_app_name(),
            'version': self._detect_version(),
            
            # Platform
            'platform': self._detect_platform(),
            'environment': os.getenv('FLASK_ENV', os.getenv('PYTHON_ENV', 'production')),
            
            # System
            'hostname': socket.gethostname(),
            'python_version': sys.version.split()[0],
            'os': f"{platform.system()} {platform.release()}",
            
            # Features
            'has_claude_code': self._detect_claude_code(),
            'has_git': os.path.exists('.git'),
            'has_chittyos': True,  # Always true for ChittyOS apps
            
            # ChittyOS specific
            'chittyos_components': self._detect_chittyos_components(),
            
            # Metadata
            'started_at': datetime.utcnow().isoformat(),
            'pid': os.getpid(),
            'framework': 'flask'
        }
        
        # Add git info if available
        if app['has_git']:
            try:
                app['git'] = {
                    'branch': subprocess.check_output(['git', 'branch', '--show-current'], 
                                                    encoding='utf-8').strip(),
                    'commit': subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], 
                                                    encoding='utf-8').strip(),
                    'remote': subprocess.check_output(['git', 'remote', 'get-url', 'origin'], 
                                                    encoding='utf-8').strip()
                }
            except (subprocess.CalledProcessError, FileNotFoundError):
                pass
        
        # Platform-specific info
        if os.getenv('REPL_ID'):
            app['replit'] = {
                'id': os.getenv('REPL_ID'),
                'slug': os.getenv('REPL_SLUG'),
                'owner': os.getenv('REPL_OWNER'),
                'url': f"https://{os.getenv('REPL_SLUG')}.{os.getenv('REPL_OWNER')}.repl.co"
            }
        
        if os.getenv('GITHUB_REPOSITORY'):
            app['github'] = {
                'repository': os.getenv('GITHUB_REPOSITORY'),
                'workflow': os.getenv('GITHUB_WORKFLOW'),
                'run_id': os.getenv('GITHUB_RUN_ID'),
                'actor': os.getenv('GITHUB_ACTOR')
            }
        
        if os.getenv('VERCEL'):
            app['vercel'] = {
                'url': os.getenv('VERCEL_URL'),
                'env': os.getenv('VERCEL_ENV'),
                'region': os.getenv('VERCEL_REGION')
            }
        
        return app
    
    def _generate_app_id(self) -> str:
        """Generate unique app identifier"""
        if os.getenv('REPL_ID'):
            return f"replit-{os.getenv('REPL_ID')}"
        if os.getenv('GITHUB_REPOSITORY'):
            return f"github-{os.getenv('GITHUB_REPOSITORY').replace('/', '-')}"
        if os.getenv('VERCEL_URL'):
            return f"vercel-{os.getenv('VERCEL_URL')}"
        if os.getenv('HEROKU_APP_NAME'):
            return f"heroku-{os.getenv('HEROKU_APP_NAME')}"
        
        # Try to get from project files
        try:
            if os.path.exists('pyproject.toml'):
                with open('pyproject.toml', 'r') as f:
                    content = f.read()
                    if 'name = ' in content:
                        name = content.split('name = "')[1].split('"')[0]
                        return f"python-{name}"
        except:
            pass
        
        return f"host-{socket.gethostname()}"
    
    def _detect_app_name(self) -> str:
        """Detect application name"""
        name = (os.getenv('REPL_SLUG') or 
                os.getenv('GITHUB_REPOSITORY') or 
                os.getenv('VERCEL_URL') or 
                os.getenv('HEROKU_APP_NAME'))
        
        if name:
            return name
        
        # Try to get from project files
        try:
            if os.path.exists('pyproject.toml'):
                with open('pyproject.toml', 'r') as f:
                    content = f.read()
                    if 'name = ' in content:
                        return content.split('name = "')[1].split('"')[0]
        except:
            pass
        
        return 'chittyos-app'
    
    def _detect_version(self) -> str:
        """Detect application version"""
        try:
            if os.path.exists('pyproject.toml'):
                with open('pyproject.toml', 'r') as f:
                    content = f.read()
                    if 'version = ' in content:
                        return content.split('version = "')[1].split('"')[0]
        except:
            pass
        
        return '1.0.0'
    
    def _detect_platform(self) -> str:
        """Detect deployment platform"""
        if os.getenv('REPL_ID'):
            return 'replit'
        if os.getenv('GITHUB_ACTIONS'):
            return 'github-actions'
        if os.getenv('VERCEL'):
            return 'vercel'
        if os.getenv('NETLIFY'):
            return 'netlify'
        if os.getenv('RENDER'):
            return 'render'
        if os.getenv('HEROKU_APP_NAME'):
            return 'heroku'
        if os.getenv('AWS_LAMBDA_FUNCTION_NAME'):
            return 'aws-lambda'
        if os.getenv('GOOGLE_CLOUD_PROJECT'):
            return 'google-cloud'
        if os.getenv('WEBSITE_INSTANCE_ID'):
            return 'azure'
        
        return 'unknown'
    
    def _detect_claude_code(self) -> bool:
        """Detect if Claude Code is being used"""
        return (os.getenv('CLAUDE_CODE') == 'true' or
                os.path.exists('.claude') or
                os.path.exists('claude.json') or
                os.path.exists('CLAUDE.md'))
    
    def _detect_chittyos_components(self) -> Dict[str, bool]:
        """Detect which ChittyOS components are present"""
        components = {}
        
        # Check for component files
        component_files = {
            'chitty_id': 'chitty_id_integration.py',
            'chitty_trust': 'src/chitty_trust/',
            'chitty_score': 'chitty_workflow.py',
            'chitty_counsel': 'templates/',
            'chitty_assets': 'static/',
            'chitty_finance': 'marketplace.py',
            'chitty_chain': 'chittychain_ledger.py'
        }
        
        for component, file_path in component_files.items():
            components[component] = os.path.exists(file_path)
        
        return components
    
    def _send_beacon(self, data: Dict[str, Any]):
        """Send beacon data to tracking endpoint"""
        if not self.config['enabled']:
            if self.config['verbose']:
                self._log(f"Beacon disabled - would track: {data.get('event', 'unknown')} for {data.get('name', 'unknown')}")
            return
        
        try:
            url = f"{self.config['endpoint']}/track"
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'ChittyBeacon-Python/1.0.0'
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if self.config['verbose'] and response.status_code != 200:
                self._log(f"Response: {response.status_code}")
                
        except Exception as e:
            if self.config['verbose']:
                self._log(f"Error: {e}")
    
    def _initialize(self):
        """Initialize beacon tracking"""
        self.app_info = self._detect_app()
        
        # Send initial beacon
        self._send_beacon({
            **self.app_info,
            'event': 'startup',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Start heartbeat timer
        self._start_heartbeat()
        
        # Register shutdown handlers
        atexit.register(self._shutdown)
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        self._log(f"Tracking {self.app_info['name']} on {self.app_info['platform']}")
    
    def _start_heartbeat(self):
        """Start periodic heartbeat"""
        def heartbeat():
            self._send_beacon({
                'id': self.app_info['id'],
                'name': self.app_info['name'],
                'event': 'heartbeat',
                'timestamp': datetime.utcnow().isoformat(),
                'uptime': time.time() - self.start_time
            })
            
            # Schedule next heartbeat
            if self.config['enabled']:
                self.heartbeat_timer = threading.Timer(self.config['interval'], heartbeat)
                self.heartbeat_timer.daemon = True
                self.heartbeat_timer.start()
        
        # Start first heartbeat
        self.heartbeat_timer = threading.Timer(self.config['interval'], heartbeat)
        self.heartbeat_timer.daemon = True
        self.heartbeat_timer.start()
    
    def _shutdown(self):
        """Send shutdown beacon"""
        if self.heartbeat_timer:
            self.heartbeat_timer.cancel()
        
        if self.app_info:
            self._send_beacon({
                'id': self.app_info['id'],
                'name': self.app_info['name'],
                'event': 'shutdown',
                'timestamp': datetime.utcnow().isoformat(),
                'uptime': time.time() - self.start_time
            })
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self._shutdown()
        sys.exit(0)
    
    def send_custom_event(self, event_type: str, data: Optional[Dict] = None):
        """Send custom event beacon"""
        beacon_data = {
            'id': self.app_info['id'] if self.app_info else 'unknown',
            'name': self.app_info['name'] if self.app_info else 'unknown',
            'event': event_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if data:
            beacon_data.update(data)
        
        self._send_beacon(beacon_data)

# Global beacon instance
_beacon_instance = None

def initialize_beacon():
    """Initialize global beacon instance"""
    global _beacon_instance
    if _beacon_instance is None:
        _beacon_instance = ChittyBeacon()
    return _beacon_instance

def send_event(event_type: str, data: Optional[Dict] = None):
    """Send custom event via global beacon"""
    beacon = initialize_beacon()
    beacon.send_custom_event(event_type, data)

# Auto-initialize on import (like the Node.js version)
if __name__ != '__main__':
    initialize_beacon()