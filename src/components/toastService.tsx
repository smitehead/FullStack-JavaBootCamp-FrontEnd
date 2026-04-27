import React from 'react';
import { toast } from 'sonner';
import { BsStars } from 'react-icons/bs';
import { BsCheckCircle, BsExclamationCircle, BsInfoCircle, BsChat } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'bid' | 'chat';

export const showToast = (message: string, type: ToastType = 'info') => {
  const config = {
    success: { icon: <BsCheckCircle className="w-4 h-4 text-emerald-500" />, color: 'text-emerald-600' },
    error: { icon: <BsExclamationCircle className="w-4 h-4 text-red-500" />, color: 'text-red-600' },
    info: { icon: <BsInfoCircle className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
    warning: { icon: <BsExclamationCircle className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' },
    bid: { icon: <BsStars className="w-4 h-4 text-red-500 animate-pulse" />, color: 'text-red-500' },
    chat: { icon: <BsChat className="w-4 h-4 text-blue-500" />, color: 'text-blue-600' },
  };

  const { icon, color } = config[type];

  toast.custom((t) => (
    <div className="bg-white border border-gray-100 shadow-2xl rounded-full py-3 px-6 flex items-center gap-3 relative">
      <div className="flex items-center justify-center shrink-0">{icon}</div>
      <p className="text-sm font-bold text-gray-900 leading-none whitespace-nowrap">
        {message.split("'").map((part, i) =>
          i % 2 === 1 ? <span key={i} className={color}>'{part}'</span> : part
        )}
      </p>
    </div>
  ), { position: 'top-center', duration: 3000 });
};

interface RebidToastProps {
  productNo: number;
  title: string;
  price: number;
  image: string;
  navigate: (path: string) => void;
}

export const showRebidToast = ({ productNo, title, price, image, navigate }: RebidToastProps) => {
  toast.custom((t) => (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.9 }}
        className="bg-white w-[340px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden pointer-events-auto cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => {
          navigate(`/products/${productNo}`);
          toast.dismiss(t);
        }}
      >
        <div className="p-4 text-left">
          {/* 헤더 섹션 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 text-blue-500" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">자동 재입찰 알림</h4>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t);
              }}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <X className="w-4 h-4 group-hover:text-gray-600" />
            </button>
          </div>

          {/* 메시지 */}
          <p className="text-xs text-gray-500 leading-relaxed font-bold mb-4 px-0.5">
            상위입찰자의 취소로 인해 자동으로 재입찰 되었습니다.<br />자세한 내용은 상품페이지를 확인해주세요.
          </p>

          {/* 상품 정보 요약 카드 */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex gap-3 items-center">
            <img
              src={image || "https://picsum.photos/seed/vintage/100/100"}
              alt={title}
              className="w-12 h-12 rounded-lg object-cover shadow-sm bg-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{title}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">재입찰 완료 금액</span>
                <span className="text-sm font-bold text-blue-600">{price.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  ), {
    position: 'bottom-right',
    duration: Infinity,
    style: {
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: 0
    }
  });
};
