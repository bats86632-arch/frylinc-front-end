import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  LockKeyhole,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

function getAuthErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  return undefined;
}

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as LoginLocationState | null)?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      let errorMessage = "An error occurred during login";

      switch (getAuthErrorCode(err)) {
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-panel animate-fade-in rounded-[14px] p-7 sm:p-8">
      {/* Header */}
      <div>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[12px] border border-red-400/25 bg-red-500/10 text-red-200 shadow-[0_0_28px_rgba(239,68,68,0.15)]">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-white text-balance">
          Welcome back
        </h2>
        <p className="mt-2.5 text-body leading-relaxed text-slate-400">
          Sign in to access your monitoring dashboard.
        </p>
      </div>

      {error && (
        <div className="mt-7 flex items-start gap-3 rounded-[10px] border border-red-400/25 bg-red-500/10 p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <p className="text-sm leading-6 text-red-100">{error}</p>
        </div>
      )}

      {/* Divider between header and form */}
      <div className="mt-8 border-t border-white/[0.07]" />

      <form onSubmit={handleSubmit(onSubmit)} className="pt-8">
        <div className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2.5 block text-sm font-medium text-slate-200"
            >
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`control-field w-full rounded-[10px] px-4 py-3.5 text-sm placeholder:text-slate-500 ${
                  errors.email ? "border-red-400/60 pr-10" : ""
                }`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2.5 text-sm text-red-300 animate-fade-in">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2.5 block text-sm font-medium text-slate-200"
            >
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`control-field w-full rounded-[10px] px-4 py-3.5 pr-12 text-sm placeholder:text-slate-500 ${
                  errors.password ? "border-red-400/60" : ""
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-all duration-150 hover:bg-white/[0.06] hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2.5 text-sm text-red-300 animate-fade-in">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-8 flex w-full items-center justify-center gap-2.5 rounded-[10px] px-4 py-4 text-sm font-semibold tracking-wide"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <Flame className="h-4 w-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
