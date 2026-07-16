import { useNotificationsStore } from '../store/useNotificationsStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, supprimerToast } = useNotificationsStore();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-rouge-500" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-surface border-l-4 border-l-green-500 border border-green-200 shadow-xl';
      case 'error':
        return 'bg-surface border-l-4 border-l-red-500 border border-red-200 shadow-xl';
      case 'warning':
        return 'bg-surface border-l-4 border-l-orange-500 border border-rouge-200 shadow-xl';
      case 'info':
      default:
        return 'bg-surface border-l-4 border-l-blue-500 border border-blue-200 shadow-xl';
    }
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm pointer-events-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg ${getStyles(toast.type)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 text-sm text-gray-800 font-medium leading-snug">
            {toast.message}
          </div>
          <button
            onClick={() => supprimerToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
