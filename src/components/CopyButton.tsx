import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  iconClassName?: string;
  title?: string;
  onCopy?: () => void;
}

export function CopyButton({ 
  textToCopy, 
  className = "text-[var(--text-secondary)] shrink-0 hover:text-[var(--text-primary)] transition-colors", 
  iconClassName = "h-3.5 w-3.5",
  title = "Copy",
  onCopy
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (onCopy) {
      onCopy();
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      title={copied ? "Copied!" : title}
    >
      {copied ? <Check className={iconClassName} /> : <Copy className={iconClassName} />}
    </button>
  );
}
