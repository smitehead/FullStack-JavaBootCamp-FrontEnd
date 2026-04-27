import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ProductCard } from '@/components/ProductCard';
import { 
  BsBag, BsBagFill, BsPencilSquare, BsChevronLeft, BsChevronRight,
  BsHeart, BsHeartFill, BsGear, BsGearFill, BsWallet, BsBox2, BsShop, 
  BsTrophy, BsChat, BsThreeDotsVertical, BsXCircleFill, BsEyeSlash,
  BsImage, BsTrash
} from 'react-icons/bs';
import { Pagination } from '@/components/Pagination';
import { Product } from '@/types';
import api from '@/services/api';
import { resolveImageUrls, resolveImageUrl, getProfileImageUrl } from '@/utils/imageUtils';
import { getMemberNo } from '@/utils/memberUtils';
import { showToast } from '@/components/toastService';
import { ReviewModal } from '@/components/ReviewModal';

/** 백엔드 ProductListResponseDto → 프론트 Product 타입 변환 */
function mapToProduct(item: any): Product & { bidStatus?: string } {
  return {
    ...item,
    id: String(item.id),
    title: item.title || '',
    description: item.description || '',
    category: item.category || '기타',
    seller: item.seller || {
      id: String(item.sellerId || 'unknown'),
      nickname: item.sellerNickname || '판매자',
      profileImage: item.sellerProfileImage || item.sellerProfileImg || '',
      points: 0,
      mannerTemp: item.mannerTemp || 36.5,
      joinedAt: '',
      // 백엔드 원본 번호 보존
      memberNo: item.sellerNo || item.sellerMemberNo || item.sellerId
    },
    // 낙찰자 정보 보존
    winnerMemberNo: item.winnerNo || item.winnerMemberNo || item.buyerNo || item.buyerMemberNo,
    winnerNickname: item.winnerNickname || null,
    startPrice: item.startPrice || item.currentPrice || 0,
    currentPrice: item.currentPrice || 0,
    minBidIncrement: item.minBidUnit || 1000,
    startTime: item.startTime || new Date().toISOString(),
    endTime: item.endTime || new Date().toISOString(),
    images: resolveImageUrls(item.images || []),
    participantCount: item.participantCount || 0,
    bids: item.bids || [],
    status: item.status || 'active',
    location: item.location || '',
    transactionMethod: item.transactionMethod || 'delivery',
    isWishlisted: item.isWishlisted || false,
    bidStatus: item.bidStatus || null,
    auctionResultStatus: item.auctionResultStatus || null,
    resultNo: item.resultNo || null,
    hasReview: item.hasReview ?? null,
    hasBuyerReview: item.hasBuyerReview ?? null,
    hasSellerReview: item.hasSellerReview ?? null,
  };
}

type TabType = 'selling' | 'bidding' | 'purchased' | 'wishlist' | 'reviews';

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isInitialized, updateCurrentUserProfileImage } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return (tab && ['selling', 'bidding', 'purchased', 'wishlist', 'reviews'].includes(tab))
      ? tab as TabType : 'selling';
  });

  // URL 쿼리 파라미터 업데이트
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);
  const [sellingFilter, setSellingFilter] = useState<'all' | 'active' | 'ended' | 'completed'>('all');
  const [biddingFilter, setBiddingFilter] = useState<'all' | 'leader' | 'trading' | 'outbid' | 'lost'>('all');

  interface ReviewItem {
    reviewNo: number;
    resultNo: number;
    writerNo: number;
    writerNickname: string;
    targetNo: number;
    productNo: number | null;
    productTitle: string | null;
    tags: string[];
    content: string;
    createdAt: string;
  }
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [hideModalId, setHideModalId] = useState<number | null>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuId(null);
      setIsProfileMenuOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // 리뷰 탭 진입 시 API 호출
  useEffect(() => {
    if (activeTab !== 'reviews') return;
    const memberNo = getMemberNo(user);
    if (!memberNo) return;
    api.get(`/reviews/target/${memberNo}`)
      .then(res => setReviews(res.data))
      .catch(() => setReviews([]));
  }, [activeTab, user]);

  const [sellingProducts, setSellingProducts] = useState<Product[]>([]);
  const [biddingProducts, setBiddingProducts] = useState<(Product & { bidStatus?: string })[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // 탭별 페이징 상태
  const [sellingPage, setSellingPage] = useState(1);
  const [sellingTotalPages, setSellingTotalPages] = useState(1);
  const [sellingTotal, setSellingTotal] = useState(0);
  const [biddingPage, setBiddingPage] = useState(1);
  const [biddingTotalPages, setBiddingTotalPages] = useState(1);
  const [biddingTotal, setBiddingTotal] = useState(0);
  const [purchasedPage, setPurchasedPage] = useState(1);
  const [purchasedTotalPages, setPurchasedTotalPages] = useState(1);
  const [wishlistPage, setWishlistPage] = useState(1);
  const [wishlistTotalPages, setWishlistTotalPages] = useState(1);
  const [wishlistTotal, setWishlistTotal] = useState(0);

  // SSE 실시간 입찰 상태 오버라이드: { [productId]: 'outbid' | 'bidding' }
  const [bidStatusOverrides, setBidStatusOverrides] = useState<Record<string, string>>({});
  const biddingProductsRef = useRef(biddingProducts);
  useEffect(() => { biddingProductsRef.current = biddingProducts; }, [biddingProducts]);

  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedProductForReview, setSelectedProductForReview] = useState<Product | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // user.profileImage가 외부에서 바뀌면(세션 복원 등) 동기화
  React.useEffect(() => {
    if (user?.profileImage) setProfileImage(user.profileImage);
  }, [user?.profileImage]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];

    // 로컬 미리보기 즉시 반영
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);

    // 서버 업로드 (2단계)
    try {
      setUploadingProfile(true);
      const memberNo = getMemberNo(user);

      // 1단계: 파일 업로드 (기존 동작하는 엔드포인트 활용)
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/images/upload', formData);
      const relativeUrl: string = uploadRes.data.url; // "/api/images/uuid.jpg"

      // 2단계: 회원 프로필 이미지 URL 저장
      await api.put(`/members/${memberNo}/profile-image-url`, { url: relativeUrl });

      const fullUrl = resolveImageUrl(relativeUrl) || relativeUrl;
      updateCurrentUserProfileImage(fullUrl);
      setProfileImage(fullUrl);
      showToast('프로필 이미지가 변경되었습니다.', 'success');
    } catch (err) {
      showToast('이미지 업로드에 실패했습니다.', 'error');
    } finally {
      setUploadingProfile(false);
      setIsProfileMenuOpen(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDeleteProfileImage = async () => {
    if (!user) return;
    try {
      setUploadingProfile(true);
      const memberNo = getMemberNo(user);
      // 서버에 빈 URL 전송하여 프로필 이미지 삭제 처리
      await api.put(`/members/${memberNo}/profile-image-url`, { url: '' });
      
      updateCurrentUserProfileImage('');
      setProfileImage('');
      showToast('프로필 이미지가 삭제되었습니다.', 'success');
    } catch (err) {
      showToast('이미지 삭제에 실패했습니다.', 'error');
    } finally {
      setUploadingProfile(false);
      setIsProfileMenuOpen(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // 데이터 로딩
  const fetchSellingProducts = useCallback(async (page = 1, filter = sellingFilter) => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-selling', { params: { page, size: 6, filter } });
      setSellingProducts((res.data.content || []).map(mapToProduct));
      setSellingTotalPages(res.data.totalPages || 1);
      setSellingTotal(res.data.totalElements || 0);
    } catch (err) {
      console.error('판매 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, [sellingFilter]);

  const fetchBiddingProducts = useCallback(async (page = 1, filter = biddingFilter) => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-bidding', { params: { page, size: 6, filter } });
      const products = (res.data.content || []).map(mapToProduct);
      setBiddingProducts(products);
      setBiddingTotalPages(res.data.totalPages || 1);
      setBiddingTotal(res.data.totalElements || 0);
      return products;
    } catch (err) {
      console.error('입찰 목록 조회 실패', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [biddingFilter]);

  const fetchPurchasedProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-purchased', { params: { page, size: 6 } });
      setPurchasedProducts((res.data.content || []).map(mapToProduct));
      setPurchasedTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('구매 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWishlistProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.get('/wishlists/my', { params: { page, size: 6 } });
      setWishlistProducts((res.data.content || []).map(mapToProduct));
      setWishlistTotalPages(res.data.totalPages || 1);
      setWishlistTotal(res.data.totalElements || 0);
    } catch (err) {
      console.error('찜 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWishlistToggle = useCallback((productId: string, isWishlisted: boolean) => {
    // 찜 목록 탭에서 '찜 해제' 시 즉시 목록에서 제거
    if (activeTab === 'wishlist' && !isWishlisted) {
      setWishlistProducts(prev => prev.filter(p => p.id !== productId));
      setWishlistTotal(prev => Math.max(0, prev - 1));
    }

    // 타 탭에 해당 상품이 있을 경우 하트 상태 동기화 (판매/입찰/구매)
    const updateList = (prev: Product[]) => prev.map(p => p.id === productId ? { ...p, isWishlisted } : p);
    setSellingProducts(updateList);
    setBiddingProducts(prev => prev.map(p => p.id === productId ? { ...p, isWishlisted } : p));
    setPurchasedProducts(updateList);
  }, [activeTab]);

  const handleHideReview = async (reviewNo: number) => {
    try {
      await api.put(`/reviews/${reviewNo}/hide`);
      setReviews(prev => prev.filter(r => r.reviewNo !== reviewNo));
      showToast('후기가 숨김 처리되었습니다.', 'success');
      setHideModalId(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || '오류가 발생했습니다.', 'error');
    }
  };

  // 로그인 시 카운트 표시용 사전 로드
  useEffect(() => {
    if (!user) return;
    fetchBiddingProducts(1);
    fetchWishlistProducts(1);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 탭 변경 시 페이지 리셋 후 데이터 로드
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'selling') { setSellingPage(1); fetchSellingProducts(1, sellingFilter); }
    else if (activeTab === 'bidding') { setBiddingPage(1); fetchBiddingProducts(1, biddingFilter); setBidStatusOverrides({}); }
    else if (activeTab === 'purchased') { setPurchasedPage(1); fetchPurchasedProducts(1); }
    else if (activeTab === 'wishlist') { setWishlistPage(1); fetchWishlistProducts(1); }
  }, [activeTab, user, fetchSellingProducts, fetchBiddingProducts, fetchPurchasedProducts, fetchWishlistProducts, sellingFilter, biddingFilter]);

  // 입찰 내역 SSE 실시간 상태 업데이트
  useEffect(() => {
    if (activeTab !== 'bidding' || !user) return;

    const myMemberNo = getMemberNo(user);

    const onPriceUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { productNo: number | string; currentPrice: number; bidderNo?: number | string };
      const productId = String(detail.productNo);
      const inList = biddingProductsRef.current.find(p => p.id === productId);
      if (!inList) return;

      // 현재 가격 업데이트
      setBiddingProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, currentPrice: detail.currentPrice } : p
      ));

      const bidderNo = detail.bidderNo != null ? Number(detail.bidderNo) : null;
      if (bidderNo !== null && myMemberNo !== null && bidderNo === myMemberNo) {
        // 내가 직접 입찰 → 상위입찰자
        setBidStatusOverrides(prev => ({ ...prev, [productId]: 'bidding' }));
      } else {
        // 다른 사람이 입찰 → 내가 상위입찰자였다면 추월변동
        setBidStatusOverrides(prev => {
          const effective = prev[productId] || inList.bidStatus;
          if (effective === 'bidding') {
            return { ...prev, [productId]: 'outbid' };
          }
          return prev;
        });
      }
    };

    const onPointUpdate = () => {
      // 포인트 변동 후 서버 재조회 — 서버가 현재 최고입찰자 여부를 정확히 반환하므로 오버라이드 전체 해제
      fetchBiddingProducts(biddingPage).then(() => setBidStatusOverrides({}));
    };

    const onNotification = (e: Event) => {
      const noti = (e as CustomEvent).detail as { type?: string };
      // 낙찰/입찰 관련 알림 → 경매 종료 후 낙찰성공/실패 뱃지 즉시 반영
      if (noti?.type === 'bid' || noti?.type === 'auctionEnd' || noti?.type === 'newBid') {
        fetchBiddingProducts(biddingPage).then(() => setBidStatusOverrides({}));
      }
    };

    const onReconnected = () => {
      // SSE 재연결 시 누락된 이벤트 보정 — 서버에서 최신 상태 재조회
      fetchBiddingProducts(biddingPage).then(() => setBidStatusOverrides({}));
    };

    window.addEventListener('sse:priceUpdate', onPriceUpdate);
    window.addEventListener('sse:pointUpdate', onPointUpdate);
    window.addEventListener('sse:notification', onNotification);
    window.addEventListener('sse:reconnected', onReconnected);
    return () => {
      window.removeEventListener('sse:priceUpdate', onPriceUpdate);
      window.removeEventListener('sse:pointUpdate', onPointUpdate);
      window.removeEventListener('sse:notification', onNotification);
      window.removeEventListener('sse:reconnected', onReconnected);
    };
  }, [activeTab, user, fetchBiddingProducts, biddingFilter, biddingPage]);


  // 입찰 상태별 뱃지
  const getBidStatusBadge = (bidStatus?: string) => {
    switch (bidStatus) {
      case 'bidding':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
            상위입찰
          </span>
        );
      case 'outbid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-full text-xs font-bold">
            추월변동
          </span>
        );
      case 'lost':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-900/10 text-gray-600 rounded-full text-xs font-bold">
            낙찰실패
          </span>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  if (!isInitialized || !user) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8 relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image */}
          <div className="relative group">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileMenuOpen(!isProfileMenuOpen);
              }}
              disabled={uploadingProfile}
              className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center relative active:scale-95 transition-transform"
            >
              <img
                src={getProfileImageUrl(profileImage)}
                alt="Profile"
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileMenuOpen(!isProfileMenuOpen);
              }}
              disabled={uploadingProfile} 
              className="absolute -bottom-2 -right-2 bg-white text-gray-700 p-2.5 rounded-2xl shadow-lg hover:bg-gray-100 hover:border-gray-200 transition-all duration-300 border border-gray-100 disabled:opacity-50 group z-20"
            >
              {uploadingProfile
                ? <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                : (
                  <>
                    <BsGear className="w-5 h-5 block group-hover:hidden" />
                    <BsGearFill className="w-5 h-5 hidden group-hover:block" />
                  </>
                )
              }
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute left-full top-3/4 mt-4 ml-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileInput();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <BsImage className="w-4 h-4 mr-2.5" /> 앨범에서 선택
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProfileImage();
                  }}
                  className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <BsTrash className="w-4 h-4 mr-2.5" /> 프로필 사진 삭제
                </button>
              </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleProfileImageChange} accept="image/*" className="hidden" />
          </div>

          {/* User Info */}
          <div className="flex-1 flex flex-col md:flex-row gap-8 w-full">
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="text-center md:text-left flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">{user.nickname}</h2>
                  <p className="text-sm text-gray-400 font-medium">가입일: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}</p>
                </div>

                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-emerald-600">매너온도</span>
                      <span className="text-xl font-bold text-emerald-600">{Number(user.mannerTemp).toFixed(1)}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-300">100</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(user.mannerTemp / 100) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('bidding')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-start gap-3 group text-left">
                  <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <BsBagFill className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">입찰내역</p>
                    <p className="text-lg font-bold text-gray-900">{biddingTotal}<span className="text-xs font-medium ml-0.5">건</span></p>
                  </div>
                </button>
                <button onClick={() => setActiveTab('wishlist')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-start gap-3 group text-left">
                  <div className="bg-pink-50 p-2.5 rounded-xl group-hover:bg-pink-100 transition-colors">
                    <BsHeartFill className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">찜목록</p>
                    <p className="text-lg font-bold text-gray-900">{wishlistTotal}<span className="text-xs font-medium ml-0.5">개</span></p>
                  </div>
                </button>
              </div>
            </div>

            {/* Points Section */}
            <div className="w-full md:w-72">
              <div className="bg-gray-900 rounded-3xl p-5 text-white flex flex-col justify-between h-full shadow-xl shadow-indigo-100">
                <div className="flex flex-col gap-2">
                  <Link to="/points" className="flex items-center gap-3 group cursor-pointer">
                    <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors">
                      <BsWallet className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest group-hover:text-white transition-colors">보유 포인트</p>
                  </Link>
                  <h3 className="text-3xl font-bold tracking-tight">{(user.points || 0).toLocaleString()}<span className="text-lg ml-1 text-indigo-400">P</span></h3>
                </div>

                <div className="flex gap-2 mt-4">
                  <Link to="/points/charge" className="flex-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-95">
                    <span>충전</span>
                  </Link>
                  <Link to="/points/withdraw" className="flex-1 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 border border-white/10">
                    <span>출금</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setActiveTab('selling')} className={`w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'selling' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BsShop className="w-5 h-5 mr-3" /> 판매 내역
            </button>
            <button onClick={() => setActiveTab('bidding')} className={`w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'bidding' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BsBag className="w-5 h-5 mr-3" /> 입찰 내역
            </button>
            <button onClick={() => setActiveTab('purchased')} className={`w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'purchased' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BsTrophy className="w-5 h-5 mr-3" /> 구매 내역
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'wishlist' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BsHeart className="w-5 h-5 mr-3" /> 찜 목록
            </button>
            <button onClick={() => setActiveTab('reviews')} className={`w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'reviews' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <BsPencilSquare className="w-5 h-5 mr-3" /> 후기 관리
            </button>
            <Link
              to="/chat"
              className="w-full flex items-center justify-start text-left px-6 py-4 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              <BsChat className="w-5 h-5 mr-3 text-brand" /> 채팅방
            </Link>
          </nav>
        </div>

        {/* Main List */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {activeTab === 'selling' && '판매 내역'}
              {activeTab === 'bidding' && '입찰 내역'}
              {activeTab === 'purchased' && '구매 내역'}
              {activeTab === 'wishlist' && '찜한 목록'}
              {activeTab === 'reviews' && '후기 관리'}
            </h3>

            {activeTab === 'selling' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'active', 'ended', 'completed'] as const).map(filter => (
                  <button key={filter} onClick={() => {
                    setSellingFilter(filter);
                    setSellingPage(1);
                    fetchSellingProducts(1, filter);
                  }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${sellingFilter === filter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {filter === 'all' ? '전체'
                      : filter === 'active' ? '경매중'
                      : filter === 'completed' ? '판매완료'
                      : '경매종료'}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'bidding' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'trading', 'leader', 'outbid', 'lost'] as const).map(filter => (
                  <button key={filter} onClick={() => {
                    setBiddingFilter(filter);
                    setBiddingPage(1);
                    fetchBiddingProducts(1, filter);
                  }}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${biddingFilter === filter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {filter === 'all' ? '전체' : filter === 'trading' ? '거래중' : filter === 'leader' ? '상위입찰' : filter === 'outbid' ? '추월변동' : '낙찰실패'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner-border w-8 h-8" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 판매 내역 */}
                {activeTab === 'selling' && sellingProducts.map(p => {
                  const ars = p.auctionResultStatus;
                  const hasPendingResult = p.status === 'pending';
                  const isResultConfirmed = p.status === 'completed' && ars === '구매확정';
                  const isResultCanceled = p.status === 'canceled';

                  return (
                    <div key={p.id} className="flex flex-col gap-2">
                      <ProductCard
                        product={p}
                        isSold={p.status === 'completed' || isResultCanceled}
                        isConfirmed={isResultConfirmed}
                        isSellerPending={hasPendingResult}
                        sellerCancelRequested={ars === '취소요청'}
                        customLink={hasPendingResult ? `/seller-result/${p.id}` : undefined}
                        onWishlistToggle={handleWishlistToggle}
                      />
                      <div className="flex items-center justify-end px-1">
                        {((p.hasSellerReview === false || p.hasReview === false) && p.resultNo) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedProductForReview(p);
                              setShowReviewModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition-all font-sans"
                          >
                            후기 작성하기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeTab === 'bidding' && biddingProducts.map(p => {
                  const effectiveStatus = bidStatusOverrides[p.id] || p.bidStatus;
                  return (
                    <div key={p.id} className="flex flex-col gap-2">
                      <ProductCard
                        product={p}
                        isWon={effectiveStatus === 'won'}
                        hideOverlay={effectiveStatus === 'lost'}
                        onWishlistToggle={handleWishlistToggle}
                      />
                      <div className="flex items-center px-1">
                        {getBidStatusBadge(effectiveStatus)}
                      </div>
                    </div>
                  );
                })}

                {/* 구매 내역 */}
                {activeTab === 'purchased' && purchasedProducts.map(p => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <ProductCard product={p} isPurchased hideOverlay onWishlistToggle={handleWishlistToggle} />
                    <div className="flex items-center justify-end px-1">
                      {(p.hasBuyerReview === false || p.hasReview === false) && p.resultNo && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedProductForReview(p);
                            setShowReviewModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition-all font-sans"
                        >
                          후기 작성하기
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 찜 목록 */}
                {activeTab === 'wishlist' && wishlistProducts.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>

              {activeTab === 'selling' && sellingProducts.length === 0 && <EmptyState message="해당하는 판매 상품이 없습니다." />}
              {activeTab === 'bidding' && biddingProducts.length === 0 && (
                <EmptyState message={biddingFilter === 'all' ? "입찰 참여 내역이 없습니다." : "조건에 맞는 입찰 내역이 없습니다."} />
              )}
              {activeTab === 'purchased' && purchasedProducts.length === 0 && <EmptyState message="구매 완료된 상품이 없습니다." />}
              {activeTab === 'wishlist' && wishlistProducts.length === 0 && <EmptyState message="찜한 상품이 없습니다." />}

              {/* 페이지네이션 */}
              {activeTab === 'selling' && sellingTotalPages > 1 && (
                <Pagination currentPage={sellingPage} totalPages={sellingTotalPages} onPageChange={(p) => { setSellingPage(p); fetchSellingProducts(p); }} />
              )}
              {activeTab === 'bidding' && biddingTotalPages > 1 && (
                <Pagination currentPage={biddingPage} totalPages={biddingTotalPages} onPageChange={(p) => { setBiddingPage(p); fetchBiddingProducts(p); setBidStatusOverrides({}); }} />
              )}
              {activeTab === 'purchased' && purchasedTotalPages > 1 && (
                <Pagination currentPage={purchasedPage} totalPages={purchasedTotalPages} onPageChange={(p) => { setPurchasedPage(p); fetchPurchasedProducts(p); }} />
              )}
              {activeTab === 'wishlist' && wishlistTotalPages > 1 && (
                <Pagination currentPage={wishlistPage} totalPages={wishlistTotalPages} onPageChange={(p) => { setWishlistPage(p); fetchWishlistProducts(p); }} />
              )}
              {activeTab === 'reviews' && (
                <div className="flex flex-col gap-8">
                  {/* 태그 집계 */}
                  {reviews.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">받은 태그</h4>
                      <div className="flex flex-wrap gap-3">
                        {(() => {
                          const tagCounts: Record<string, number> = {};
                          reviews.forEach(r => r.tags?.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
                          const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
                          return sortedTags.map(([tag, count]) => (
                            <div key={tag} className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-gray-100">
                              <span className="text-sm font-medium text-gray-700">{tag}</span>
                              <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 리뷰 목록 */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">받은 거래 후기</h4>
                    {reviews.length > 0 ? (
                      reviews.map(review => (
                        <div key={review.reviewNo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <Link 
                                to={`/seller/${review.writerNo}`}
                                className="font-bold text-gray-900 hover:text-gray-600 transition-colors"
                              >
                                {review.writerNickname}
                              </Link>
                              <span className="text-xs text-gray-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === review.reviewNo ? null : review.reviewNo);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <BsThreeDotsVertical className="w-5 h-5 text-gray-400" />
                              </button>
                              
                              {openMenuId === review.reviewNo && (
                                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHideModalId(review.reviewNo);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                  >
                                    <BsEyeSlash className="w-4 h-4 mr-2.5" /> 후기 숨기기
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {review.tags.map(tag => (
                                <span key={tag} className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">{tag}</span>
                              ))}
                            </div>
                          )}
                          {review.content && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-3">
                              <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
                            </div>
                          )}
                          {review.productTitle && (
                            <Link
                              to={`/products/${review.productNo}`}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <BsBox2 className="w-3.5 h-3.5" />
                              {review.productTitle}
                            </Link>
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyState message="받은 후기가 없습니다." />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hide Confirm Modal */}
          {hideModalId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHideModalId(null)} />
              <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">후기를 숨기시겠습니까?</h3>
                  <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                    후기 숨기기는 다시 되돌릴 수 없습니다.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setHideModalId(null)}
                      className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                    >
                      취소
                    </button>
                    <button 
                      onClick={() => handleHideReview(hideModalId)}
                      className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm"
                    >
                      숨기기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedProductForReview && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedProductForReview(null);
          }}
          resultNo={selectedProductForReview.resultNo!}
          sellerNickname={activeTab === 'selling' ? '구매자' : (selectedProductForReview.seller?.nickname || '판매자')}
          productTitle={selectedProductForReview.title}
          productImage={selectedProductForReview.images?.[0] || ''}
          role={activeTab === 'selling' ? 'seller' : 'buyer'}
          onSuccess={() => {
            if (activeTab === 'selling') fetchSellingProducts(sellingPage);
            else if (activeTab === 'purchased') fetchPurchasedProducts(purchasedPage);
            else if (activeTab === 'bidding') fetchBiddingProducts(biddingPage);
          }}
        />
      )}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
    <BsBox2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
    <p>{message}</p>
  </div>
);
