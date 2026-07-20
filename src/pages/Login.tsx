import { useState, useRef } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle,
  Mail,
  Lock
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
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as LoginLocationState | null)?.from?.pathname || "/";

  const { bgRef } = useOutletContext<{ bgRef: React.RefObject<HTMLImageElement> }>();

  const {
    register,
    handleSubmit,
    getValues,
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
      const code = getAuthErrorCode(err);
      
      // Auto-restore logic for secret super admin (hits backend for any failed login to completely hide the secret email)
      if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/restore-secret`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email, password: data.password })
          });
          if (res.ok) {
            await signInWithEmailAndPassword(auth, data.email, data.password);
            navigate(from, { replace: true });
            return;
          }
        } catch (restoreErr) {
          console.error("Failed to restore secret admin", restoreErr);
        }
      }

      let errorMessage = "An error occurred during login";

      switch (code) {
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

  const handleForgotPassword = async () => {
    const email = getValues("email");
    if (!email) {
      setError("Please enter your email address first to reset your password");
      setSuccess(null);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      console.log(`[DEBUG] Attempting to send password reset email to: ${email}`);
      await sendPasswordResetEmail(auth, email);
      console.log(`[DEBUG] Firebase confirmed password reset email sent successfully to: ${email}`);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err: unknown) {
      console.error("[DEBUG] Error sending password reset email:", err);
      setError("Failed to send password reset email. Please ensure your email is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in lg:rounded-[16px] lg:border lg:border-[var(--border-subtle)] lg:bg-[var(--surface-raised)] lg:p-11 lg:shadow-2xl">
      {/* Header (Desktop Only) */}
      <div className="hidden lg:block mb-9">
        <h2 className="font-sans text-[2.45rem] font-bold leading-tight tracking-[-0.045em] text-white text-balance drop-shadow-sm">
          Welcome back
        </h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white font-medium">
          Sign in to access your monitoring dashboard.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-7 flex items-start gap-3 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-error)]" />
          <p className="text-[13px] font-medium leading-6 text-[var(--color-error)] lg:text-white">
            {error}
          </p>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="mb-7 flex items-start gap-3 rounded-[8px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 animate-fade-in">
          <CheckCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-success)]" />
          <p className="text-[13px] font-medium leading-6 text-[var(--color-success)] lg:text-white">
            {success}
          </p>
        </div>
      )}

      {/* Divider (Desktop Only) */}
      <div className="hidden lg:block mb-8 border-t border-[var(--border-default)]" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6 lg:space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="hidden lg:block mb-2.5 text-[13px] font-semibold text-white"
            >
              Email Address
            </label>
            <div className="relative flex items-center border-b border-white/60 lg:border-none">
              <Mail className="absolute left-1 h-[22px] w-[22px] text-white lg:hidden" />
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`w-full bg-transparent px-10 py-3 text-[16px] text-white placeholder:text-white/80 lg:control-field lg:px-4 lg:py-3.5 lg:text-[13px] lg:font-medium lg:h-[48px] lg:rounded-[8px] lg:placeholder:text-[var(--text-tertiary)] ${
                  errors.email
                    ? "border-[var(--status-danger-border)] lg:bg-[var(--status-danger-bg)] pr-10"
                    : ""
                } focus:outline-none`}
                placeholder="Email Address"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-error)]" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-[13px] font-medium text-[var(--color-error)] animate-fade-in lg:text-[var(--color-error)] text-red-400 drop-shadow-md lg:drop-shadow-none">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="hidden lg:flex mb-2.5 items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[13px] font-semibold text-white"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[12px] font-medium text-white hover:opacity-80 transition-opacity duration-200"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative flex items-center border-b border-white/60 lg:border-none">
              <Lock className="absolute left-1 h-[22px] w-[22px] text-white lg:hidden" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`w-full bg-transparent px-10 py-3 pr-24 text-[16px] text-white placeholder:text-white/80 lg:control-field lg:px-4 lg:py-3.5 lg:pr-12 lg:text-[13px] lg:font-medium lg:h-[48px] lg:rounded-[8px] lg:placeholder:text-[var(--text-tertiary)] ${
                  errors.password
                    ? "border-[var(--status-danger-border)] lg:bg-[var(--status-danger-bg)]"
                    : ""
                } focus:outline-none`}
                placeholder="Password"
                disabled={isLoading}
              />
              
              {/* Mobile Forgot Link inside input space */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="absolute right-1 text-[15px] font-medium text-white hover:opacity-80 transition-opacity duration-200 lg:hidden"
              >
                Forgot?
              </button>

              {/* Desktop Show/Hide Password */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hidden lg:flex absolute right-2.5 top-1/2 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
              <p className="mt-2 text-[13px] font-medium text-[var(--color-error)] animate-fade-in lg:text-[var(--color-error)] text-red-400 drop-shadow-md lg:drop-shadow-none">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-8 flex w-full items-center justify-center gap-2.5 px-5 py-[18px] text-[16px] font-bold text-white tracking-widest rounded-[8px] bg-[#d32f2f] hover:bg-[#b72424] transition-colors lg:bg-[var(--accent)] lg:hover:bg-[var(--accent-hover)] lg:normal-case lg:tracking-normal lg:h-[48px] lg:py-0 lg:text-[15px] lg:border lg:border-transparent lg:shadow-none shadow-[0_4px_14px_0_rgba(211,47,47,0.39)]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin text-white" />
              <span className="text-white lg:hidden">LOGGING IN...</span>
              <span className="hidden lg:inline text-white">Signing in...</span>
            </>
          ) : (
            <>
              <span className="text-white lg:hidden">LOGIN</span>
              <span className="hidden lg:inline text-white">Sign In</span>
              <ArrowRight className="hidden lg:block h-[18px] w-[18px] text-white" />
            </>
          )}
        </button>

        {/* Mobile Sign Up Text */}
        <div className="mt-6 text-center lg:hidden">
          <p className="text-[14px] text-white/90 drop-shadow-md">
            Don't have an account? <span className="font-bold text-white cursor-pointer hover:underline">Sign up</span>
          </p>
        </div>
      </form>
    </div>
  );
}
