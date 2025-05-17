import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { User, LoginResponse } from '../types/auth';



interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role?: string) => Promise<LoginResponse>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  loginTime: string | null;
}

// Define permissions for different roles
const rolePermissions = {
  admin: [
    'view_dashboard',
    'view_inventory',
    'add_product',
    'edit_product',
    'delete_product',
    'restock_product',
    'view_calculator',
    'view_trends',
    'export_data'
  ],
  staff: [
    'view_dashboard',
    'view_inventory',
    'view_trends'
  ]
};

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginTime, setLoginTime] = useState<string | null>(localStorage.getItem('loginTime'));

  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Function to check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userRole = user.role;
    const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
    
    return permissions.includes(permission);
  };

  const login = async (username: string, password: string, role: string = 'staff'): Promise<LoginResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(username, password, role);
      if (response && response.token) {
        setUser(response.user);
        setToken(`Bearer ${response.token}`);
        localStorage.setItem('token', `Bearer ${response.token}`);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return response;
      const currentTime = new Date().toISOString();
      const userWithLoginTime = {
        ...response.user,
        lastLogin: currentTime
      };
      
      setUser(userWithLoginTime);
      setLoginTime(currentTime);
      
      // Save to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(userWithLoginTime));
      localStorage.setItem('loginTime', currentTime);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setLoginTime(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        isLoading,
        error,
        hasPermission,
        loginTime
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);