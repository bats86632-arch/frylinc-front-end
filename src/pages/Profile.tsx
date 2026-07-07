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
  Loader2,
  Building,
} from "lucide-react";
import {
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
import { CompanyService } from "../api/CompanyService";
import { useCompanies } from "../hooks/useCompanies";

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
    <label className="block text-[13px] text-[var(--text-secondary)] mb-2">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        disabled
        className="control-field w-full rounded-[8px] px-3 h-[36px] text-[13px] opacity-50 cursor-not-allowed bg-[var(--surface-overlay)]"
      />
      {icon && (
        <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--accent)]">
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
  onBlur,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) => (
  <div>
    <label className="block text-[13px] text-[var(--text-secondary)] mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`control-field w-full rounded-[8px] px-3 h-[36px] text-[13px] ${error ? "border-[var(--status-danger-border)] focus:border-[var(--color-error)]" : ""}`}
    />
    {error && <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{error}</p>}
  </div>
);

export function Profile() {
  const { userData, currentUser, updateProfile } = useAuth();

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(userData?.firstName || "");
  const [lastName, setLastName] = useState(userData?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || "+91 ");
  const [companyName, setCompanyName] = useState(userData?.companyName || "");
  const [companyRole, setCompanyRole] = useState(userData?.companyRole || "");
  const [employeeId, setEmployeeId] = useState(userData?.employeeId || "");
  const [dateOfBirth, setDateOfBirth] = useState(userData?.dateOfBirth || "");

  // ── Photo ───────────────────────────────────────────────────────────────────

  const [photoPreview, setPhotoPreview] = useState<string>(
    userData?.photoURL || "",
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Company Photo ───────────────────────────────────────────────────────────
  const { companies, reloadCompanies } = useCompanies();
  const myCompany = companies.find(c => c.id === userData?.companyId);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState("");
  const [companyLogoSuccess, setCompanyLogoSuccess] = useState(false);

  // ── Profile save state ──────────────────────────────────────────────────────
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Immediately upload and save photo
    if (currentUser) {
      setUploadingPhoto(true);
      const photoStorageRef = storageRef(
        storage,
        `user-photos/${currentUser.uid}/profile.jpg`,
      );
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        const options = {
          maxSizeMB: 0.2, // 200kb
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        await uploadBytes(photoStorageRef, compressedFile);
      } catch (error) {
        console.error("Compression failed, uploading original:", error);
        await uploadBytes(photoStorageRef, file);
      }
      const photoURL = await getDownloadURL(photoStorageRef);
      await updateProfile({ photoURL });
      setUploadingPhoto(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  const handleCompanyLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myCompany || !userData?.companyId) return;

    if (!file.type.startsWith("image/")) {
      setCompanyLogoError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCompanyLogoError("Image must be less than 5MB");
      return;
    }

    setUploadingCompanyLogo(true);
    setCompanyLogoError("");
    setCompanyLogoSuccess(false);

    try {
      const fileRef = storageRef(storage, `companies/logos/${Date.now()}_${file.name}`);
      let fileToUpload = file;
      try {
        const imageCompression = (await import("browser-image-compression")).default;
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
        fileToUpload = await imageCompression(file, options);
      } catch (err) {
        console.error("Compression failed", err);
      }
      
      await uploadBytes(fileRef, fileToUpload);
      const logoUrl = await getDownloadURL(fileRef);
      
      await CompanyService.updateCompany(userData.companyId, { logoUrl });
      await reloadCompanies();
      
      setCompanyLogoSuccess(true);
      setTimeout(() => setCompanyLogoSuccess(false), 3000);
    } catch (err: any) {
      setCompanyLogoError(err.message || "Failed to upload organization logo");
    } finally {
      setUploadingCompanyLogo(false);
    }
  };

  // ── Save profile ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (savingProfile) return;

    const errors: Record<string, string> = {};
    if (firstName.trim().length === 0) {
      errors.firstName = "First name cannot be empty";
    }
    if (lastName.trim().length === 0) {
      errors.lastName = "Last name cannot be empty";
    }
    if (phoneNumber.trim().length > 0) {
      if (!phoneNumber.trim().startsWith("+")) {
        errors.phoneNumber = "Must include country code (e.g., +91)";
      } else if (!/^\+\d{6,15}$/.test(phoneNumber.trim().replace(/[\s-]/g, ""))) {
        errors.phoneNumber = "Invalid phone number format";
      }
    }
    
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSavingProfile(false);
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess(false);

    try {
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
      });

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
      console.log(`[DEBUG] Attempting to send password reset email to: ${currentUser.email}`);
      await sendPasswordResetEmail(auth, currentUser.email);
      console.log(`[DEBUG] Firebase confirmed password reset email sent successfully to: ${currentUser.email}`);
      setResetPasswordSuccess(true);
      setTimeout(() => setResetPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("[DEBUG] Error sending password reset email:", err);
      const error = err as { message?: string };
      setResetPasswordError(error.message || "Failed to send reset email");
    } finally {
      setSendingResetEmail(false);
    }
  };

  return (
    <div className="animate-fade-in p-[32px] space-y-8">
      {/* ── Profile header ──────────────────────────────────────────────────── */}
      <section className="surface-panel rounded-[16px] p-6 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-5">
          {/* Avatar with camera overlay */}
          <div className="relative inline-block shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full overflow-hidden border-2 border-[var(--border-subtle)] shadow-sm bg-[var(--surface-raised)]">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[32px] font-bold text-[var(--text-secondary)]">
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
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
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
            <h1 className="font-sans text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
              {firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : userData?.displayName || "Your Profile"}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Manage your personal settings and security
            </p>
          </div>
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Personal Details */}
        <div className="surface-panel rounded-[16px] p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              <UserIcon className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
              Personal Details
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {profileError && (
              <div className="flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-error)] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-success)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-3.5 animate-fade-in">
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
                error={fieldErrors.firstName}
              />
              <EditableField
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Last name"
                error={fieldErrors.lastName}
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
              error={fieldErrors.phoneNumber}
            />

            {/* Company Name */}
            <EditableField
              label="Organization Name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Your organisation"
              error={fieldErrors.companyName}
            />

            {/* Organization Role */}
            <EditableField
              label="Organization Role"
              value={companyRole}
              onChange={setCompanyRole}
              placeholder="e.g., Fire Safety Manager"
              error={fieldErrors.companyRole}
            />

            {/* Employee ID */}
            <EditableField
              label="Employee ID"
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="e.g., EMP-00123"
              error={fieldErrors.employeeId}
            />

            {/* Date of Birth */}
            <EditableField
              label="Date of Birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              type="date"
              error={fieldErrors.dateOfBirth}
            />

            <button
              type="submit"
              disabled={savingProfile || uploadingPhoto}
              className="flex h-[36px] mt-6 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--accent)] text-[13px] font-medium text-white transition-all hover:bg-[#155b76] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="surface-panel rounded-[16px] p-6 border border-[var(--border-subtle)] self-start">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              <KeyRound className="h-[18px] w-[18px]" />
            </div>
            <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
              Security
            </h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {passwordError && (
              <div className="flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-error)] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-success)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Password updated successfully
              </div>
            )}

            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="control-field w-full rounded-[8px] px-3 h-[36px] text-[13px]"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] text-[var(--text-secondary)] mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="control-field w-full rounded-[8px] px-3 h-[36px] text-[13px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword || !oldPassword || !newPassword}
              className="flex h-[36px] mt-6 w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[13px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="h-4 w-4" />
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-[var(--border-subtle)]">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">Forgot your password?</h3>
            <p className="text-[12px] text-[var(--text-secondary)] mb-4">
              We'll send you an email with a secure link to reset your password.
            </p>
            
            {resetPasswordError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-error)] bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {resetPasswordError}
              </div>
            )}
            {resetPasswordSuccess && (
              <div className="mb-4 flex items-center gap-2.5 rounded-[12px] text-[13px] text-[var(--color-success)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] p-3.5 animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Password reset email sent successfully
              </div>
            )}

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={sendingResetEmail}
              className="flex h-[36px] w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-4 text-[13px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] disabled:opacity-50"
            >
              {sendingResetEmail ? "Sending..." : "Send Password Reset Email"}
            </button>
          </div>
        </div>

        {/* Organization Profile (Head Office only) */}
        {userData?.role === "head_office" && myCompany && (
          <div className="surface-panel rounded-[16px] p-6 border border-[var(--border-subtle)] lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                <Building className="h-[18px] w-[18px]" />
              </div>
              <h2 className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)] opacity-50">
                Organization Profile
              </h2>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative inline-block shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-[12px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  {myCompany.logoUrl ? (
                    <img src={myCompany.logoUrl} alt={myCompany.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[24px] font-bold text-[var(--text-secondary)]">
                      {myCompany.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="company-logo-upload"
                  className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  title="Change organization logo"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  id="company-logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCompanyLogoChange}
                  disabled={uploadingCompanyLogo}
                />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{myCompany.name}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage your organization's logo</p>
                
                {companyLogoError && <p className="mt-2 text-[13px] text-[var(--color-error)]">{companyLogoError}</p>}
                {companyLogoSuccess && <p className="mt-2 text-[13px] text-[var(--color-success)]">Logo updated successfully</p>}
                {uploadingCompanyLogo && <p className="mt-2 text-[13px] text-[var(--text-secondary)] flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Uploading...</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
