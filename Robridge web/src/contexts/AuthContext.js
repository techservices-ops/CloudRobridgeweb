import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  EXPO_USER: 'expo_user',
  FULL_ACCESS: 'full_access'
};

// Page access control
export const PAGE_ACCESS = {
  [ROLES.ADMIN]: [
    '/', '/scanner', '/scanned-barcodes', '/generator', '/saved-scans', '/image-processing', '/robot-control',
    '/rack-status', '/rack-management', '/product-management', '/device-connected', '/settings'
  ],
  [ROLES.EXPO_USER]: [
    '/', '/scanner', '/scanned-barcodes', '/saved-scans', '/device-connected', '/profile'
  ],
  [ROLES.FULL_ACCESS]: [
    '/', '/scanner', '/scanned-barcodes', '/generator', '/saved-scans', '/image-processing', '/robot-control',
    '/rack-status', '/rack-management', '/product-management', '/device-connected', '/settings'
  ]
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get server URL based on environment
  const getServerURL = () => {
    return process.env.NODE_ENV === 'production' 
      ? 'https://robridgeexpress.onrender.com' 
      : 'http://localhost:3001';
  };

  // Check for existing session on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('robridge_token');
        const savedUser = localStorage.getItem('robridge_user');
        
        if (token && savedUser) {
          // Verify token with backend
          try {
            const response = await fetch(`${getServerURL()}/api/auth/verify`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                const userData = {
                  ...data.user,
                  isAuthenticated: true,
                  allowedPages: PAGE_ACCESS[data.user.role] || []
                };
                setUser(userData);
                localStorage.setItem('robridge_user', JSON.stringify(userData));
              } else {
                // Token invalid, clear storage
                localStorage.removeItem('robridge_token');
                localStorage.removeItem('robridge_user');
              }
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('robridge_token');
              localStorage.removeItem('robridge_user');
            }
          } catch (error) {
            console.error('Error verifying token:', error);
            // If verification fails, try to use saved user data (offline mode)
            const userData = JSON.parse(savedUser);
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('robridge_token');
        localStorage.removeItem('robridge_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      if (!email || !password) {
        return { 
          success: false, 
          message: 'Email and password are required' 
        };
      }

      // Call backend login API
      const response = await fetch(`${getServerURL()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token and user data
        localStorage.setItem('robridge_token', data.token);
        
        const userInfo = {
          ...data.user,
          loginTime: new Date().toISOString(),
          isAuthenticated: true,
          allowedPages: PAGE_ACCESS[data.user.role] || []
        };
        
        localStorage.setItem('robridge_user', JSON.stringify(userInfo));
        setUser(userInfo);
        
        return { 
          success: true, 
          message: data.message || 'Login successful',
          user: userInfo
        };
      } else {
        return { 
          success: false, 
          message: data.error || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (error) {
      console.error('Error during login:', error);
      return { 
        success: false, 
        message: 'Login failed. Please check your connection and try again.' 
      };
    }
  };

  const logout = () => {
    try {
      setUser(null);
      localStorage.removeItem('robridge_token');
      localStorage.removeItem('robridge_user');
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  };

  const isAuthenticated = () => {
    return user && user.isAuthenticated;
  };

  const getUserInfo = () => {
    return user;
  };

  const hasPageAccess = (path) => {
    if (!user || !user.allowedPages) {
      return false;
    }
    return user.allowedPages.includes(path);
  };

  const getUserRole = () => {
    return user ? user.role : null;
  };

  const isExpoUser = () => {
    return user && user.role === ROLES.EXPO_USER;
  };

  const isAdmin = () => {
    return user && user.role === ROLES.ADMIN;
  };

  const isFullAccess = () => {
    return user && user.role === ROLES.FULL_ACCESS;
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated,
    getUserInfo,
    hasPageAccess,
    getUserRole,
    isExpoUser,
    isAdmin,
    isFullAccess,
    ROLES,
    PAGE_ACCESS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
