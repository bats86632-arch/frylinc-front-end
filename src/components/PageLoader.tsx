import { Loader2 } from 'lucide-react';

export const PageLoader = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0e]">
      <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
    </div>
  );
};
