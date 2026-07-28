import { AlertTriangle, X } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  title = "Emin misiniz?", 
  message, 
  confirmText = "Onayla", 
  cancelText = "İptal", 
  showCancel = true,
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-brand-primary/10 animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 text-brand-dark">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <button onClick={onCancel} className="text-brand-dark/40 hover:text-brand-dark transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-brand-dark/70 text-sm leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex gap-3 justify-end">
            {showCancel && (
              <button 
                onClick={onCancel}
                className="px-4 py-2 font-bold text-sm text-brand-dark bg-brand-light/50 hover:bg-brand-light rounded-xl transition-all"
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={onConfirm}
              className="px-4 py-2 font-bold text-sm text-white bg-brand-primary hover:bg-brand-primary/80 rounded-xl transition-all shadow-md shadow-brand-primary/20"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
