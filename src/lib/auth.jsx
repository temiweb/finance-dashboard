import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { hashPin } from './utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bootstrap from existing Supabase session (survives page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
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

      // PIN verified — create a real server-validated Supabase session
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Connection error. Check your settings.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
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
