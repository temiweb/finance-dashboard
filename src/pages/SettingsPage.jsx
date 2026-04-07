import { useState } from 'react';
import { Plus, Trash2, Sun, Moon, Lock, Package, Palette, Save, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '../lib/settings';

export default function SettingsPage() {
  const { products, theme, setTheme, saveProducts, updatePin, productColors } = useSettings();

  // Products state
  const [editProducts, setEditProducts] = useState(products);
  const [newProduct, setNewProduct] = useState('');
  const [productsSaving, setProductsSaving] = useState(false);
  const [productsMsg, setProductsMsg] = useState(null);

  // PIN state
  const [pinForm, setPinForm] = useState({ current: '', newPin: '', confirm: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState(null);

  // Sync editProducts when products change from context
  const productsChanged = JSON.stringify(editProducts) !== JSON.stringify(products);

  const handleAddProduct = () => {
    const trimmed = newProduct.trim();
    if (!trimmed) return;
    if (editProducts.includes(trimmed)) {
      setProductsMsg({ type: 'error', text: 'Product already exists' });
      return;
    }
    setEditProducts([...editProducts, trimmed]);
    setNewProduct('');
    setProductsMsg(null);
  };

  const handleRemoveProduct = (index) => {
    setEditProducts(editProducts.filter((_, i) => i !== index));
    setProductsMsg(null);
  };

  const handleSaveProducts = async () => {
    if (editProducts.length === 0) {
      setProductsMsg({ type: 'error', text: 'Add at least one product' });
      return;
    }
    setProductsSaving(true);
    const result = await saveProducts(editProducts);
    if (result.success) {
      setProductsMsg({ type: 'success', text: 'Products saved' });
    } else {
      setProductsMsg({ type: 'error', text: result.error });
    }
    setProductsSaving(false);
    setTimeout(() => setProductsMsg(null), 3000);
  };

  const handleChangePin = async () => {
    setPinMsg(null);
    if (pinForm.newPin.length !== 4 || !/^\d{4}$/.test(pinForm.newPin)) {
      setPinMsg({ type: 'error', text: 'PIN must be exactly 4 digits' });
      return;
    }
    if (pinForm.newPin !== pinForm.confirm) {
      setPinMsg({ type: 'error', text: 'PINs do not match' });
      return;
    }
    setPinSaving(true);
    const result = await updatePin(pinForm.newPin);
    if (result.success) {
      setPinMsg({ type: 'success', text: 'PIN updated' });
      setPinForm({ current: '', newPin: '', confirm: '' });
    } else {
      setPinMsg({ type: 'error', text: result.error });
    }
    setPinSaving(false);
    setTimeout(() => setPinMsg(null), 3000);
  };

  const COLOR_PALETTE = [
    '#E8594F', '#F4A142', '#4ECDC4', '#7B68EE',
    '#45B7D1', '#FF6B9D', '#C0CA33', '#26A69A',
    '#AB47BC', '#FF7043', '#5C6BC0', '#66BB6A',
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-grid">
        {/* Theme */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Palette size={18} />
            <h3>Appearance</h3>
          </div>
          <div className="theme-toggle-group">
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={18} />
              <span>Dark</span>
            </button>
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={18} />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Products */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Package size={18} />
            <h3>Products</h3>
          </div>
          <p className="settings-desc">Manage the products available across the dashboard. These appear in dropdowns for revenue and expense entries.</p>

          <div className="product-list">
            {editProducts.map((p, i) => (
              <div key={i} className="product-item">
                <span className="product-dot" style={{ background: COLOR_PALETTE[i % COLOR_PALETTE.length] }} />
                <span className="product-name">{p}</span>
                <button className="btn-icon" onClick={() => handleRemoveProduct(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="product-add-row">
            <input
              type="text"
              placeholder="New product name"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
            />
            <button className="btn-secondary" onClick={handleAddProduct}>
              <Plus size={14} /> Add
            </button>
          </div>

          {productsMsg && (
            <div className={`settings-msg ${productsMsg.type}`}>
              {productsMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {productsMsg.text}
            </div>
          )}

          <div className="settings-actions">
            <button
              className="btn-primary"
              onClick={handleSaveProducts}
              disabled={productsSaving || !productsChanged}
            >
              <Save size={14} /> {productsSaving ? 'Saving…' : 'Save Products'}
            </button>
          </div>
        </div>

        {/* PIN */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Lock size={18} />
            <h3>Change PIN</h3>
          </div>
          <p className="settings-desc">Update the 4-digit PIN used to access this dashboard.</p>

          <div className="pin-form">
            <label>
              <span>New PIN</span>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })}
              />
            </label>
            <label>
              <span>Confirm PIN</span>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinForm.confirm}
                onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '') })}
              />
            </label>
          </div>

          {pinMsg && (
            <div className={`settings-msg ${pinMsg.type}`}>
              {pinMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {pinMsg.text}
            </div>
          )}

          <div className="settings-actions">
            <button
              className="btn-primary"
              onClick={handleChangePin}
              disabled={pinSaving || !pinForm.newPin || !pinForm.confirm}
            >
              <Lock size={14} /> {pinSaving ? 'Updating…' : 'Update PIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
