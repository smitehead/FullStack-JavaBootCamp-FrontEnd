import React, { useEffect, useCallback } from 'react';
import { BsChevronLeft, BsChevronRight, BsX } from 'react-icons/bs';

interface Props {
  urls: string[];
  index: number;
  onClose: () => void;
  onNav: (index: number) => void;
}

export const ImageLightbox: React.FC<Props> = ({ urls, index, onClose, onNav }) => {
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
    if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
  }, [index, hasPrev, hasNext, onClose, onNav]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 닫기 */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        onClick={onClose}
      >
        <BsX className="w-8 h-8" />
      </button>

      {/* 이전 */}
      {hasPrev && (
        <button
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        >
          <BsChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* 이미지 */}
      <img
        src={urls[index]}
        alt={`이미지 ${index + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-none shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 다음 */}
      {hasNext && (
        <button
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
        >
          <BsChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* 인덱스 표시 */}
      {urls.length > 1 && (
        <div className="absolute bottom-4 text-white/70 text-sm font-bold">
          {index + 1} / {urls.length}
        </div>
      )}
    </div>
  );
};
