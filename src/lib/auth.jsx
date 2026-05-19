import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { hashPin } from './utils';

const AuthContext = createContext(null);
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('finance_session');
    if (raw) {
      try {
        const { token, timestamp } = JSON.parse(raw);
        if (token && Date.now() - timestamp < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('finance_session');
        }
      } catch {
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

      const storedPin = typeof data.value === 'string' ? data.value : String(data.value);
      const hashedInput = await hashPin(pin);

      if (hashedInput !== storedPin) {
        return { success: false, error: 'Invalid PIN' };
      }

      localStorage.setItem('finance_session', JSON.stringify({
        token: generateToken(),
        timestamp: Date.now(),
      }));
      setIsAuthenticated(true);
      return { success: true };
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
