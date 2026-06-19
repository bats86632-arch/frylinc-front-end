import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertCircle,
  CheckCircle,
  Save,
  KeyRound,
  User as UserIcon,
  ShieldCheck,
  Camera,
} from "lucide-react";
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { storage, auth } from "../config/firebase";

export function Profile() {
  const { userData, currentUser, saveDisplayName, updateProfile } = useAuth();

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(userData?.firstName || "");
  const [lastName, setLastName] = useState(userData?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || "");
  const [companyName, setCompanyName] = useState(userData?.companyName || "");
  const [companyRole, setCompanyRole] = useState(userData?.companyRole || "");
  const [employeeId, setEmployeeId] = useState(userData?.employeeId || "");
  const [dateOfBirth, setDateOfBirth] = useState(userData?.dateOfBirth || "");

  // ── Photo ───────────────────────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(
    userData?.photoURL || "",
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Profile save state ──────────────────────────────────────────────────────
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Password state ──────────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const roleLabel =
    userData?.role
      ?.split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "End User";

  // ── Photo handling ───────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess(false);

    try {
      let photoURL = userData?.photoURL || "";

      if (photoFile && currentUser) {
        setUploadingPhoto(true);
        const photoStorageRef = storageRef(
          storage,
          `user-photos/${currentUser.uid}/profile.jpg`,
        );
        await uploadBytes(photoStorageRef, photoFile);
        photoURL = await getDownloadURL(photoStorageRef);
        setUploadingPhoto(false);
      }

      const displayName =
        `${firstName.trim()} ${lastName.trim()}`.trim() ||
        userData?.displayName ||
        "";

      await updateProfile({
        displayName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        companyName: companyName.trim(),
        companyRole: companyRole.trim(),
        employeeId: employeeId.trim(),
        dateOfBirth: dateOfBirth.trim(),
        photoURL,
      });

      setPhotoFile(null);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setUploadingPhoto(false);
      const error = err as { message?: string };
      setProfileError(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Update password ──────────────────────────────────────────────────────────
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
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        oldPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setOldPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "auth/invalid-credential") {
        setPasswordError("Incorrect old password");
      } else {
        setPasswordError(error.message || "Failed to update password");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!currentUser || !currentUser.email) return;
    setSendingResetEmail(true);
    setResetPasswordError("");
    setResetPasswordSuccess(false);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetPasswordSuccess(true);
      setTimeout(() => setResetPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setResetPasswordError(error.message || "Failed to send reset email");
    } finally {
      setSendingResetEmail(false);
    }
  };

  // ── Reusable field components ────────────────────────────────────────────────
  const ReadOnlyField = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }) => (
    <div>
      <label className="block text-[13px] text-[#7a7773] mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          disabled
          className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px] opacity-50 cursor-not-allowed"
        />
        {icon && (
          <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[6px] border border-amber-300/20 bg-amber-400/10 text-amber-200">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  const EditableField = ({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-[13px] text-[#7a7773] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
      />
    </div>
  );

  return (
    <div className="animate-fade-in p-[32px] space-y-8">
      {/* ── Profile header ──────────────────────────────────────────────────── */}
      <section className="surface-panel rounded-[14px] p-6">
        <div className="flex items-center gap-5">
          {/* Avatar with camera overlay */}
          <div className="relative inline-block shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full overflow-hidden ring-2 ring-white/10 shadow-lg">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500 to-amber-400 text-3xl font-bold text-white">
                  {(
                    userData?.firstName?.charAt(0) ||
                    userData?.displayName?.charAt(0) ||
                    "U"
                  ).toUpperCase()}
                </div>
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[#1a1816] text-white/70 shadow-md transition-colors hover:bg-white/10 hover:text-white"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Name / subtitle */}
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-[#f0ede8]">
              {firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : userData?.displayName || "Your Profile"}
            </h1>
            <p className="mt-1 text-[13px] text-[#7a7773]">
              Manage your personal settings and security
            </p>
            {photoFile && (
              <p className="mt-1 text-[12px] text-amber-300/80">
                New photo selected — save profile to apply
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Personal Details */}
        <div className="surface-panel rounded-[14px] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              <UserIcon className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
              Personal Details
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {profileError && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Profile updated successfully
              </div>
            )}

            {/* First Name + Last Name — two columns */}
            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="First name"
              />
              <EditableField
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Last name"
              />
            </div>

            {/* Role (read-only) */}
            <ReadOnlyField
              label="Role"
              value={roleLabel}
              icon={<ShieldCheck className="h-4 w-4" />}
            />

            {/* Email (read-only) */}
            <ReadOnlyField
              label="Email Address"
              value={userData?.email || ""}
            />

            {/* Phone Number */}
            <EditableField
              label="Phone Number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              type="tel"
              placeholder="+1 (555) 000-0000"
            />

            {/* Company Name */}
            <EditableField
              label="Company Name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Your organisation"
            />

            {/* Company Role */}
            <EditableField
              label="Company Role"
              value={companyRole}
              onChange={setCompanyRole}
              placeholder="e.g., Fire Safety Manager"
            />

            {/* Employee ID */}
            <EditableField
              label="Employee ID"
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="e.g., EMP-00123"
            />

            {/* Date of Birth */}
            <EditableField
              label="Date of Birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              type="date"
            />

            <button
              type="submit"
              disabled={savingProfile || uploadingPhoto}
              className="flex h-[32px] mt-6 w-full items-center justify-center gap-2 rounded-[6px] border border-white/[0.08] bg-white/[0.04] text-[13px] text-[#f0ede8] transition-all hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {uploadingPhoto
                ? "Uploading photo…"
                : savingProfile
                  ? "Saving…"
                  : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="surface-panel rounded-[14px] p-6 self-start">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-amber-300/20 bg-amber-400/10 text-amber-200">
              <KeyRound className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[#f0ede8] opacity-50">
              Security
            </h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {passwordError && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Password updated successfully
              </div>
            )}

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="control-field w-full rounded-[6px] px-3 h-[36px] text-[13px]"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#7a7773] mb-2">
                New Password
              </label>
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

          <div className="pt-6 mt-6 border-t border-white/[0.06]">
            <h3 className="text-[13px] font-semibold text-[#f0ede8] mb-1">Forgot your password?</h3>
            <p className="text-[12px] text-[#7a7773] mb-4">
              We'll send you an email with a secure link to reset your password.
            </p>
            
            {resetPasswordError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-[10px] text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {resetPasswordError}
              </div>
            )}
            {resetPasswordSuccess && (
              <div className="mb-4 flex items-center gap-2.5 rounded-[10px] text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Password reset email sent successfully
              </div>
            )}

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={sendingResetEmail}
              className="flex h-[32px] w-full items-center justify-center gap-2 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 text-[13px] font-medium text-amber-200 transition-all hover:bg-amber-500/20 disabled:opacity-50"
            >
              {sendingResetEmail ? "Sending..." : "Send Password Reset Email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
