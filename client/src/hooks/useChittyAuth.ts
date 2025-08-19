import { useQuery } from "@tanstack/react-query";

interface ChittyAuthUser {
  chittyId: string;
  email?: string;
  name: string;
  roles: string[];
  permissions: string[];
  verified: boolean;
  metadata?: Record<string, any>;
}

export function useChittyAuth() {
  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return {
    user: authData?.user as ChittyAuthUser,
    profile: authData?.profile,
    permissions: authData?.permissions || [],
    isLoading,
    isAuthenticated: !!authData?.user,
    hasRole: (role: string) => {
      const userRoles = authData?.user?.roles || [];
      return userRoles.includes(role) || userRoles.includes('admin');
    },
    hasPermission: (permission: string) => {
      const userPermissions = authData?.permissions || [];
      return userPermissions.includes(permission) || userPermissions.includes('*');
    },
  };
}

// Authentication utils for ChittyID
export function isChittyAuthError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function verifyChittySignature(
  chittyId: string,
  signature: string,
  data: any
): Promise<boolean> {
  return fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chittyId, signature, data }),
  })
    .then(res => res.json())
    .then(result => result.verified);
}

export function refreshChittyToken(): Promise<boolean> {
  return fetch('/api/auth/refresh', {
    method: 'POST',
  })
    .then(res => res.json())
    .then(result => result.success);
}