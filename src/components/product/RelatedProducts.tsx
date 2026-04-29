import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import api from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { motion } from 'motion/react';

interface RelatedProductsProps {
  productId: string;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/products/${productId}/related`);
        // 백엔드 데이터 매핑 (ProductDetail.tsx의 매핑 로직 참고)
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
      <div className="py-16 border-t border-gray-100 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 tracking-tight">연관 상품 추천</h2>
        <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-semibold">관련된 상품이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 border-t border-gray-100 mt-12">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">연관 상품 추천</h2>
          <p className="text-gray-400 text-sm mt-1 font-medium">비슷한 카테고리의 인기 상품들을 확인해보세요</p>
        </div>
      </div>

      <div className="relative group">
        <div 
          className="flex overflow-x-auto gap-5 pb-8 px-1 no-scrollbar scroll-smooth"
          style={{ 
            scrollSnapType: 'x proximity',
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
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
        
        {/* 가로 스크롤 안내용 그라데이션 (마지막 상품 도달 시 사라짐) */}
        <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
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
