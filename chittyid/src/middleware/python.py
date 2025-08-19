"""
ChittyID Authentication Middleware for FastAPI
Provides JWT validation and trust level enforcement for ChittyID tokens
"""

import time
import asyncio
from typing import List, Optional, Dict, Any, Callable, Union
from dataclasses import dataclass
from urllib.parse import urljoin
import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import json
from functools import lru_cache


@dataclass
class ChittyIDTokenClaims:
    """ChittyID JWT token claims"""
    iss: str
    sub: str
    aud: Union[str, List[str]]
    exp: int
    iat: int
    jti: str
    lvl: int
    nbf: Optional[int] = None
    org: Optional[str] = None
    tenant: Optional[str] = None
    roles: Optional[List[str]] = None
    scope: Optional[str] = None
    mcp_server_id: Optional[str] = None
    permitted_tools: Optional[List[str]] = None
    rate_tier: Optional[str] = None

    @property
    def scopes(self) -> List[str]:
        """Parse scopes from space-delimited string"""
        return (self.scope or "").split() if self.scope else []


class JTICache:
    """JTI replay protection cache with Redis backend"""
    
    def __init__(self, redis_url: Optional[str] = None, ttl: int = 3600):
        self.ttl = ttl
        self.redis_client = None
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
            except Exception:
                pass
        
        # Fallback to in-memory cache
        self._memory_cache: Dict[str, float] = {}
    
    async def check_and_set(self, jti: str) -> bool:
        """Check if JTI is new and mark it as used. Returns True if new."""
        if self.redis_client:
            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self._redis_check_and_set, jti
                )
                return result
            except Exception:
                pass
        
        # Fallback to memory cache
        now = time.time()
        if jti in self._memory_cache:
            return False
        
        self._memory_cache[jti] = now + self.ttl
        # Clean old entries
        expired = [k for k, v in self._memory_cache.items() if v < now]
        for k in expired:
            del self._memory_cache[k]
        
        return True
    
    def _redis_check_and_set(self, jti: str) -> bool:
        """Redis implementation of check and set"""
        key = f"chittyid:jti:{jti}"
        exists = self.redis_client.exists(key)
        if not exists:
            self.redis_client.setex(key, self.ttl, "1")
            return True
        return False


class JWKSClient:
    """JWKS client with caching"""
    
    def __init__(self, jwks_uri: str, cache_ttl: int = 3600):
        self.jwks_uri = jwks_uri
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, Any] = {}
        self._cache_time = 0
    
    async def get_jwks(self) -> Dict[str, Any]:
        """Fetch JWKS with caching"""
        now = time.time()
        if now - self._cache_time < self.cache_ttl and self._cache:
            return self._cache
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.jwks_uri)
            response.raise_for_status()
            self._cache = response.json()
            self._cache_time = now
            return self._cache
    
    async def get_key(self, kid: str) -> Optional[Ed25519PublicKey]:
        """Get public key by kid"""
        jwks = await self.get_jwks()
        for key_data in jwks.get('keys', []):
            if key_data.get('kid') == kid and key_data.get('alg') == 'EdDSA':
                # Convert JWK to Ed25519PublicKey
                x = key_data.get('x')
                if x:
                    import base64
                    key_bytes = base64.urlsafe_b64decode(x + '==')
                    return Ed25519PublicKey.from_public_bytes(key_bytes)
        return None


class ChittyIDMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for ChittyID authentication"""
    
    def __init__(
        self,
        app: FastAPI,
        jwks_uri: str = "https://registry.chitty.cc/.well-known/jwks.json",
        issuer: str = "https://registry.chitty.cc",
        audience: Optional[str] = None,
        required_scopes: Optional[List[str]] = None,
        min_trust_level: int = 1,
        jti_cache_redis_url: Optional[str] = None,
        jti_cache_ttl: int = 3600,
        skip_paths: Optional[List[str]] = None,
        on_token_verified: Optional[Callable[[ChittyIDTokenClaims], None]] = None
    ):
        super().__init__(app)
        self.jwks_client = JWKSClient(jwks_uri)
        self.issuer = issuer
        self.audience = audience
        self.required_scopes = required_scopes or []
        self.min_trust_level = min_trust_level
        self.jti_cache = JTICache(jti_cache_redis_url, jti_cache_ttl)
        self.skip_paths = skip_paths or []
        self.on_token_verified = on_token_verified
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for certain paths
        if request.url.path in self.skip_paths:
            return await call_next(request)
        
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "unauthorized",
                    "error_description": "Missing or invalid authorization header"
                }
            )
        
        token = auth_header[7:]  # Remove 'Bearer '
        
        try:
            claims = await self.verify_token(token)
            # Attach claims to request state
            request.state.chitty_id = claims
            
            if self.on_token_verified:
                self.on_token_verified(claims)
            
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "invalid_token",
                    "error_description": str(e)
                }
            )
    
    async def verify_token(self, token: str) -> ChittyIDTokenClaims:
        """Verify JWT token and return claims"""
        # Decode header to get kid
        header = jwt.get_unverified_header(token)
        kid = header.get('kid')
        if not kid:
            raise ValueError("Missing kid in token header")
        
        # Get public key
        public_key = await self.jwks_client.get_key(kid)
        if not public_key:
            raise ValueError(f"Unknown key id: {kid}")
        
        # Verify JWT
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['EdDSA'],
                issuer=self.issuer,
                audience=self.audience,
                options={"verify_exp": True, "verify_nbf": True}
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "token_expired",
                    "error_description": "The access token has expired"
                }
            )
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Token validation failed: {e}")
        
        claims = ChittyIDTokenClaims(**payload)
        
        # Check JTI for replay protection
        is_new = await self.jti_cache.check_and_set(claims.jti)
        if not is_new:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "invalid_token",
                    "error_description": "Token replay detected"
                }
            )
        
        # Check trust level
        if claims.lvl < self.min_trust_level:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "insufficient_trust_level",
                    "error_description": f"Trust level {self.min_trust_level} required, but token has level {claims.lvl}"
                },
                headers={
                    "WWW-Authenticate": f'Bearer scope="{" ".join(self.required_scopes)}" level={self.min_trust_level}'
                }
            )
        
        # Check required scopes
        if self.required_scopes:
            token_scopes = claims.scopes
            missing_scopes = [s for s in self.required_scopes if s not in token_scopes]
            if missing_scopes:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "insufficient_scope",
                        "error_description": f"Required scopes: {' '.join(self.required_scopes)}"
                    },
                    headers={
                        "WWW-Authenticate": f'Bearer scope="{" ".join(self.required_scopes)}"'
                    }
                )
        
        return claims


# Dependency for route-level auth
security = HTTPBearer()

async def get_chitty_id_claims(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> ChittyIDTokenClaims:
    """Dependency to get ChittyID claims from request"""
    if hasattr(request.state, 'chitty_id'):
        return request.state.chitty_id
    
    raise HTTPException(
        status_code=401,
        detail="ChittyID authentication required"
    )


# Helper functions
def has_scope(claims: ChittyIDTokenClaims, scope: str) -> bool:
    """Check if token has specific scope"""
    return scope in claims.scopes


def has_role(claims: ChittyIDTokenClaims, role: str) -> bool:
    """Check if token has specific role"""
    return role in (claims.roles or [])


def has_tool(claims: ChittyIDTokenClaims, tool: str) -> bool:
    """Check if token has access to specific tool"""
    return tool in (claims.permitted_tools or [])


def get_trust_level(claims: ChittyIDTokenClaims) -> int:
    """Get trust level from token"""
    return claims.lvl


# Decorator for requiring specific scopes
def require_scopes(*scopes: str):
    """Decorator to require specific scopes"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract claims from request or dependency
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request and hasattr(request.state, 'chitty_id'):
                claims = request.state.chitty_id
                missing_scopes = [s for s in scopes if not has_scope(claims, s)]
                if missing_scopes:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Missing required scopes: {', '.join(missing_scopes)}"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Usage example:
"""
from fastapi import FastAPI
from chittyid_middleware_python import ChittyIDMiddleware, get_chitty_id_claims, require_scopes

app = FastAPI()

# Add middleware
app.add_middleware(
    ChittyIDMiddleware,
    audience="mcp://my-service",
    required_scopes=["mcp:invoke", "tools:read"],
    min_trust_level=2
)

@app.get("/protected")
async def protected_endpoint(claims: ChittyIDTokenClaims = Depends(get_chitty_id_claims)):
    return {"user": claims.sub, "roles": claims.roles}

@app.post("/admin")
@require_scopes("write:critical")
async def admin_endpoint(request: Request):
    claims = request.state.chitty_id
    # Handle admin request
    return {"message": "Admin action completed"}
"""