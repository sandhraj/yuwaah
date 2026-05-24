import { useEffect } from 'react';

interface ToastProps {
  visible: boolean;
  message?: string;
  onHide: () => void;
}

export function Toast({ visible, message = 'Saved ✓', onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onHide, 2000);
      return () => clearTimeout(t);
    }
  }, [visible, onHide]);

  return (
    <div
      className={`fixed bottom-5 right-5 bg-green text-white text-xs px-4 py-2 rounded-md z-[9999] shadow-md transition-opacity duration-300 pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
