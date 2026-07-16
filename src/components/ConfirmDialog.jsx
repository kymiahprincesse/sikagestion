import { AlertTriangle, Trash2, Info, AlertCircle } from 'lucide-react';

export default function ConfirmDialog({ 
  isOpen = true,
  title = 'Confirmation',
  message, 
  type = 'warning',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm, 
  onCancel 
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-rouge" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-rouge-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-bleu" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-rouge/10';
      case 'warning':
        return 'bg-rouge-100';
      case 'info':
        return 'bg-blue-100';
      default:
        return 'bg-bleu/10';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-rouge hover:bg-rouge/90 text-white';
      case 'warning':
        return 'bg-rouge-600 hover:bg-rouge-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-bleu hover:bg-bleu/90 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-navy/80" onClick={onCancel}></div>
      
      <div className="relative bg-surface rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-in">
        <div className="mb-6">
          <div className={`w-12 h-12 ${getIconBg()} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-navy text-center mb-2">{title}</h3>
          <p className="text-bleu text-center">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-argent text-gray-700 rounded-lg font-medium hover:bg-argent/80 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${getConfirmButtonStyle()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
