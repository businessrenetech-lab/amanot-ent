import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router';
import { Lock, Mail, LogIn, Loader2, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      navigate('/admin');
    } else {
      setError(res.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:22px_22px] opacity-55" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/60 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="mb-5 flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to storefront
        </button>

        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-2xl shadow-slate-300/50 p-8">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex flex-col items-center justify-center border-2 border-white leading-none">
                <span className="text-[10px] font-black text-white">AE</span>
                <span className="text-[7px] text-cyan-200 font-bold">ELECT</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-400 flex flex-col items-center justify-center border-2 border-white leading-none">
                <span className="text-[10px] font-black text-white">AE</span>
                <span className="text-[7px] text-emerald-100 font-bold">ENTER</span>
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">AMANOT GROUP</h1>
              <p className="text-[11px] text-slate-500 font-medium">Business ERP — Staff Portal</p>
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-1">Sign in to your account</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your credentials to access the admin dashboard.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Email</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amanatgroup.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
