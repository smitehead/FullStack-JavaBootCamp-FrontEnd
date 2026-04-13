import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ProductCard } from '@/components/ProductCard';
import { Settings, Package, ShoppingBag, Heart, Star, Wallet, Trash2, RefreshCw, AlertTriangle, X, Gavel, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { Product } from '@/types';
import api from '@/services/api';
import { resolveImageUrls, resolveImageUrl, getProfileImageUrl } from '@/utils/imageUtils';
import { getMemberNo } from '@/utils/memberUtils';
import { showToast } from '@/components/toastService';

/** 백엔드 ProductListResponseDto → 프론트 Product 타입 변환 */
function mapToProduct(item: any): Product & { bidStatus?: string } {
  return {
    ...item,
    id: String(item.id),
    title: item.title || '',
    description: item.description || '',
    category: item.category || '기타',
    seller: item.seller || { id: 'unknown', nickname: '판매자', profileImage: '', points: 0, mannerTemp: 36.5, joinedAt: '' },
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
  };
}

type TabType = 'selling' | 'bidding' | 'purchased' | 'wishlist' | 'reviews';

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateCurrentUserProfileImage } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return (tab && ['selling', 'bidding', 'purchased', 'wishlist', 'reviews'].includes(tab))
      ? tab as TabType : 'selling';
  });
  const [sellingFilter, setSellingFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [biddingFilter, setBiddingFilter] = useState<'all' | 'leader' | 'outbid' | 'lost'>('all');

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

  // 리뷰 탭 진입 시 API 호출
  useEffect(() => {
    if (activeTab !== 'reviews') return;
    const memberNo = getMemberNo(user);
    if (!memberNo) return;
    api.get(`/reviews/target/${memberNo}`)
      .then(res => setReviews(res.data))
      .catch(() => setReviews([]));
  }, [activeTab]);

  const [sellingProducts, setSellingProducts] = useState<Product[]>([]);
  const [biddingProducts, setBiddingProducts] = useState<(Product & { bidStatus?: string })[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // SSE 실시간 입찰 상태 오버라이드: { [productId]: 'outbid' | 'bidding' }
  const [bidStatusOverrides, setBidStatusOverrides] = useState<Record<string, string>>({});
  const biddingProductsRef = useRef(biddingProducts);
  useEffect(() => { biddingProductsRef.current = biddingProducts; }, [biddingProducts]);

  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // 데이터 로딩
  const fetchSellingProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-selling');
      setSellingProducts((res.data || []).map(mapToProduct));
    } catch (err) {
      console.error('판매 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBiddingProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-bidding');
      const products = (res.data || []).map(mapToProduct);
      setBiddingProducts(products);
      return products;
    } catch (err) {
      console.error('입찰 목록 조회 실패', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPurchasedProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/my-purchased');
      setPurchasedProducts((res.data || []).map(mapToProduct));
    } catch (err) {
      console.error('구매 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWishlistProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/wishlists/my');
      setWishlistProducts((res.data || []).map(mapToProduct));
    } catch (err) {
      console.error('찜 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그인 시 카운트 표시용 사전 로드 (탭 클릭 전에도 갯수 표시)
  useEffect(() => {
    if (!user) return;
    fetchBiddingProducts();
    fetchWishlistProducts();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 탭 변경 시 해당 데이터 로드
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'selling') fetchSellingProducts();
    else if (activeTab === 'bidding') { fetchBiddingProducts(); setBidStatusOverrides({}); }
    else if (activeTab === 'purchased') fetchPurchasedProducts();
    else if (activeTab === 'wishlist') fetchWishlistProducts();
  }, [activeTab, user, fetchSellingProducts, fetchBiddingProducts, fetchPurchasedProducts, fetchWishlistProducts]);

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
      fetchBiddingProducts().then(() => setBidStatusOverrides({}));
    };

    const onNotification = (e: Event) => {
      const noti = (e as CustomEvent).detail as { type?: string };
      // 낙찰/입찰 관련 알림 → 경매 종료 후 낙찰성공/실패 뱃지 즉시 반영
      if (noti?.type === 'bid') {
        fetchBiddingProducts().then(() => setBidStatusOverrides({}));
      }
    };

    const onReconnected = () => {
      // SSE 재연결 시 누락된 이벤트 보정 — 서버에서 최신 상태 재조회
      fetchBiddingProducts().then(() => setBidStatusOverrides({}));
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
  }, [activeTab, user, fetchBiddingProducts]);

  // 상품 삭제
  const handleDeleteClick = (product: Product) => {
    setDeleteProduct(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;
    try {
      await api.delete(`/products/${deleteProduct.id}`);
      setSellingProducts(prev => prev.filter(p => p.id !== deleteProduct.id));
      setShowDeleteModal(false);
      setDeleteProduct(null);
    } catch (err) {
      console.error('삭제 실패', err);
      showToast('상품 삭제에 실패했습니다.', 'error');
    }
  };

  const handleRepost = (product: Product) => {
    navigate('/register', { state: { product } });
  };

  // 판매 필터링
  const filteredSellingProducts = sellingProducts.filter(p => {
    if (sellingFilter === 'all') return true;
    return p.status === sellingFilter;
  });

  const filteredBiddingProducts = biddingProducts.filter(p => {
    const status = bidStatusOverrides[p.id] || p.bidStatus;
    if (biddingFilter === 'all') return true;
    if (biddingFilter === 'leader') return status === 'bidding' || status === 'won';
    return status === biddingFilter;
  });

  // 입찰 상태별 뱃지
  // bidding  → 상위입찰자 (경매 진행 중, 내가 최고 입찰자)
  // outbid   → 추월변동   (경매 진행 중, 다른 사람에게 추월당함) — SSE 오버라이드
  // won      → 낙찰성공   (경매 종료 후 낙찰)
  // lost     → 뱃지 없음  (낙찰 실패는 표시하지 않음)
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
      case 'won':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
            낙찰성공
          </span>
        );
      case 'lost':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-bold">
            낙찰실패
          </span>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="max-w-[1200px] mx-auto px-10 py-20 text-center">
        <p className="text-gray-500 text-lg mb-4">로그인이 필요합니다.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold">
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center">
              <img 
                src={getProfileImageUrl(profileImage)} 
                alt="Profile" 
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <button onClick={triggerFileInput} disabled={uploadingProfile} className="absolute -bottom-2 -right-2 bg-white text-gray-700 p-2.5 rounded-2xl shadow-lg hover:bg-indigo-600 hover:text-white transition-all duration-300 border border-gray-100 disabled:opacity-50">
              {uploadingProfile
                ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                : <Settings className="w-5 h-5" />
              }
            </button>
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
                <button onClick={() => setActiveTab('bidding')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group text-left">
                  <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <Gavel className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">입찰내역</p>
                    <p className="text-lg font-bold text-gray-900">{biddingProducts.length}<span className="text-xs font-medium ml-0.5">건</span></p>
                  </div>
                </button>
                <button onClick={() => setActiveTab('wishlist')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-3 group text-left">
                  <div className="bg-pink-50 p-2.5 rounded-xl group-hover:bg-pink-100 transition-colors">
                    <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">찜목록</p>
                    <p className="text-lg font-bold text-gray-900">{wishlistProducts.length}<span className="text-xs font-medium ml-0.5">개</span></p>
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
                      <Wallet className="w-5 h-5 text-indigo-400" />
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
            <button onClick={() => setActiveTab('selling')} className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'selling' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Package className="w-5 h-5 mr-3" /> 판매 내역
            </button>
            <button onClick={() => setActiveTab('bidding')} className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'bidding' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Gavel className="w-5 h-5 mr-3" /> 입찰 내역
            </button>
            <button onClick={() => setActiveTab('purchased')} className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'purchased' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}`}>
              <ShoppingBag className="w-5 h-5 mr-3" /> 구매 내역
            </button>
            <button onClick={() => setActiveTab('wishlist')} className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'wishlist' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Heart className="w-5 h-5 mr-3" /> 찜 목록
            </button>
            <button onClick={() => setActiveTab('reviews')} className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'reviews' ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Star className="w-5 h-5 mr-3" /> 리뷰 관리
            </button>
            <Link 
               to="/chat"
               className="w-full flex items-center px-6 py-4 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
             >
               <MessageSquare className="w-5 h-5 mr-3 text-orange-500" /> 채팅방
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
              {activeTab === 'reviews' && '리뷰 관리'}
            </h3>

            {activeTab === 'selling' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'active', 'completed'] as const).map(filter => (
                  <button key={filter} onClick={() => setSellingFilter(filter)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${sellingFilter === filter ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {filter === 'all' ? '전체' : filter === 'active' ? '경매중' : '판매완료'}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'bidding' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'leader', 'outbid', 'lost'] as const).map(filter => (
                  <button key={filter} onClick={() => setBiddingFilter(filter)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${biddingFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {filter === 'all' ? '전체' : filter === 'leader' ? '상위입찰' : filter === 'outbid' ? '추월변동' : '낙찰실패'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 판매 내역 */}
                {activeTab === 'selling' && filteredSellingProducts.map(p => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <ProductCard product={p} isSold={p.status === 'completed'} />
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteClick(p)}
                        className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> 삭제하기
                      </button>

                    </div>
                  </div>
                ))}

                {/* 입찰 내역 */}
                {activeTab === 'bidding' && filteredBiddingProducts.map(p => {
                    const effectiveStatus = bidStatusOverrides[p.id] || p.bidStatus;
                  return (
                    <div key={p.id} className="flex flex-col gap-2">
                      <ProductCard
                        product={p}
                        isWon={effectiveStatus === 'won'}
                        isSold={effectiveStatus === 'lost'}
                      />
                      <div className="flex items-center justify-between px-1">
                        {getBidStatusBadge(effectiveStatus)}
                        {effectiveStatus === 'won' && (
                          <button
                            onClick={() => navigate(`/won/${p.id}`)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all font-sans ${
                              p.auctionResultStatus === '결제완료' 
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                              : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            }`}
                          >
                            {p.auctionResultStatus === '결제완료' ? '거래대기' : '결제대기'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 구매 내역 */}
                {activeTab === 'purchased' && purchasedProducts.map(p => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <ProductCard product={p} isSold />
                    <div className="flex items-center px-1">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                        구매완료
                      </span>
                    </div>
                  </div>
                ))}

                {/* 찜 목록 */}
                {activeTab === 'wishlist' && wishlistProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {activeTab === 'selling' && filteredSellingProducts.length === 0 && <EmptyState message="해당하는 판매 상품이 없습니다." />}
              {activeTab === 'bidding' && filteredBiddingProducts.length === 0 && (
                <EmptyState message={biddingFilter === 'all' ? "입찰 참여 내역이 없습니다." : "조건에 맞는 입찰 내역이 없습니다."} />
              )}
              {activeTab === 'purchased' && purchasedProducts.length === 0 && <EmptyState message="구매 완료된 상품이 없습니다." />}
              {activeTab === 'wishlist' && wishlistProducts.length === 0 && <EmptyState message="찜한 상품이 없습니다." />}
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
                          return Object.entries(tagCounts).map(([tag, count]) => (
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
                            <div>
                              <p className="font-bold text-gray-900">{review.writerNickname}</p>
                              <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
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
                              <Package className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${deleteProduct.participantCount > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                  {deleteProduct.participantCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">게시글을 삭제하시겠습니까?</h3>

              {deleteProduct.participantCount > 0 && deleteProduct.status !== 'completed' ? (
                <div className="bg-red-50 p-4 rounded-2xl mb-6">
                  <p className="text-sm text-red-600 font-bold leading-relaxed">
                    현재 입찰자가 {deleteProduct.participantCount}명 있습니다. <br />
                    경매 도중 삭제 시 매너온도가 차감될 수 있습니다.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm font-medium mb-6 leading-relaxed">
                  삭제된 게시글은 복구할 수 없습니다. <br />
                  정말로 삭제하시겠습니까?
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">
                  취소
                </button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200">
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
    <p>{message}</p>
  </div>
);
