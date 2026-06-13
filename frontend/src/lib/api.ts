import { useStore } from './store';

// Helper to make an API request with the auth token
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = useStore.getState().auth.token;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || response.statusText;
    } catch {
      errorMsg = response.statusText;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.data; // The backend wraps responses in { success: true, data: ... }
}
