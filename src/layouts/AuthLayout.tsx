import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-[#0b1120] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle radial gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />

      {/* Centered content */}
      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </div>
  );
}
