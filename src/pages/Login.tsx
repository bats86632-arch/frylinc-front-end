import { useState, useRef } from "react";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useAdaptiveTextColor } from "../hooks/useAdaptiveTextColor";
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
  LockKeyhole,
  CheckCircle,
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

  const lockRef = useRef<SVGSVGElement>(null);
  const welcomeRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const emailLabelRef = useRef<HTMLLabelElement>(null);
  const passwordLabelRef = useRef<HTMLLabelElement>(null);
  const forgotPasswordRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const signInTextRef = useRef<HTMLSpanElement>(null);

  useAdaptiveTextColor(lockRef, bgRef);
  useAdaptiveTextColor(welcomeRef, bgRef);
  useAdaptiveTextColor(subtitleRef, bgRef);
  useAdaptiveTextColor(emailLabelRef, bgRef);
  useAdaptiveTextColor(passwordLabelRef, bgRef);
  useAdaptiveTextColor(forgotPasswordRef, bgRef);
  useAdaptiveTextColor(emailInputRef, bgRef);
  useAdaptiveTextColor(passwordInputRef, bgRef);
  useAdaptiveTextColor(signInTextRef, bgRef);

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
    <div className="w-full rounded-[20px] p-8 sm:p-10 animate-fade-in border border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 backdrop-blur-md shadow-xl lg:rounded-[16px] lg:p-11 lg:shadow-2xl">
      {/* Header */}
      <div className="mb-8 lg:mb-9">
        <div className="mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-overlay)] lg:h-14 lg:w-14 lg:rounded-[12px]">
            <LockKeyhole ref={lockRef} className="h-5 w-5 text-[var(--text-primary)] lg:h-6 lg:w-6 transition-colors duration-200" />
          </div>
        </div>
        <h2 ref={welcomeRef} className="font-sans text-[2rem] font-bold leading-tight tracking-tight text-[var(--text-primary)] text-balance drop-shadow-sm lg:text-[2.45rem] lg:tracking-[-0.045em] transition-colors duration-200">
          Welcome back
        </h2>
        <p ref={subtitleRef} className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)] font-medium lg:mt-3 lg:max-w-sm transition-colors duration-200">
          Sign in to access your monitoring dashboard.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-7 flex items-start gap-3 rounded-[8px] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 animate-fade-in">
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-error)]" />
          <p className="text-[13px] font-medium leading-6 text-[var(--color-error)]">
            {error}
          </p>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="mb-7 flex items-start gap-3 rounded-[8px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4 animate-fade-in">
          <CheckCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-success)]" />
          <p className="text-[13px] font-medium leading-6 text-[var(--color-success)]">
            {success}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="mb-8 border-t border-[var(--border-subtle)] lg:border-[var(--border-default)]" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              ref={emailLabelRef}
              className="mb-2.5 block text-[13px] font-semibold text-[var(--text-primary)]/80 transition-colors duration-200"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                {...register("email")}
                ref={(e) => {
                  register("email").ref(e);
                  emailInputRef.current = e;
                }}
                className={`control-field w-full px-4 py-3.5 text-[13px] font-medium lg:h-[48px] lg:rounded-[8px] transition-colors duration-200 ${
                  errors.email
                    ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] pr-10"
                    : ""
                }`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-error)]" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-[13px] font-medium text-[var(--color-error)] animate-fade-in">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label
                htmlFor="password"
                ref={passwordLabelRef}
                className="block text-[13px] font-semibold text-[var(--text-primary)]/80 transition-colors duration-200"
              >
                Password
              </label>
              <button
                type="button"
                ref={forgotPasswordRef}
                onClick={handleForgotPassword}
                className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-200"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                ref={(e) => {
                  register("password").ref(e);
                  passwordInputRef.current = e;
                }}
                className={`control-field w-full px-4 py-3.5 pr-12 text-[13px] font-medium lg:h-[48px] lg:rounded-[8px] transition-colors duration-200 ${
                  errors.password
                    ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]"
                    : ""
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--text-quaternary)] transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-default)]"
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
              <p className="mt-2 text-[13px] font-medium text-[var(--color-error)] animate-fade-in">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary mt-8 flex w-full items-center justify-center gap-2.5 px-5 py-4 text-[15px] font-bold lg:h-[48px] rounded-[8px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
              <span ref={signInTextRef} className="transition-colors duration-200">Signing in…</span>
            </>
          ) : (
            <>
              <span ref={signInTextRef} className="transition-colors duration-200">Sign In</span>
              <ArrowRight className="h-[18px] w-[18px]" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
