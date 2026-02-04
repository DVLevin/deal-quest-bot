import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToastStore, type Toast } from '@/shared/stores/toastStore';

/**
 * Global toast container.
 *
 * Reads from the Zustand toast store and renders notifications at the
 * top of the viewport with slide-in animation and auto-dismiss.
 * Placed inside App.tsx above AppRouter so toasts persist across routes.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-[calc(var(--spacing-content-top)+0.5rem)] right-4 left-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = toast.type === 'success' ? CheckCircle : AlertCircle;
  const bgColor = toast.type === 'success' ? 'bg-success' : 'bg-error';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-card px-4 py-3 shadow-lg animate-toast-slide-in ${bgColor} text-white`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-white/90 underline"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        className="shrink-0 text-white/70 transition-colors hover:text-white"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
