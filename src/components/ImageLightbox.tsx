import React, { useEffect, useCallback, useState, useRef } from 'react';
import { BsChevronLeft, BsChevronRight, BsX, BsZoomIn, BsZoomOut } from 'react-icons/bs';

interface Props {
  urls: string[];
  index: number;
  onClose: () => void;
  onNav: (index: number) => void;
}

export const ImageLightbox: React.FC<Props> = ({ urls, index, onClose, onNav }) => {
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // 이미지 변경 시 줌 초기화
  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (scale === 1) {
      if (e.key === 'ArrowLeft' && hasPrev) onNav(index - 1);
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1);
    }
  }, [index, hasPrev, hasNext, onClose, onNav, scale]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setScale(prev => {
      const next = prev - e.deltaY * 0.001;
      return Math.min(Math.max(next, 1), 5);
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.stopPropagation();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = offset;
  }, [scale, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setOffset({
      x: offsetAtDragStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetAtDragStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  }, [scale, resetZoom]);

  const isZoomed = scale > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-hidden"
      onClick={isZoomed ? undefined : onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 닫기 */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        onClick={onClose}
      >
        <BsX className="w-8 h-8" />
      </button>

      {/* 줌 버튼 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        <button
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
          onClick={(e) => { e.stopPropagation(); setScale(prev => Math.max(prev - 0.5, 1)); if (scale - 0.5 <= 1) resetZoom(); }}
          disabled={!isZoomed}
        >
          <BsZoomOut className="w-5 h-5" />
        </button>
        {isZoomed && (
          <span className="text-white/70 text-xs font-bold min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
        )}
        <button
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
          onClick={(e) => { e.stopPropagation(); setScale(prev => Math.min(prev + 0.5, 5)); }}
          disabled={scale >= 5}
        >
          <BsZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* 이전 */}
      {hasPrev && !isZoomed && (
        <button
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
        >
          <BsChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* 이미지 */}
      <img
        src={urls[index]}
        alt={`이미지 ${index + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain shadow-2xl select-none"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          cursor: isZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in',
          transition: isDragging.current ? 'none' : 'transform 0.1s ease',
        }}
        onClick={handleImageClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        draggable={false}
      />

      {/* 다음 */}
      {hasNext && !isZoomed && (
        <button
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
        >
          <BsChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* 인덱스 / 줌 안내 */}
      <div className="absolute bottom-4 flex flex-col items-center gap-1">
        {urls.length > 1 && (
          <span className="text-white/70 text-sm font-bold">{index + 1} / {urls.length}</span>
        )}
        {isZoomed ? (
          <span className="text-white/40 text-xs">더블클릭하면 원래 크기로 돌아옵니다</span>
        ) : (
          <span className="text-white/40 text-xs">스크롤 또는 더블클릭으로 확대</span>
        )}
      </div>
    </div>
  );
};
