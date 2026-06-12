import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, CheckCircle, Save, KeyRound, User as UserIcon, ShieldCheck } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export function Profile() {
  const { userData, currentUser, saveDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(userData?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess(false);

    try {
      await saveDisplayName(displayName);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setOldPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setPasswordError("Incorrect old password");
      } else {
        setPasswordError(err.message || "Failed to update password");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = userData?.role
    ?.split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "End User";

  return (
    <div className="animate-fade-in p-[32px] mx-auto max-w-3xl space-y-8">
      {/* Profile header with avatar */}
      <section className="surface-panel rounded-[14px] p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-red-500 to-amber-400 text-xl font-bold text-white shadow-lg shadow-red-950/40 ring-1 ring-white/10">
            {userData?.displayName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-[#f0ede8]">Your Profile</h1>
            <p className="mt-1 text-[13px] text-[#7a7773]">Manage your personal settings and security</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <div className="surface-panel rounded-[14px] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <UserIcon className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">Personal Details</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {profileError && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" /> {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" /> Profile updated successfully
              </div>
            )}
            
            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">Email</label>
              <input
                type="text"
                value={userData?.email || ""}
                disabled
                className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] opacity-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">Role</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={roleLabel}
                  disabled
                  className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] opacity-50 cursor-not-allowed"
                />
                <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[6px] border border-amber-300/20 bg-amber-400/10 text-amber-200">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex h-[32px] mt-6 w-full items-center justify-center gap-2 rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="surface-panel rounded-[14px] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-amber-300/20 bg-amber-400/10 text-amber-200">
              <KeyRound className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">Security</h2>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {passwordError && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" /> {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" /> Password updated successfully
              </div>
            )}

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword || !oldPassword || !newPassword}
              className="flex h-[32px] mt-6 w-full items-center justify-center gap-2 rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="h-4 w-4" />
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
