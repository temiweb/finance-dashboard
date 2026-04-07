import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Lock, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (d) => {
    if (pin.length < 4) {
      const newPin = pin + d;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const submitPin = async (p) => {
    setLoading(true);
    const result = await login(p);
    if (!result.success) {
      setError(result.error);
      setPin('');
    }
    setLoading(false);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'];

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">
          <Lock size={28} />
        </div>
        <h1>Finance Dashboard</h1>
        <p className="login-subtitle">Enter your PIN to continue</p>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`} />
          ))}
        </div>

        {error && (
          <div className="pin-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="pin-pad">
          {digits.map((d, i) => (
            <button
              key={i}
              className={`pin-btn ${d === '' ? 'empty' : ''} ${d === '←' ? 'delete' : ''}`}
              onClick={() => d === '←' ? handleDelete() : d !== '' && handleDigit(d)}
              disabled={loading || d === ''}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
