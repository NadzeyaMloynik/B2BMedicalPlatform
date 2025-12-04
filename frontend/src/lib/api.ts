import axios from 'axios';
import { emitError } from '@/lib/errorBus';
import { emitForceLogout } from '@/lib/authBus';

// Function to check if JWT token is expired
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    // Add 30 seconds buffer to refresh before actual expiration
    return payload.exp <= currentTime + 30;
  } catch {
    return true; // If we can't decode, consider it expired
  }
}

// In dev, Vite proxies /api to the gateway target.
// We keep baseURL as '/api' so the browser calls the dev server, and the server forwards to the gateway.
const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

// Attach Authorization header and check token expiration before each request
api.interceptors.request.use(async (config) => {
  let accessToken = localStorage.getItem('accessToken');
  
  // Check if token is expired and refresh if needed
  if (accessToken && isTokenExpired(accessToken)) {
    console.log('Access token expired, attempting refresh...');
    
    // Use shared refresh promise to prevent concurrent refreshes
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    
    const newToken = await refreshPromise;
    accessToken = newToken;
  }
  
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

// Try to refresh on 401 using refresh token
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let pendingRequests: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) {
    emitForceLogout();
    return null;
  }
  try {
    // Use axios directly to avoid interceptor recursion
    const res = await axios.post<string>('/api/auth/refresh', { refresh }, { 
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const newToken = typeof res.data === 'string' ? res.data : (res.data as any);
    localStorage.setItem('accessToken', newToken);
    
    // Emit event to update auth context
    window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { newToken } }));
    
    return newToken;
  } catch (e) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Notify app that refresh token is invalid/expired -> redirect to /login
    emitForceLogout();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};

    // Extract and emit error info for popup toasts
    try {
      const status: number | undefined = error?.response?.status;
      const method: string | undefined = original?.method;
      const url: string | undefined = original?.url || original?.baseURL ? `${original?.baseURL || ''}${original?.url || ''}` : undefined;

      let backendMessage: string | undefined;
      const data = error?.response?.data;
      if (typeof data === 'string') backendMessage = data;
      else if (data?.message && typeof data.message === 'string') backendMessage = data.message;
      else if (Array.isArray(data?.errors)) backendMessage = data.errors.map((e: any) => (e?.message || JSON.stringify(e))).join('\n');
      else if (data?.errors && typeof data.errors === 'object') backendMessage = Object.values<any>(data.errors).map(v => (Array.isArray(v) ? v.join(', ') : String(v))).join('\n');
      else if (data) backendMessage = JSON.stringify(data);

      const message = backendMessage || error?.message || 'Request failed';
      emitError({ message, status, url, method });
    } catch {}

    // If we still get 401 after proactive refresh, logout
    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true;
      
      // Try one more refresh in case the proactive refresh failed
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (token) {
              original.headers = original.headers || {};
              original.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }
      
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      pendingRequests.forEach((cb) => cb(newToken));
      pendingRequests = [];
      
      if (newToken) {
        original.headers = original.headers || {};
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
