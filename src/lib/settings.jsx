import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const SettingsContext = createContext(null);

const DEFAULT_PRODUCTS = [
  'Net Repair Tape',
  'Mesh Tape',
  'Car Scratch Remover',
  'Deep Edge Crevice Brush',
];

// Color palette for auto-assigning to products
const COLOR_PALETTE = [
  '#E8594F', '#F4A142', '#4ECDC4', '#7B68EE',
  '#45B7D1', '#FF6B9D', '#C0CA33', '#26A69A',
  '#AB47BC', '#FF7043', '#5C6BC0', '#66BB6A',
];

export function SettingsProvider({ children }) {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [theme, setThemeState] = useState(() => localStorage.getItem('finance_theme') || 'dark');
  const [loading, setLoading] = useState(true);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('finance_theme', theme);
  }, [theme]);

  // Load settings from Supabase
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('finance_settings')
          .select('key, value')
          .in('key', ['products']);

        if (!error && data) {
          const productsRow = data.find(r => r.key === 'products');
          if (productsRow) {
            const parsed = typeof productsRow.value === 'string'
              ? JSON.parse(productsRow.value)
              : productsRow.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProducts(parsed);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Generate product colors dynamically
  const getProductColors = useCallback(() => {
    const colors = {};
    products.forEach((p, i) => {
      colors[p] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return colors;
  }, [products]);

  // Save products to Supabase
  const saveProducts = useCallback(async (newProducts) => {
    try {
      const { error } = await supabase
        .from('finance_settings')
        .upsert({ key: 'products', value: newProducts, updated_at: new Date().toISOString() });
      if (error) throw error;
      setProducts(newProducts);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  // Update PIN
  const updatePin = useCallback(async (newPin) => {
    try {
      const { error } = await supabase
        .from('finance_settings')
        .upsert({ key: 'pin', value: newPin, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  return (
    <SettingsContext.Provider value={{
      products,
      productColors: getProductColors(),
      theme,
      setTheme,
      saveProducts,
      updatePin,
      loading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
