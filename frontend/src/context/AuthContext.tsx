import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onForceLogout } from '@/lib/authBus';
import api from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  isAdmin: boolean;
  isDirector: boolean;
  isSeller: boolean;
  companyType: string | null;
  companyId: number | null;
  email: string | null;
  isBuyer: boolean;
  isSellerCompany: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  updateAccessToken: (newAccessToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AnyJwt = Record<string, any>;

function extractRolesFromJwt(token: string | null): string[] {
  if (!token) return [];
  try {
    const decoded = jwtDecode<AnyJwt>(token);
    // common places for roles/authorities
    const roles: string[] = [];
    const push = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach(push);
      else if (typeof v === 'string') v.split(/[ ,]+/).forEach((s) => s && roles.push(s));
      else if (typeof v === 'object') Object.values(v).forEach(push);
    };
    push(decoded['roles']);
    push(decoded['authorities']);
    push(decoded['scope']);
    push(decoded['scopes']);
    // normalize to uppercase unique
    return Array.from(new Set(roles.map((r) => String(r).toUpperCase())));
  } catch {
    return [];
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const at = localStorage.getItem('accessToken');
    const rt = localStorage.getItem('refreshToken');
    if (at) setAccessToken(at);
    if (rt) setRefreshToken(rt);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setRoles(extractRolesFromJwt(accessToken));
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken);
        setEmail(decoded.sub || null);
      } catch {
        setEmail(null);
      }
      loadCompanyType();
    } else {
      setCompanyType(null);
      setCompanyId(null);
      setEmail(null);
    }
  }, [accessToken]);

  const loadCompanyType = async () => {
    try {
      const decoded: any = jwtDecode(accessToken!);
      const userEmail = decoded.sub;
      const { data } = await api.get(`/user-service/companies/user/${userEmail}`);
      setCompanyType(data.type);
      setCompanyId(data.id);
    } catch (error) {
      console.error('Failed to load company type:', error);
      setCompanyType(null);
      setCompanyId(null);
    }
  };

  const login = (tokens: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    navigate('/login');
  };

  const updateAccessToken = (newAccessToken: string) => {
    localStorage.setItem('accessToken', newAccessToken);
    setAccessToken(newAccessToken);
  };

  const isAdmin = roles.some(r => r === 'ADMIN' || r === 'ROLE_ADMIN' || r.endsWith(':ADMIN') || r.endsWith(' ADMIN'));
  const isDirector = roles.some(r => r === 'DIRECTOR' || r === 'ROLE_DIRECTOR' || r.endsWith(':DIRECTOR') || r.endsWith(' DIRECTOR'));
  const isSeller = roles.some(r => r === 'SELLER' || r === 'ROLE_SELLER' || r.endsWith(':SELLER') || r.endsWith(' SELLER'));
  const isBuyer = companyType?.toUpperCase() === 'BUYER';
  const isSellerCompany = companyType?.toUpperCase() === 'SELLER';

  const value = useMemo(
    () => ({ 
      accessToken, 
      refreshToken, 
      isAuthenticated: !!accessToken, 
      isLoading, 
      roles, 
      isAdmin, 
      isDirector, 
      isSeller, 
      companyType, 
      companyId, 
      email, 
      isBuyer, 
      isSellerCompany, 
      login, 
      logout, 
      updateAccessToken 
    }),
    [accessToken, refreshToken, roles, isLoading, companyType, companyId, email]
  );

  // Subscribe to force-logout events (e.g., refresh token expired)
useEffect(() => {
  const unsub = onForceLogout(() => logout());
  return () => {
    if (typeof unsub === 'function') unsub();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // Subscribe to token refresh events
  useEffect(() => {
    const handleTokenRefresh = (event: CustomEvent) => {
      const { newToken } = event.detail;
      if (newToken) {
        updateAccessToken(newToken);
      }
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh as EventListener);
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
