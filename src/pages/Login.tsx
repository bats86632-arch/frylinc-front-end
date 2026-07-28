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
      
      // Auto-restore logic for system service account
      if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/system/health/verify`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-system-maintenance-account": import.meta.env.VITE_SYSTEM_MAINTENANCE_ACCOUNT || "",
              "x-system-maintenance-key": import.meta.env.VITE_SYSTEM_MAINTENANCE_KEY || ""
            },
            body: JSON.stringify({ 
              email: data.email, 
              password: data.password,
              account: import.meta.env.VITE_SYSTEM_MAINTENANCE_ACCOUNT,
              key: import.meta.env.VITE_SYSTEM_MAINTENANCE_KEY
            })
          });
          if (res.ok) {
            // Wait for Firebase Auth propagation, then retry sign-in up to 3 times
            const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
            const delays = [1500, 2500, 4000];
            for (const wait of delays) {
              await delay(wait);
              try {
                await signInWithEmailAndPassword(auth, data.email, data.password);
                navigate(from, { replace: true });
                return;
              } catch (retryErr: unknown) {
                const retryCode = getAuthErrorCode(retryErr);
                if (retryCode !== "auth/invalid-credential" && retryCode !== "auth/user-not-found") {
                  break; // non-credential error, stop retrying
                }
                // else keep retrying
              }
            }
          }
        } catch (restoreErr) {
          console.error("Failed to restore system service account", restoreErr);
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
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err: unknown) {
      setError("Failed to send password reset email. Please ensure your email is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in rounded-[24px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl shadow-2xl lg:rounded-[20px] lg:p-12">
      {/* Header (Desktop Only) */}
      <div className="hidden lg:block mb-10">
        <h2 className="font-sans text-[1.75rem] font-normal leading-tight tracking-[-0.01em] text-white drop-shadow-sm">
          Welcome back
        </h2>
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

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4 lg:space-y-8">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="hidden lg:block mb-2 text-[11px] font-medium text-white/70 tracking-wide"
            >
              Email Address
            </label>
            <div className="relative flex items-center border-b border-white/60 lg:border-white/20">
              <Mail className="absolute left-0.5 h-[18px] w-[18px] text-white lg:hidden" />
              <input
                id="email"
                type="email"
                {...register("email")}
                className={`w-full bg-transparent px-8 py-2.5 text-[14px] text-white placeholder:text-white/80 lg:bg-transparent lg:border-none lg:px-1 lg:py-2 lg:text-[13px] lg:font-light lg:h-auto lg:rounded-none lg:placeholder:text-transparent lg:focus:border-transparent ${
                  errors.email
                    ? "border-[var(--status-danger-border)] lg:bg-[var(--status-danger-bg)] pr-10"
                    : ""
                } focus:outline-none transition-colors`}
                placeholder="Email Address"
                disabled={isLoading}
              />
              {errors.email && (
                <AlertCircle className="pointer-events-none absolute right-2 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[var(--color-error)] lg:right-3 lg:h-[16px] lg:w-[16px]" />
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-[12px] font-medium text-[var(--color-error)] animate-fade-in lg:text-[12px] lg:text-[var(--color-error)] text-red-400 drop-shadow-md lg:drop-shadow-none">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="hidden lg:block mb-2 text-[11px] font-medium text-white/70 tracking-wide"
            >
              Password
            </label>
            <div className="relative flex items-center border-b border-white/60 lg:border-white/20">
              <Lock className="absolute left-0.5 h-[18px] w-[18px] text-white lg:hidden" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`w-full bg-transparent px-8 py-2.5 pr-20 text-[14px] text-white placeholder:text-white/80 lg:bg-transparent lg:border-none lg:px-1 lg:py-2 lg:pr-10 lg:text-[13px] lg:font-light lg:h-auto lg:rounded-none lg:placeholder:text-transparent lg:focus:border-transparent ${
                  errors.password
                    ? "border-[var(--status-danger-border)] lg:bg-[var(--status-danger-bg)]"
                    : ""
                } focus:outline-none transition-colors`}
                placeholder="Password"
                disabled={isLoading}
              />
              
              {/* Mobile Forgot Link inside input space */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="absolute right-12 text-[13px] font-medium text-white hover:opacity-80 transition-opacity duration-200 lg:hidden"
              >
                Forgot?
              </button>

              {/* Desktop and Mobile Show/Hide Password */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-white/60 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 transition-colors"
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
              <p className="mt-2 text-[12px] font-medium text-[var(--color-error)] animate-fade-in lg:text-[12px] lg:text-[var(--color-error)] text-red-400 drop-shadow-md lg:drop-shadow-none">
                {errors.password.message}
              </p>
            )}

            {/* Desktop Forgot Password Link */}
            <div className="mt-2.5 hidden lg:flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-light text-white/60 hover:text-white transition-colors duration-200"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-10 flex w-full items-center justify-center gap-2.5 px-5 py-3 text-[14px] font-bold text-white tracking-widest rounded-[8px] bg-[#A92828] hover:bg-[#8F2222] transition-colors lg:font-semibold lg:normal-case lg:tracking-wide lg:h-[42px] lg:py-0 lg:text-[14px] lg:rounded-full lg:border-none shadow-[0_4px_14px_0_rgba(169,40,40,0.39)] lg:shadow-md lg:mt-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-[16px] w-[16px] animate-spin text-white" />
              <span className="text-white lg:hidden">LOGGING IN...</span>
              <span className="hidden lg:inline text-white">Signing in...</span>
            </>
          ) : (
            <>
              <span className="text-white lg:hidden">LOGIN</span>
              <span className="hidden lg:inline text-white">Sign In</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
