import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BsBag, BsFunnel } from 'react-icons/bs';

import { BsStopwatch, BsPeople, BsExclamationCircle, BsBan, BsSearch } from 'react-icons/bs';
import { useAppContext } from '@/context/AppContext';
import { Product } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '@/utils/imageUtils';
import { showToast } from '@/components/toastService';

const ITEMS_PER_PAGE = 15;

export const AuctionManagement: React.FC = () => {
  const { products, cancelAuction, isAdminLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'canceled' | 'failed'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    if (product.status !== 'active' || !product.endTime) return '-';
    const diff = new Date(product.endTime).getTime() - Date.now();
    if (diff <= 0) return '종료 임박';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hours >= 24 ? `${Math.floor(hours / 24)}일 ${hours % 24}시간` : `${hours}시간 ${mins}분`;
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">경매 관리</h1>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">진행 중인 경매를 모니터링하고 필요한 경우 강제 종료 처리합니다.</p>
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
              <option value="pending">정산 대기</option>
              <option value="completed">거래 완료</option>
              <option value="canceled">거래 취소</option>
              <option value="failed">유찰</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsBag className="w-4 h-4 text-gray-400" /> 경매 목록
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredProducts.length}건</span>
        </div>

        {isAdminLoading && (
          <div className="flex items-center justify-center py-14">
            <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div key={product.id} className="px-5 py-2.5 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center min-w-0">
                <img src={resolveImageUrl(product.images[0]) || ''} alt={product.title} className="w-8 h-8 rounded-none object-cover bg-gray-100 shrink-0 mr-3" referrerPolicy="no-referrer" />
                <span
                  title={product.title}
                  className="w-[200px] shrink-0 text-[13px] font-bold text-gray-900 truncate hover:text-[#FF5A5A] transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const token = sessionStorage.getItem('java_token');
                    const user = sessionStorage.getItem('java_user');
                    if (token) localStorage.setItem('tab_token', token);
                    if (user) localStorage.setItem('tab_user', user);
                    setTimeout(() => {
                      localStorage.removeItem('tab_token');
                      localStorage.removeItem('tab_user');
                    }, 500);
                    window.open(`/products/${product.id.replace('prod_', '')}`, '_blank');
                  }}
                >
                  {product.title}
                </span>
                <div className="w-[56px] shrink-0">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-none text-[11px] font-bold ${
                    product.status === 'active'    ? 'bg-green-50 text-green-600' :
                    product.status === 'pending'   ? 'bg-blue-50 text-blue-600' :
                    product.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                    product.status === 'canceled'  ? 'bg-red-50 text-red-600' :
                                                     'bg-orange-50 text-orange-500'
                  }`}>
                    {product.status === 'active'    ? '진행중' :
                     product.status === 'pending'   ? '정산대기' :
                     product.status === 'completed' ? '거래완료' :
                     product.status === 'canceled'  ? '거래취소' :
                                                      '유찰'}
                  </span>
                </div>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <Link to={`/admin/users?nickname=${product.seller.nickname}`} className="w-[100px] shrink-0 text-xs font-bold text-gray-500 hover:text-[#FF5A5A] truncate" title={product.seller.nickname}>
                  {product.seller.nickname}
                </Link>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="w-[96px] shrink-0 text-xs text-gray-400 truncate" title={product.category}>{product.category}</span>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="w-[96px] shrink-0 text-xs font-bold text-gray-900 truncate" title={`${product.currentPrice.toLocaleString()}원`}>{product.currentPrice.toLocaleString()}원</span>
                <span className="w-[80px] shrink-0 text-[11px] text-gray-400 truncate">시작 {product.startPrice.toLocaleString()}원</span>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="w-[60px] shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                  <BsPeople className="w-3 h-3" />{product.participantCount}명
                </span>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="w-[88px] shrink-0 inline-flex items-center gap-1 text-xs text-gray-500">
                  <BsStopwatch className="w-3 h-3 shrink-0" />{getRemainingTime(product)}
                </span>
                {product.status === 'active' && (
                  <button onClick={() => { setSelectedProduct(product); setShowCancelModal(true); }} className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-none transition-all opacity-0 group-hover:opacity-100 shrink-0" title="경매 강제 종료">
                    <BsBan className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && !isAdminLoading && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">검색 결과가 없습니다.</p>
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
              <div className="absolute top-0 left-0 w-full h-2 bg-brand" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-none bg-red-50 flex items-center justify-center shrink-0">
                  <BsExclamationCircle className="w-6 h-6 text-brand" />
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
                  className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={handleCancelAuction}
                  className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 active:scale-95"
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
