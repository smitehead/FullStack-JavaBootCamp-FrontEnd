import React, { useState, useEffect } from 'react';
import { BsExclamationTriangle } from 'react-icons/bs';

interface ConfirmModalProps {
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  subMessage,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-150">
        {variant === 'danger' && (
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <BsExclamationTriangle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        )}
        <p className="text-base font-bold text-gray-900 text-center leading-snug">{message}</p>
        {subMessage && (
          <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed">{subMessage}</p>
        )}
        <div className="flex gap-3 mt-7">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 ${
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100'
                : 'bg-gray-900 hover:bg-black shadow-lg shadow-gray-900/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmOptions {
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  onConfirm: () => void;
}

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState | null>(null);

  const showConfirm = (message: string, onConfirm: () => void, options?: ConfirmOptions) => {
    setState({ message, onConfirm, ...options });
  };

  const ConfirmDialog = state ? (
    <ConfirmModal
      message={state.message}
      subMessage={state.subMessage}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      onConfirm={() => { state.onConfirm(); setState(null); }}
      onCancel={() => setState(null)}
    />
  ) : null;

  return { showConfirm, ConfirmDialog };
};
