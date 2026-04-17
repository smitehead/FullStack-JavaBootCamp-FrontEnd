import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BsBag, BsFunnel } from 'react-icons/bs';

import { BsClock, BsStopwatch, BsPeople, BsExclamationCircle, BsBan, BsSearch } from 'react-icons/bs';
import { useAppContext } from '@/context/AppContext';
import { Product } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '@/utils/imageUtils';
import { showToast } from '@/components/toastService';

const ITEMS_PER_PAGE = 15;

export const AuctionManagement: React.FC = () => {
  const { products, cancelAuction } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'canceled'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.seller.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, statusFilter]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredProducts.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredProducts.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleCancelAuction = async () => {
    if (selectedProduct) {
      await cancelAuction(selectedProduct.id, '관리자에 의한 강제 종료');
      setShowCancelModal(false);
      setSelectedProduct(null);
      showToast('경매가 강제 종료되었습니다.', 'info');
    }
  };

  const getRemainingTime = (product: Product) => {
    if (product.status !== 'active' || !product.endTime) return '종료';
    const diff = new Date(product.endTime).getTime() - Date.now();
    if (diff <= 0) return '종료 임박';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours > 24 ? `${Math.floor(hours / 24)}일 ${hours % 24}시간` : `${hours}시간 ${mins}분`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">경매 관리</h1>
          <p className="text-gray-500 mt-1 text-[11px] font-medium">진행 중인 경매를 모니터링하고 필요한 경우 강제 종료 처리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative w-64 flex items-center h-10">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <BsSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="상품명 또는 판매자 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-none px-4 py-2.5 shadow-sm">
            <BsFunnel className="w-3.5 h-3.5 text-gray-400" />
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">전체 상태</option>
              <option value="active">진행 중</option>
              <option value="completed">종료됨</option>
              <option value="canceled">취소됨</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BsBag className="w-5 h-5 text-gray-400" /> 경매 목록
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredProducts.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div key={product.id} className="px-8 py-5 hover:bg-gray-50 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <img
                    src={resolveImageUrl(product.images[0]) || ''}
                    alt={product.title}
                    className="w-12 h-12 rounded-none object-cover bg-gray-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        to={`/products/${product.id.replace('prod_', '')}`}
                        target="_blank"
                        className="text-sm font-bold text-gray-900 truncate hover:text-[#FF5A5A] hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {product.title}
                      </Link>
                      <span className={`inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold ${product.status === 'active' ? 'bg-green-50 text-green-600' :
                        product.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-50 text-red-600'
                        }`}>
                        {product.status === 'active' ? '진행중' :
                          product.status === 'completed' ? '종료됨' : '취소됨'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <Link
                        to={`/admin/users?nickname=${product.seller.nickname}`}
                        className="font-bold text-gray-500 hover:text-[#FF5A5A] transition-colors"
                      >
                        {product.seller.nickname}
                      </Link>
                      <span className="text-gray-300">|</span>
                      <span className="font-bold text-gray-900">{product.currentPrice.toLocaleString()}원</span>
                      <span className="text-[10px] text-gray-400">시작 {product.startPrice.toLocaleString()}원</span>
                      <span className="text-gray-300">|</span>
                      <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                        <BsPeople className="w-3 h-3" /> {product.participantCount}명
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
                        <BsStopwatch className="w-3.5 h-3.5" /> {getRemainingTime(product)}
                      </span>
                    </div>
                  </div>
                </div>
                {product.status === 'active' && (
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowCancelModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-none transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="경매 강제 종료"
                  >
                    <BsBan className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="px-8 py-20 text-center">
              <BsBag className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredProducts.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>

      {/* Cancel Auction Modal */}
      <AnimatePresence>
        {showCancelModal && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-none bg-red-50 flex items-center justify-center shrink-0">
                  <BsExclamationCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">경매 강제 종료</h3>
                  <p className="text-sm text-gray-500 font-medium">경매를 중단하고 취소 처리합니다.</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-none p-4 mb-8">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">대상 상품</p>
                <p className="text-sm font-bold text-gray-900">{selectedProduct.title}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-none hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={handleCancelAuction}
                  className="flex-1 py-4 bg-red-500 text-white font-bold rounded-none hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  강제 종료 실행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
