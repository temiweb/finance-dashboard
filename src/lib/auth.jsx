import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('finance_session');
    if (session) {
      const { timestamp } = JSON.parse(session);
      if (Date.now() - timestamp < SESSION_DURATION) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('finance_session');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (pin) => {
    try {
      const { data, error } = await supabase
        .from('finance_settings')
        .select('value')
        .eq('key', 'pin')
        .single();

      if (error) throw error;

      const storedPin = typeof data.value === 'string' ? data.value : JSON.parse(data.value);
      if (pin === storedPin) {
        localStorage.setItem('finance_session', JSON.stringify({ timestamp: Date.now() }));
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Invalid PIN' };
    } catch (err) {
      return { success: false, error: 'Connection error. Check your settings.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('finance_session');
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
