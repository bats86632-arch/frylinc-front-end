import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, AlertTriangle, Mail, Lock, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface px-4">
      {/* ── Background decoration ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Radial glow — top-center, primary tint */}
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/[.07] blur-[120px]" />

        {/* Secondary warm glow — bottom-right, fire tint */}
        <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-fire/[.05] blur-[100px]" />

        {/* Subtle dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-outline/60 bg-surface-container/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          {/* ── Brand header ── */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-fire/20 bg-fire/10 shadow-lg shadow-fire/10">
              <Flame className="h-8 w-8 text-fire" />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface">
              Fyrlinc
            </h1>
            <p className="mt-1 font-sans text-sm text-on-surface-variant">
              Fire Panel Monitoring System
            </p>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-fire/30 bg-fire/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-fire" />
              <p className="font-sans text-sm leading-relaxed text-red-200">
                {error}
              </p>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block font-sans text-sm font-medium text-on-surface"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-outline bg-surface-container py-3 pl-11 pr-4 font-sans text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block font-sans text-sm font-medium text-on-surface"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-outline bg-surface-container py-3 pl-11 pr-12 font-sans text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-sans font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* ── Footer note ── */}
          <p className="mt-8 text-center font-sans text-xs text-on-surface-variant/60">
            Protected system — authorised personnel only.
          </p>
        </div>

        {/* Card-bottom glow accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-4 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-primary/10 blur-xl"
        />
      </div>
    </div>
  );
}
