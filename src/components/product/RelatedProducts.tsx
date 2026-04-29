import React, { useState, useEffect, useRef } from 'react';
import { Product } from '@/types';
import api from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { motion } from 'motion/react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

interface RelatedProductsProps {
  productId: string;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 마우스 드래그 스크롤을 위한 Ref 및 상태
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // 화살표 표시 여부 체크
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  useEffect(() => {
    const fetchRelated = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/products/${productId}/related`);
        const mappedProducts = res.data.map((data: any) => ({
          id: String(data.id),
          title: data.title,
          currentPrice: data.currentPrice,
          location: data.location || '',
          endTime: data.endTime,
          participantCount: data.participantCount || 0,
          status: data.status,
          images: data.images || [],
          isWishlisted: data.isWishlisted || false,
        }));
        setProducts(mappedProducts);
      } catch (error) {
        console.error('연관 상품 조회 실패', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchRelated();
    }
  }, [productId]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    setDragDistance(0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
    setDragDistance(Math.abs(x - startX));
    checkScroll();
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-400 font-medium text-sm">연관 상품을 불러오는 중...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">연관 상품 추천</h2>
        <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-semibold">관련된 상품이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">연관 상품 추천</h2>
          <p className="text-gray-400 text-sm mt-1 font-medium">비슷한 카테고리의 인기 상품들을 확인해보세요</p>
        </div>
      </div>

      <div className="relative group">
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onScroll={checkScroll}
          className={`flex overflow-x-auto gap-5 px-1 no-scrollbar ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ 
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {products.map((product, index) => (
            <motion.div 
              key={product.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-none w-[240px] md:w-[280px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* 드래그 중에는 클릭(이동) 방지를 위해 pointer-events-none 적용 검토 가능하나, 
                  일반적으로는 MouseUp 시점에 드래그 여부를 판별하여 처리함. 
                  여기서는 단순 드래그 구현에 집중함. */}
              <div className={`pb-8 ${dragDistance > 5 ? 'pointer-events-none' : ''}`}>
                <ProductCard product={product} />
              </div>
            </motion.div>
          ))}
        </div>
        


        {/* Navigation Icons */}
        {showLeftArrow && (
          <button 
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
            }}
            className="absolute left-[-20px] top-[140px] -translate-y-1/2 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-brand hover:scale-110 transition-all z-20"
          >
            <BsChevronLeft className="w-5 h-5 leading-none" />
          </button>
        )}
        {showRightArrow && (
          <button 
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
            }}
            className="absolute right-[-20px] top-[140px] -translate-y-1/2 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-brand hover:scale-110 transition-all z-20"
          >
            <BsChevronRight className="w-5 h-5 leading-none" />
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
