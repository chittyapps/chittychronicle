// API client configuration
// In production, API is at chronicle.chitty.cc
// In development, API is at localhost:5000

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://chronicle.chitty.cc' : '');

export async function apiClient(path: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiClient(path);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export async function apiPost<T>(path: string, data?: any): Promise<T> {
  const response = await apiClient(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export async function apiPut<T>(path: string, data?: any): Promise<T> {
  const response = await apiClient(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await apiClient(path, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}
