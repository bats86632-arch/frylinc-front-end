import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, CheckCircle, Save, KeyRound, User as UserIcon } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="surface-panel rounded-lg p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-white">Your Profile</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your personal settings</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <div className="surface-panel rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Personal Details</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileError && (
              <div className="flex items-center gap-2 rounded text-sm text-red-300 bg-red-500/10 p-3">
                <AlertCircle className="h-4 w-4" /> {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2 rounded text-sm text-emerald-300 bg-emerald-500/10 p-3">
                <CheckCircle className="h-4 w-4" /> Profile updated successfully
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="text"
                value={userData?.email || ""}
                disabled
                className="control-field w-full rounded-lg px-4 py-2.5 text-sm opacity-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
              <input
                type="text"
                value={userData?.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || ""}
                disabled
                className="control-field w-full rounded-lg px-4 py-2.5 text-sm opacity-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="control-field w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold w-full"
            >
              <Save className="h-4 w-4" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="surface-panel rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-400" /> Security
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 rounded text-sm text-red-300 bg-red-500/10 p-3">
                <AlertCircle className="h-4 w-4" /> {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded text-sm text-emerald-300 bg-emerald-500/10 p-3">
                <CheckCircle className="h-4 w-4" /> Password updated successfully
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="control-field w-full rounded-lg px-4 py-2.5 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="control-field w-full rounded-lg px-4 py-2.5 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword || !oldPassword || !newPassword}
              className="btn-secondary mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold w-full disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
