import type { ToastItem } from '../../hooks/useToasts';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div className={`toast toast-${toast.type}${toast.visible ? ' show' : ''}`}>
      <div className="toast-icon">
        {toast.type === 'success' ? (
          <svg viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke="currentColor"
            />
          </svg>
        )}
      </div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <div className="toast-close" onClick={() => onDismiss(toast.id)}>
        <svg viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" />
        </svg>
      </div>
    </div>
  );
}
