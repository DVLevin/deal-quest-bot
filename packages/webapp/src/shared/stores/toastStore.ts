/**
 * Zustand toast store.
 *
 * Manages a stack of toast notifications with auto-dismiss.
 * Maximum 3 visible toasts -- oldest is shifted when exceeded.
 */

import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const newToast: Toast = { ...toast, id };

    set((state) => {
      const next = [...state.toasts, newToast];
      // Keep at most 3 visible toasts -- drop the oldest
      if (next.length > 3) next.shift();
      return { toasts: next };
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/**
 * Convenience hook for triggering toasts.
 *
 * @example
 * const { toast } = useToast();
 * toast({ type: 'success', message: 'Lead saved!' });
 */
export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  return { toast: addToast };
}
