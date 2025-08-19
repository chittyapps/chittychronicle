"""
ChittyID Authentication using Clerk
Clerk-based authentication system for ChittyID verification marketplace
"""
import os
import requests
import jwt
from functools import wraps
from flask import request, jsonify, session, current_app, g
from models import db, User

# Clerk configuration
CLERK_SECRET_KEY = os.environ.get('CLERK_SECRET_KEY')
CLERK_PUBLISHABLE_KEY = os.environ.get('CLERK_PUBLISHABLE_KEY')

def verify_clerk_token(token):
    """Verify Clerk session token"""
    try:
        # For development, we'll use a simple verification
        # In production, use Clerk's proper JWT verification
        if not token:
            return None
            
        # Decode without verification for demo (replace with proper Clerk verification)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        current_app.logger.error(f"Token verification failed: {e}")
        return None

def get_or_create_user(clerk_data):
    """Get or create user from Clerk data"""
    user_id = clerk_data.get('sub')
    if not user_id:
        return None
    
    user = User.query.get(user_id)
    if not user:
        user = User()
        user.id = user_id
        user.email = clerk_data.get('email')
        user.first_name = clerk_data.get('first_name')
        user.last_name = clerk_data.get('last_name')
        user.profile_image_url = clerk_data.get('profile_image_url')
        db.session.add(user)
        db.session.commit()
    else:
        # Update user info if changed
        user.email = clerk_data.get('email')
        user.first_name = clerk_data.get('first_name')
        user.last_name = clerk_data.get('last_name')
        user.profile_image_url = clerk_data.get('profile_image_url')
        db.session.commit()
    
    return user

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for session token
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
        elif 'clerk_session' in session:
            token = session['clerk_session']
        else:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Verify token
        clerk_data = verify_clerk_token(token)
        if not clerk_data:
            return jsonify({'error': 'Invalid authentication'}), 401
        
        # Get or create user
        user = get_or_create_user(clerk_data)
        if not user:
            return jsonify({'error': 'User creation failed'}), 500
        
        # Store user in request context
        g.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

def get_current_user():
    """Get current authenticated user"""
    return getattr(g, 'current_user', None)

def is_authenticated():
    """Check if user is authenticated"""
    return get_current_user() is not None