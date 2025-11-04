import React from 'react';
import { AlertTriangle, X, Trash2, CheckCircle } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger', 'warning', 'info'
  isLoading = false
}) => {
  if (!isOpen) return null;

  const types = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      confirmBg: 'from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      confirmBg: 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
    },
    info: {
      icon: CheckCircle,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      confirmBg: 'from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
    }
  };

  const config = types[type] || types.danger;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998] p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-full max-w-md mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/20">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-lg ${config.iconBg}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {title}
              </h3>
              {message && (
                <p className="text-sm text-blue-200/80">
                  {message}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-transparent border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ripple"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 bg-gradient-to-r ${config.confirmBg} text-white rounded-lg font-medium transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ripple flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add scale-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }
`;
document.head.appendChild(style);

export default ConfirmDialog;
