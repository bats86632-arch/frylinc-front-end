import { useEffect, useRef } from "react";

// Shared canvas and context for all hook instances
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;
let activeSubscribers = new Set<() => void>();
let animationFrameId: number | null = null;
let lastSampleTime = 0;

// Throttle sampling to ~5 FPS to save CPU/GPU (200ms interval)
const SAMPLE_INTERVAL_MS = 200;

function getSharedCanvas() {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCtx = sharedCanvas.getContext("2d", { willReadFrequently: true });
  }
  return { canvas: sharedCanvas, ctx: sharedCtx };
}

function startSamplingLoop() {
  if (animationFrameId !== null) return;

  const loop = (timestamp: number) => {
    if (timestamp - lastSampleTime >= SAMPLE_INTERVAL_MS) {
      lastSampleTime = timestamp;
      // Notify all active hooks to sample their regions
      activeSubscribers.forEach((subscriber) => subscriber());
    }
    animationFrameId = requestAnimationFrame(loop);
  };
  
  animationFrameId = requestAnimationFrame(loop);
}

function stopSamplingLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Convert RGB to relative luminance (0-1)
function calculateLuminance(r: number, g: number, b: number) {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;

  const R = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const G = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const B = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function useAdaptiveTextColor(
  elementRef: React.RefObject<HTMLElement | SVGElement>,
  backgroundSourceRef: React.RefObject<HTMLImageElement | HTMLVideoElement | null>
) {
  const lastColorRef = useRef<string | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    
    if (!el) return;

    const sampleRegion = () => {
      if (!elementRef.current || !backgroundSourceRef.current) return;
      
      const element = elementRef.current;
      const bgElement = backgroundSourceRef.current;
      
      const { canvas, ctx } = getSharedCanvas();
      if (!ctx || !canvas) return;

      // Ensure canvas matches the displayed dimensions of the background element
      const bgRect = bgElement.getBoundingClientRect();
      if (bgRect.width === 0 || bgRect.height === 0) return;
      
      if (canvas.width !== bgRect.width || canvas.height !== bgRect.height) {
        canvas.width = bgRect.width;
        canvas.height = bgRect.height;
      }

      try {
        // Draw the current frame of the background onto the canvas
        // This handles <img>, <video>, and <canvas> uniformly
        ctx.drawImage(bgElement, 0, 0, bgRect.width, bgRect.height);

        // Get the bounding rect of the text element relative to the viewport
        const elRect = element.getBoundingClientRect();
        
        // Calculate coordinates relative to the background element/canvas
        const x = Math.max(0, elRect.left - bgRect.left);
        const y = Math.max(0, elRect.top - bgRect.top);
        
        // Ensure we don't sample outside the canvas bounds
        const sampleWidth = Math.min(elRect.width, bgRect.width - x);
        const sampleHeight = Math.min(elRect.height, bgRect.height - y);
        
        if (sampleWidth <= 0 || sampleHeight <= 0) return;

        // Sample the pixels
        const imageData = ctx.getImageData(x, y, sampleWidth, sampleHeight);
        const data = imageData.data;
        
        if (data.length === 0) return;

        // Calculate average luminance of the region
        let totalLuminance = 0;
        let pixelCount = 0;
        
        // Sample every 4th pixel to save CPU
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 0) { // Ignore transparent pixels
            totalLuminance += calculateLuminance(r, g, b);
            pixelCount++;
          }
        }
        
        if (pixelCount === 0) return;
        
        const avgLuminance = totalLuminance / pixelCount;
        
        // Map luminance to color: default to black, switch to white ONLY if background is very dark.
        let targetIntensity = 0; // default black
        
        if (avgLuminance < 0.1) {
          // Background is very dark
          targetIntensity = 255;
        }

        const newColor = `rgb(${targetIntensity}, ${targetIntensity}, ${targetIntensity})`;
        
        // Only update DOM if the color actually changed
        if (lastColorRef.current !== newColor) {
          element.style.color = newColor;
          lastColorRef.current = newColor;
          // Clear any fallback blend mode
          element.style.mixBlendMode = "normal"; 
        }

      } catch (e) {
        // Fallback for CORS taint (e.g. getImageData blocked)
        console.warn("[AdaptiveTextColor] Sampling failed, falling back to mix-blend-mode", e);
        element.style.color = "white";
        element.style.mixBlendMode = "difference";
        // Remove from loop so we don't keep throwing errors
        activeSubscribers.delete(sampleRegion);
      }
    };

    // Set initial color to black instantly before any sampling occurs to prevent white flashes
    if (lastColorRef.current === null) {
      el.style.color = "black";
      lastColorRef.current = "black";
    }

    // Apply smooth color transition on the next frame so the initial black is instant
    requestAnimationFrame(() => {
      if (el) el.style.transition = "color 200ms ease";
    });

    activeSubscribers.add(sampleRegion);
    if (activeSubscribers.size === 1) {
      startSamplingLoop();
    }

    // Pause sampling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopSamplingLoop();
      } else {
        if (activeSubscribers.size > 0) startSamplingLoop();
      }
    };
    
    // Also re-sample on resize since element positions might change
    const handleResize = () => {
      // Debounce slightly
      setTimeout(() => {
        if (activeSubscribers.has(sampleRegion)) {
          sampleRegion();
        }
      }, 100);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize);

    // Initial sample
    // Wait a tick for layout to settle
    setTimeout(() => {
      sampleRegion();
    }, 100);

    return () => {
      activeSubscribers.delete(sampleRegion);
      if (activeSubscribers.size === 0) {
        stopSamplingLoop();
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
    };
  }, [elementRef, backgroundSourceRef]);
}
