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
  ArrowRight,
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
    <div className="rounded-[14px] border border-white/[0.09] bg-[#111] p-8 shadow-elevation-3 animate-fade-in">

      {/* Header */}
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[11px] border border-[rgba(232,23,58,0.22)] bg-[rgba(232,23,58,0.10)]">
          <LockKeyhole className="h-5 w-5 text-[#e8173a]" />
        </div>
        <h2 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-white text-balance">
          Welcome back
        </h2>
        <p className="mt-2 text-body leading-relaxed text-white/45">
          Sign in to access your monitoring dashboard.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-[9px] border border-[rgba(232,23,58,0.22)] bg-[rgba(232,23,58,0.08)] p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8099]" />
          <p className="text-sm leading-6 text-[#ffb3c0]">{error}</p>
        </div>
      )}

      {/* Divider */}
      <div className="mb-7 border-t border-white/[0.07]" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`control-field w-full rounded-[9px] px-4 py-3 text-sm ${
                  errors.email ? "border-[rgba(232,23,58,0.50)] pr-10" : ""
                }`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e8173a]" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-[#ff8099] animate-fade-in">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`control-field w-full rounded-[9px] px-4 py-3 pr-12 text-sm ${
                  errors.password ? "border-[rgba(232,23,58,0.50)]" : ""
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-white/35 transition-all duration-150 hover:bg-white/[0.06] hover:text-white/80"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-[#ff8099] animate-fade-in">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit — pill-shaped red CTA matching 10x "Submit resource →" */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-7 flex w-full items-center justify-center gap-2.5 px-5 py-3.5 text-sm font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
