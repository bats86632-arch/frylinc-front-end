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
    <div className="surface-panel w-full rounded-[20px] p-8 sm:p-10 animate-fade-in lg:rounded-[28px] lg:border-white/[0.14] lg:bg-[linear-gradient(180deg,rgba(18,18,26,0.92),rgba(10,10,15,0.86))] lg:p-11 lg:shadow-[0_30px_110px_rgba(0,0,0,0.48)] lg:backdrop-blur-2xl">
      {/* Header */}
      <div className="mb-8 lg:mb-9">
        <div className="mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(232,23,58,0.28)] bg-[rgba(232,23,58,0.10)] inset-highlight shadow-[0_12px_32px_rgba(232,23,58,0.16)] lg:h-14 lg:w-14 lg:rounded-[18px]">
            <LockKeyhole className="h-5 w-5 text-[#ff5c73] lg:h-6 lg:w-6" />
          </div>
        </div>
        <h2 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-white text-balance drop-shadow-sm lg:text-[2.45rem] lg:tracking-[-0.045em]">
          Welcome back
        </h2>
        <p className="mt-2 text-body leading-relaxed text-white/50 font-medium lg:mt-3 lg:max-w-sm lg:text-[0.95rem]">
          Sign in to access your monitoring dashboard.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-7 flex items-start gap-3 rounded-[12px] border border-[rgba(232,23,58,0.30)] bg-[rgba(232,23,58,0.12)] p-4 animate-fade-in inset-highlight">
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#ff8099]" />
          <p className="text-[13px] font-medium leading-6 text-[#ffb3c0]">
            {error}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="mb-8 border-t border-white/[0.06] lg:border-white/[0.10]" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2.5 block text-[13px] font-semibold text-white/80"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`control-field w-full px-4 py-3.5 text-[13px] font-medium lg:h-[52px] lg:rounded-[14px] ${
                  errors.email
                    ? "border-[rgba(232,23,58,0.50)] bg-[rgba(232,23,58,0.05)] pr-10"
                    : ""
                }`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#e8173a]" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-[13px] font-medium text-[#ff8099] animate-fade-in">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2.5 block text-[13px] font-semibold text-white/80"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`control-field w-full px-4 py-3.5 pr-12 text-[13px] font-medium lg:h-[52px] lg:rounded-[14px] ${
                  errors.password
                    ? "border-[rgba(232,23,58,0.50)] bg-[rgba(232,23,58,0.05)]"
                    : ""
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-white/40 transition-all duration-150 hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
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
              <p className="mt-2 text-[13px] font-medium text-[#ff8099] animate-fade-in">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-8 flex w-full items-center justify-center gap-2.5 px-5 py-4 text-[15px] font-bold lg:h-[54px] lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_36px_rgba(232,23,58,0.28)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-[18px] w-[18px]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
