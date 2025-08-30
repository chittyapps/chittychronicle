import { useQuery } from "@tanstack/react-query";
import { useChittyAuth } from "./useChittyAuth";

export function useAuth() {
  // Primary: Use ChittyAuth for authentication
  const chittyAuth = useChittyAuth();
  
  // Fallback: Demo mode if ChittyAuth is unavailable
  const { data: user, isLoading: demoLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    throwOnError: false,
  });

  // If ChittyAuth is available and working, use it
  if (chittyAuth.isAuthenticated || chittyAuth.isLoading) {
    return chittyAuth;
  }
  
  // Otherwise fall back to demo mode
  return {
    user,
    isLoading: demoLoading,
    isAuthenticated: !!user,
    error,
  };
}
