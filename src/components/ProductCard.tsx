import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BsPerson, BsHeart, BsHeartFill, BsStopwatch, BsBox2 } from 'react-icons/bs';
import { Product } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { getMemberNo } from '@/utils/memberUtils';

interface ProductCardProps {
  product: Product;
  isWon?: boolean;
  isSold?: boolean;
  isConfirmed?: boolean;
  /** 판매자 시점: 낙찰 발생 후 구매 확정 대기 중 (초록 오버레이 + "확정 대기중") */
  isSellerPending?: boolean;
  /** 판매자 시점: 구매자로부터 취소 요청이 들어온 상태 */
  sellerCancelRequested?: boolean;
  /** Link 목적지 오버라이드 (기본: isWon → /won/:id, 나머지 → /products/:id) */
  customLink?: string;
  /** 이미지 위 오버레이(낙찰성공, 판매완료, 경매종료 등)를 모두 숨김 */
  hideOverlay?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWon = false,
  isSold = false,
  isConfirmed = false,
  isSellerPending = false,
  sellerCancelRequested = false,
  customLink,
  hideOverlay = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(product.isWishlisted || false);
  const { user } = useAppContext();
  const navigate = useNavigate();

  const [priceHighlight, setPriceHighlight] = useState(false);
  const prevPriceRef = useRef(product.currentPrice);

  useEffect(() => {
    if (product.currentPrice > prevPriceRef.current) {
      setPriceHighlight(true);
      const timer = setTimeout(() => setPriceHighlight(false), 2000);
      prevPriceRef.current = product.currentPrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = product.currentPrice;
  }, [product.currentPrice]);

  useEffect(() => {
    const updateTime = () => {
      const end = new Date(product.endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('종료');
        setIsFinished(true);
      } else {
        setIsFinished(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        const s = String(seconds).padStart(2, '0');

        setTimeLeft(`${h}:${m}:${s}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [product.endTime]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
      return;
    }

    try {
      const memberNo = getMemberNo(user);
      if (!memberNo) return;
      const response = await api.post(`/wishlists/toggle?productNo=${product.id}`);
      setIsWishlisted(response.data);
    } catch (error) {
      console.error('위시리스트 변경 실패', error);
      alert('찜 처리 중 오류가 발생했습니다.');
    }
  };

  const showBadge = isWon || isSold || isSellerPending;
  const linkTo = customLink || (isWon ? `/won/${product.id}` : `/products/${product.id}`);

  return (
    <Link
      to={linkTo}
      className="group block bg-white rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-50"
    >
      <div className="relative aspect-square m-0.5 rounded-[22px] overflow-hidden bg-gray-100 isolate [transform:translateZ(0)]">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <BsBox2 className="w-12 h-12 mb-1" />
            <span className="text-[10px] font-medium">이미지 없음</span>
          </div>
        )}

        {/* Participant Count - Hide for completed auctions */}
        {product.status !== 'completed' && (
          <div className="absolute top-3 left-3 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full flex items-center backdrop-blur-sm">
            <BsPerson className="w-3 h-3 mr-1" />
            {product.participantCount}명 참여
          </div>
        )}

        {/* 찜 버튼 - 찜한 상태이거나 호버 시 표시, 낙찰/판매 완료 상품 제외 */}
        {!showBadge && (
          <button
            onClick={toggleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-all z-10 ${isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            {isWishlisted ? (
              <BsHeartFill className="w-4 h-4 text-red-500 transition-colors" />
            ) : (
              <BsHeart className="w-4 h-4 text-gray-400 transition-colors" />
            )}
          </button>
        )}

        {/* Won Badge (구매자 시점) - 낙찰 성공 시 표시 */}
        {isWon && !hideOverlay && (
          <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-500 group-hover:bg-gray-700/90 transition-colors cursor-pointer rounded-[inherit]">
            <div className="bg-white text-gray-800 px-5 py-2 rounded-full font-semibold text-sm mb-2 shadow-xl">
              낙찰 성공!
            </div>
            <div className="text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border border-white/30 group-hover:bg-white group-hover:text-gray-800 transition-all">
              판매자와 대화하기
            </div>
          </div>
        )}

        {/* Seller Pending Badge — 낙찰 발생 후 구매 확정 대기 중 (회색 강조) */}
        {isSellerPending && !hideOverlay && (
          <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-500 group-hover:bg-gray-700/90 transition-colors cursor-pointer rounded-[inherit]">
            <div className="bg-white text-gray-800 px-5 py-2 rounded-full font-semibold text-sm mb-2 shadow-xl">
              확정 대기 중
            </div>
            <div className="text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full border border-white/30 group-hover:bg-white group-hover:text-gray-800 transition-all">
              {sellerCancelRequested ? '취소 요청이 들어왔습니다' : '구매자와 대화하기'}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pt-2">
        <h3 className="font-bold text-gray-900 text-base mb-1 truncate text-left">{product.title}</h3>

        {/* Address - Aligned Left */}
        <div className="text-[11px] text-gray-400 mb-3 text-left min-h-[1.25rem]">
          {product.location && product.location !== '택배거래 상품' ? product.location : ''}
        </div>

        <div className="flex justify-between items-end">
          <div className="text-left">
            <p className="text-[10px] text-gray-400 mb-0.5">
              {product.status === 'completed' ? '최종 낙찰가' : '현재 입찰가'}
            </p>
            <p className={`text-lg font-bold transition-colors duration-500 ${priceHighlight ? 'text-red-600 animate-pulse' : (showBadge ? 'text-indigo-600' : 'text-gray-900')}`}>
              {product.currentPrice.toLocaleString()}원
            </p>
          </div>

          {/* Timer pill */}
          <div className={`flex items-center h-6 px-2.5 rounded-lg text-[11px] font-bold leading-none ${isConfirmed
              ? 'bg-gray-900 text-white'
              : isFinished
                ? 'bg-gray-100 text-gray-500'
                : 'bg-red-50 text-red-500'
            }`}>
            {isConfirmed ? (
              <span>판매완료</span>
            ) : isFinished ? (
              <span>종료</span>
            ) : (
              <div className="flex items-center gap-1">
                <BsStopwatch className="w-3.5 h-3.5" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
