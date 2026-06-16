import { CheckCircle2, Info, XCircle } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

interface ToastsProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={`toast toast--${t.kind}`}
            role="status"
            onClick={() => onDismiss(t.id)}
          >
            <Icon size={18} className="toast-icon" />
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
