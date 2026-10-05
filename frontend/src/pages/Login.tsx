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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F0E7] text-[#352638]">
      <div className="w-full max-w-sm relative z-10 animate-slide-up">

        {/* Logo et Identité Terre & Registre */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[8px] bg-[#352638] flex items-center justify-center text-[#FFFCF6] font-serif font-bold text-2xl mb-3 shadow-sm border border-[#D8CEC4]">
            TA
          </div>
          <h1 className="font-serif font-medium text-2xl text-[#352638] tracking-tight">
            TraceAgro
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#AD5138] mt-1">
            Terre & Registre
          </p>
        </div>

        {/* Carte de Connexion */}
        <div className="card shadow-md">
          <h2 className="font-serif font-medium text-xl text-[#352638] mb-6 text-center">
            Connexion au registre
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#70656B] mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                className="input"
                placeholder="agent@traceagro.mg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#70656B] mb-1.5">
                Mot de passe
              </label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70656B] hover:text-[#352638]"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? 'Connexion en cours…' : 'Accéder au registre'}
            </button>
          </form>

          <div className="mt-5 p-3 rounded-[6px] bg-[#F5F0E7] border border-[#D8CEC4]">
            <p className="text-xs text-[#70656B] text-center font-medium">Compte de test :</p>
            <p className="text-xs text-[#352638] text-center mt-1 font-mono font-semibold">
              admin@traceagro.mg / Admin1234!
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6 text-[#70656B]">
          © 2026 TraceAgro · Madagascar
        </p>
      </div>
    </div>
  );
};
