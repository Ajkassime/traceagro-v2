import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.token, data.data.refreshToken);
      toast.success(`Bienvenue, ${data.data.user.firstName} !`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(30,92,110,0.08) 0%, transparent 50%, rgba(201,146,58,0.05) 100%)' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(30,92,110,0.06)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(201,146,58,0.06)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">

        {/* Logo APL */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-apl.svg"
            alt="APL Vanilla"
            style={{ width: 150, height: 'auto', objectFit: 'contain', marginBottom: 12 }}
          />
          <p className="text-xs" style={{ color: 'var(--color-navy-400)', letterSpacing: '0.05em' }}>
            TraceAgro · APL Madagascar v2.0
          </p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-white mb-6 text-center">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Adresse email</label>
              <input
                type="email"
                className="input"
                placeholder="vous@traceagro.mg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 rounded-lg font-medium text-sm text-white transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, #1e5c6e 0%, #2a7a90 100%)',
                boxShadow: '0 2px 8px rgba(30,92,110,0.35)',
                opacity: loading ? 0.7 : 1,
                minHeight: 44,
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-gray-500 text-center">Compte de démonstration :</p>
            <p className="text-xs text-gray-400 text-center mt-1 font-mono">admin@traceagro.mg / Admin1234!</p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-navy-500)' }}>
          © 2026 APL Vanilla & Spices · Madagascar
        </p>
      </div>
    </div>
  );
};
