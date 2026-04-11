import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product, CategoryItem, ProductQna } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { Heart, Share2, AlertTriangle, Clock, MapPin, Flag, ShieldCheck, ChevronRight, TrendingUp, Info, X, Wallet, ArrowLeft, Package, Users, MessageSquare, Reply } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/services/api';
import { CATEGORY_DATA } from '@/constants';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { resolveImageUrls, resolveImageUrl, getProfileImageUrl } from '../../utils/imageUtils';
import { getMemberNo } from '@/utils/memberUtils';
import { showToast } from '@/components/toastService';

// 카테고리 ID로 전체 경로를 찾는 헬퍼 함수
const findCategoryPath = (id: string | number): string[] => {
  const targetId = String(id);
  if (!targetId || targetId === '0') return ['기타'];

  for (const large of CATEGORY_DATA) {
    if (large.id === targetId) return [large.name];
    if (large.subCategories) {
      for (const medium of large.subCategories) {
        if (medium.id === targetId) return [large.name, medium.name];
        if (medium.subCategories) {
          for (const small of medium.subCategories) {
            if (small.id === targetId) return [large.name, medium.name, small.name];
          }
        }
      }
    }
  }
  return ['기타'];
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateCurrentUserPoints } = useAppContext();
  const [product, setProduct] = useState<Product | null | undefined>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'detail' | 'history' | 'shipping' | 'qna'>('detail');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [qnaList, setQnaList] = useState<ProductQna[]>([]);
  const [qnaInput, setQnaInput] = useState('');
  const [answerInputs, setAnswerInputs] = useState<Record<number, string>>({});
  const [showAnswerInput, setShowAnswerInput] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (product) {
      setIsWishlisted(product.isWishlisted || false);
    }
  }, [product]);

  useEffect(() => {
    if (id) fetchQnaList();
  }, [id]);

  const fetchQnaList = async () => {
    try {
      const res = await api.get(`/products/${id}/qna`);
      setQnaList(res.data);
    } catch {
      // 조용히 실패
    }
  };

  const handleQnaSubmit = async () => {
    if (!qnaInput.trim()) return;
    if (!user) { showToast('로그인이 필요합니다.', 'error'); return; }
    try {
      await api.post(`/products/${id}/qna`, { content: qnaInput.trim() });
      setQnaInput('');
      fetchQnaList();
    } catch {
      showToast('문의 등록에 실패했습니다.', 'error');
    }
  };

  const handleQnaDelete = async (qnaNo: number) => {
    if (!confirm('문의를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/products/${id}/qna/${qnaNo}`);
      fetchQnaList();
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  const handleAnswerSubmit = async (qnaNo: number) => {
    const answer = answerInputs[qnaNo];
    if (!answer?.trim()) return;
    try {
      await api.post(`/products/${id}/qna/${qnaNo}/answer`, { answer: answer.trim() });
      setAnswerInputs(prev => ({ ...prev, [qnaNo]: '' }));
      setShowAnswerInput(prev => ({ ...prev, [qnaNo]: false }));
      fetchQnaList();
    } catch {
      showToast('답변 등록에 실패했습니다.', 'error');
    }
  };

  const handleAnswerDelete = async (qnaNo: number) => {
    if (!confirm('답변을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/products/${id}/qna/${qnaNo}/answer`);
      fetchQnaList();
    } catch {
      showToast('답변 삭제에 실패했습니다.', 'error');
    }
  };

  const currentMemberNo = getMemberNo(user);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['detail', 'history', 'shipping', 'qna'];
      const scrollPosition = window.scrollY + 300;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveTab(section as any);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 입찰 관련 상태
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'bid' | 'auto'>('bid');
  const [autoBidMaxAmount, setAutoBidMaxAmount] = useState<number>(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showRechargePrompt, setShowRechargePrompt] = useState(false);
  const [activeAutoBid, setActiveAutoBid] = useState<{ autoBidNo: number; maxPrice: number } | null>(null);

  const [visibleBidsCount, setVisibleBidsCount] = useState(5);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // 입찰 참여 여부 및 최고입찰자 여부 (SSE 실시간 반영)
  const [hasBid, setHasBid] = useState(false);
  const [isHighestBidder, setIsHighestBidder] = useState(false);

  // 입찰 성공 후 상품 데이터 재조회
  const fetchProduct = React.useCallback(async () => {
    try {
      const memberNo = getMemberNo(user);
      let url = `/products/${id}`;
      if (memberNo) url += `?memberNo=${memberNo}`;

      const response = await api.get(url);
      const data = response.data;

      const isFinished = new Date(data.endTime).getTime() <= Date.now() || data.status === 'completed';

      const mappedProduct: Product = {
        id: String(data.productNo || id),
        title: data.title,
        description: data.description || '',
        category: data.categoryName || (data.categoryNo ? findCategoryPath(data.categoryNo).join(' > ') : (data.category || '기타')),
        seller: {
          id: data.seller?.sellerNo ? `user_${data.seller.sellerNo}` : 'seller_1',
          nickname: data.seller?.nickname || '판매자',
          profileImage: getProfileImageUrl(data.seller?.profileImgUrl),
          points: 0,
          mannerTemp: data.seller?.mannerTemp || 36.5,
          joinedAt: ''
        },
        startPrice: data.startPrice || 0,
        currentPrice: data.currentPrice || 0,
        minBidIncrement: data.minBidUnit || 1000,
        instantPrice: data.buyoutPrice || null,
        startTime: data.createdAt || new Date().toISOString(),
        endTime: data.endTime,
        images: resolveImageUrls(data.images || []),
        participantCount: data.participantCount || 0,
        bids: (data.bidHistory || []).map((b: any, idx: number) => ({
          id: `bid_${idx}`,
          bidderName: b.bidderNickname,
          amount: b.bidPrice,
          timestamp: b.bidTime
        })),
        status: isFinished ? 'completed' : 'active',
        location: data.location || '',
        transactionMethod: data.tradeType === '혼합' ? 'both' : (data.tradeType === '직거래' ? 'face-to-face' : 'delivery'),
        isWishlisted: data.isWishlisted || false,
        wishlistCount: data.wishlistCount || 0,
        categoryPath: data.categoryPath || []
      };

      // SSE가 이미 더 높은 가격을 수신했다면 되돌리지 않음 (fetchProduct 경쟁 조건 방지)
      const priceToUse = Math.max(mappedProduct.currentPrice, latestSsePriceRef.current);
      const finalProduct = { ...mappedProduct, currentPrice: priceToUse };
      setProduct(finalProduct);
      setBidAmount((priceToUse || 0) + (mappedProduct.minBidIncrement || 0));
      setAutoBidMaxAmount((priceToUse || 0) + (mappedProduct.minBidIncrement || 0) * 5);
      setIsWishlisted(mappedProduct.isWishlisted || false);

      // 입찰 참여 여부 및 최고입찰자 여부 계산 (timestamp 기준 정렬 후 마지막 입찰자 확인)
      if (user?.nickname) {
        const sortedBids = [...mappedProduct.bids].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const userHasBid = sortedBids.some(b => b.bidderName === user.nickname);
        setHasBid(userHasBid);
        // SSE가 이미 최고입찰자 여부를 판단했다면 fetchProduct가 덮어쓰지 않음
        if (!sseHasRunRef.current) {
          const userIsHighest = sortedBids.length > 0 && sortedBids[0].bidderName === user.nickname;
          setIsHighestBidder(userIsHighest);
        }
      } else {
        setHasBid(false);
        if (!sseHasRunRef.current) {
          setIsHighestBidder(false);
        }
      }

      // 활성 자동입찰 조회 (로그인 사용자만)
      const loginMemberNo = getMemberNo(user);
      if (loginMemberNo) {
        try {
          const autoBidRes = await api.get(`/auto-bid/active?productNo=${data.productNo}`);
          if (autoBidRes.status === 200 && autoBidRes.data) {
            setActiveAutoBid({ autoBidNo: autoBidRes.data.autoBidNo, maxPrice: autoBidRes.data.maxPrice });
          } else {
            setActiveAutoBid(null);
          }
        } catch {
          setActiveAutoBid(null);
        }
      }

    } catch (error) {
      console.error('상품 상세 조회 실패', error);
      setProduct(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [fetchProduct]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (!product) return;
    const updateTime = () => {
      const end = new Date(product.endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('--:--:--');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [product]);

  // -----------------------------------------------------------------------------
  // 실시간 SSE 구독 (가격 업데이트 + 포인트 업데이트)
  // - priceUpdate: 다른 사람이 입찰하면 현재 가격 즉시 갱신
  // - pointUpdate: 내 포인트가 변경되면(입찰차감/환불) 즉시 팝업과 헤더에 반영
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (!product || !product.id) return;

    const handlePriceUpdate = (detail: { productNo: number | string; currentPrice: number; bidderNo?: number | null }) => {
      if (String(detail.productNo) !== String(product.id)) return;

      // SSE 수신 가격을 ref에 기록 — fetchProduct 경쟁 조건 방지
      latestSsePriceRef.current = Math.max(latestSsePriceRef.current, detail.currentPrice);
      sseHasRunRef.current = true;

      setProduct(prev => prev ? ({ ...prev, currentPrice: detail.currentPrice }) : prev);

      // bidderNo로 입찰자 식별 → justBidRef와 관계없이 정확한 뱃지 업데이트
      const myMemberNo = getMemberNo(user);
      const bidderNo = detail.bidderNo != null ? Number(detail.bidderNo) : null;
      const isMyBid = bidderNo !== null && myMemberNo !== null && bidderNo === myMemberNo;

      if (isMyBid) {
        // 내 입찰 SSE 확인 — 최고입찰자로 확정
        setIsHighestBidder(true);
        setHasBid(true);
      } else {
        // 타인 입찰 → 추월당함 (justBidRef 관계없이 뱃지 즉시 반영)
        setIsHighestBidder(false);
        if (!justBidRef.current) {
          const title = product?.title || '이 상품';
          const truncatedTitle = title.length > 10 ? title.substring(0, 10) + '..' : title;
          showToast(`'${truncatedTitle}' 상품에 새로운 입찰이 생겼습니다!`, 'bid');
        }
      }

      const loginMemberNo = getMemberNo(user);
      if (loginMemberNo) {
        api.get(`/auto-bid/active?productNo=${detail.productNo}`)
          .then(res => setActiveAutoBid(res.status === 200 && res.data
            ? { autoBidNo: res.data.autoBidNo, maxPrice: res.data.maxPrice }
            : null))
          .catch(() => setActiveAutoBid(null));
      }
    };

    const handlePointUpdate = (detail: { points: number }) => {
      if (typeof detail.points !== 'number') return;
      updateCurrentUserPoints(detail.points);
      const currentMemberNo = getMemberNo(user);
      if (currentMemberNo && product?.id) {
        api.get(`/auto-bid/active?productNo=${product.id}`)
          .then(res => setActiveAutoBid(res.status === 200 && res.data
            ? { autoBidNo: res.data.autoBidNo, maxPrice: res.data.maxPrice }
            : null))
          .catch(() => setActiveAutoBid(null));
      }
    };

    if (user) {
      // 로그인 사용자: AppContext SSE가 이미 연결됨 → window custom event만 수신 (중복 연결 방지)
      const onPriceUpdate = (e: Event) => handlePriceUpdate((e as CustomEvent).detail);
      const onPointUpdate = (e: Event) => handlePointUpdate((e as CustomEvent).detail);
      const onReconnected = () => {
        // SSE 재연결 시 누락된 정보 보정 — SSE 플래그 초기화 후 fetchProduct가 권위 있는 출처로 동작
        sseHasRunRef.current = false;
        latestSsePriceRef.current = 0;
        fetchProduct();
      };
      window.addEventListener('sse:priceUpdate', onPriceUpdate);
      window.addEventListener('sse:pointUpdate', onPointUpdate);
      window.addEventListener('sse:reconnected', onReconnected);
      return () => {
        window.removeEventListener('sse:priceUpdate', onPriceUpdate);
        window.removeEventListener('sse:pointUpdate', onPointUpdate);
        window.removeEventListener('sse:reconnected', onReconnected);
      };
    } else {
      // 비로그인 사용자: priceUpdate 수신을 위해 SSE 직접 연결
      const clientId = `product_${id}_${Math.random().toString(36).slice(2, 9)}`;
      const eventSource = new EventSource(`/api/sse/subscribe?clientId=${clientId}`);
      eventSource.addEventListener('priceUpdate', (event: MessageEvent) => {
        try { handlePriceUpdate(JSON.parse(event.data)); }
        catch (e) { console.error('[SSE] priceUpdate 파싱 오류', e); }
      });
      eventSource.onerror = () => { };
      return () => eventSource.close();
    }
  }, [product?.id, user?.id]);

  const prevPriceRef = React.useRef<number>(0);
  // 내가 직접 입찰한 직후 SSE priceUpdate 토스트 중복 방지용 플래그
  const justBidRef = React.useRef(false);
  // SSE로 수신한 가장 최근 가격 — fetchProduct 경쟁 조건으로 인한 가격 역행 방지
  const latestSsePriceRef = React.useRef<number>(0);
  // SSE가 최고입찰자 여부를 결정했는지 여부 — fetchProduct가 덮어쓰지 못하도록 보호
  const sseHasRunRef = React.useRef(false);

  useEffect(() => {
    if (product && prevPriceRef.current > 0 && product.currentPrice > prevPriceRef.current) {
      const oldPrice = prevPriceRef.current;
      const minInc = product.minBidIncrement || 0;
      setBidAmount(prev => prev === oldPrice + minInc ? product.currentPrice + minInc : prev);
      setAutoBidMaxAmount(prev => prev === oldPrice + minInc * 5 ? product.currentPrice + minInc * 5 : prev);
    }
    if (product) {
      prevPriceRef.current = product.currentPrice;
    }
  }, [product?.currentPrice]);

  if (product === null) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (product === undefined) return (
    <div className="max-w-[1200px] mx-auto px-10 py-32 text-center">
      <div className="bg-white rounded-2xl border border-gray-100 p-20 shadow-sm">
        <Package className="w-20 h-20 text-gray-200 mx-auto mb-8" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">상품을 찾을 수 없거나 접근 권한이 없습니다.</h2>
        <p className="text-gray-400 font-medium mb-10 leading-relaxed">
          해당 상품이 삭제되었거나, 종료된 경매로 접근이 제한되었습니다.<br />
          판매자 또는 입찰 참여자만 종료된 상품을 확인할 수 있습니다.
        </p>
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => navigate('/search')}
            className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10 active:scale-95"
          >
            다른 상품 둘러보기
          </button>
          <button
            onClick={() => navigate('/search')}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 underline underline-offset-4"
          >
            필터 초기화
          </button>
        </div>
      </div>
    </div>
  );

  const openBidModal = async (type: 'bid' | 'auto') => {
    if (!user) {
      showToast("'로그인이 필요한 서비스입니다.' 로그인 페이지로 이동합니다.", 'error');
      navigate('/login');
      return;
    }
    if (user.isSuspended) {
      showToast("'계정이 정지된 상태'에서는 입찰에 참여할 수 없습니다.", 'error');
      return;
    }

    if (product?.seller.id === user?.id) {
      showToast('본인이 등록한 상품에는 입찰할 수 없습니다.', 'error');
      return;
    }

    if (type === 'bid' && activeAutoBid) {
      showToast("'자동 입찰이 활성화'된 상태입니다. 자동 입찰 설정을 먼저 종료하거나 수정해 주세요.", 'warning');
      return;
    }

    // 백엔드에서 실시간 포인트 조회
    try {
      const memberNo = getMemberNo(user);
      if (!memberNo) return;
      const res = await api.get(`/members/${memberNo}`);
      updateCurrentUserPoints(res.data.points);
    } catch (e) {
      console.error("포인트 조회 실패", e);
    }

    setModalType(type);
    setBidAmount(product.currentPrice + product.minBidIncrement);
    if (type === 'auto' && activeAutoBid) {
      setAutoBidMaxAmount(activeAutoBid.maxPrice);
    } else if (type === 'auto') {
      setAutoBidMaxAmount(product.currentPrice + product.minBidIncrement * 5);
    }
    setIsBidModalOpen(true);
  };

  const handleBidSubmit = async () => {
    if (product?.seller.id === user?.id) {
      showToast('본인이 등록한 상품에는 입찰할 수 없습니다.', 'error');
      setIsBidModalOpen(false);
      return;
    }
    if (user?.isSuspended) {
      showToast("'계정이 정지된 상태'에서는 입찰에 참여할 수 없습니다.", 'error');
      setIsBidModalOpen(false);
      return;
    }
    const amountToValidate = modalType === 'bid' ? bidAmount : autoBidMaxAmount;

    if (modalType === 'bid' && bidAmount < product.currentPrice + product.minBidIncrement) {
      showToast("'최소 입찰 금액'을 확인해주세요.", 'error');
      return;
    }

    if (modalType === 'auto' && autoBidMaxAmount <= product.currentPrice) {
      showToast("'자동 입찰 한도'는 현재가보다 높아야 합니다.", 'error');
      return;
    }

    if (amountToValidate > (user?.points || 0)) {
      setShowRechargePrompt(true);
      return;
    }

    try {
      const memberNo = getMemberNo(user);
      if (!memberNo) return;
      justBidRef.current = true;
      setTimeout(() => { justBidRef.current = false; }, 3000);

      if (modalType === 'auto') {
        await api.post('/auto-bid', {
          productNo: Number(product.id),
          maxPrice: autoBidMaxAmount
        });
      } else {
        await api.post('/bids', {
          productNo: product.id,
          memberNo: memberNo,
          bidPrice: amountToValidate
        });
      }

      // 내가 방금 입찰 → 즉시 최고입찰자로 표시 (fetchProduct 완료 전 선반영)
      setHasBid(true);
      setIsHighestBidder(true);
      showToast(modalType === 'bid' ? '입찰이 완료되었습니다!' : '자동 입찰이 설정되었습니다!', 'success');
      await fetchProduct();

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : '입찰에 실패했습니다.');
      showToast(errorMsg, 'error');
    }
  };

  const chartData = [...product.bids]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(bid => ({
      time: new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: bid.amount
    }));

  // 입찰 내역이 없을 경우 시작가를 차트 기준점으로 추가
  if (chartData.length === 0) {
    chartData.push({
      time: new Date(product.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: product.startPrice
    });
  }

  const toggleWishlist = async () => {
    if (!user) {
      showToast("'로그인이 필요한 서비스입니다.' 로그인 페이지로 이동합니다.", 'error');
      navigate('/login');
      return;
    }
    try {
      const response = await api.post(`/wishlists/toggle?productNo=${product?.id}`);
      const newState = response.data;

      setIsWishlisted(newState);
      setProduct(prev => prev ? ({
        ...prev,
        isWishlisted: newState,
        wishlistCount: Math.max(0, (prev.wishlistCount || 0) + (newState ? 1 : -1))
      }) : null);
    } catch (error) {
      console.error('위시리스트 변경 실패', error);
      showToast('찜하기 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const isFinished = product ? (product.status === 'completed' || new Date(product.endTime).getTime() <= Date.now()) : false;

  const isSeller = product?.seller.id === user?.id;
  // 나의 입찰가 표시용 (금액 계산에만 사용)
  const userBids = product?.bids.filter(b => b.bidderName === user?.nickname) || [];
  const myHighestBid = userBids.length > 0 ? Math.max(...userBids.map(b => b.amount)) : 0;
  // isHighestBidder / hasBid 는 state로 관리 (SSE 실시간 반영)

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Top Section: Image & Info */}
      <div className="flex flex-col lg:flex-row gap-10 mb-12">

        {/* Left: Images */}
        <div className="lg:w-[55%] flex flex-col relative group">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm relative flex items-center justify-center">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[selectedImage]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500" />
            ) : (
              <div className="flex flex-col items-center text-gray-300">
                <Package className="w-20 h-20 mb-2" />
                <span className="text-sm font-medium">등록된 이미지가 없습니다.</span>
              </div>
            )}

            {/* Bidding Status Chip */}
            {!isFinished && hasBid && (
              <div className="absolute top-6 left-6 z-10 animate-in zoom-in duration-500">
                <div className={`flex items-center px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md ${isHighestBidder
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-500 text-white'
                  }`}>
                  <span className="text-xs font-semibold tracking-tight">
                    입찰 중 <span className="mx-1.5 opacity-50">|</span> {isHighestBidder ? '최고 입찰' : '추월 변동'}
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <button
                  onClick={() => setSelectedImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${selectedImage === idx ? 'bg-orange-500 w-4' : 'bg-white/50 hover:bg-white'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Info & Bidding */}
        <div className="lg:w-[45%] flex flex-col">
          <div className="flex-1">
            {/* Breadcrumb & Time */}
            <div className="flex items-center justify-between mb-2">
              <nav className="flex items-center text-xs text-gray-400 space-x-1">
                <Link to="/search" className="hover:text-gray-900 transition-colors">홈</Link>
                <ChevronRight className="w-3 h-3" />
                {product.categoryPath && product.categoryPath.length > 0 ? (
                  product.categoryPath.map((cat, index) => {
                    // 대/중/소 분류 단계에 맞는 쿼리 파라미터 생성
                    const queryParams = new URLSearchParams();
                    if (index >= 0) queryParams.set('large', String(product.categoryPath![0].id));
                    if (index >= 1) queryParams.set('medium', String(product.categoryPath![1].id));
                    if (index >= 2) queryParams.set('small', String(product.categoryPath![2].id));

                    return (
                      <React.Fragment key={cat.id}>
                        <Link
                          to={`/search?${queryParams.toString()}`}
                          className="hover:text-gray-900 transition-colors font-medium"
                        >
                          {cat.name}
                        </Link>
                        {index < product.categoryPath!.length - 1 && <ChevronRight className="w-3 h-3" />}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <span>기타</span>
                )}
                <span className="mx-1 text-gray-300">•</span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(product.startTime || Date.now()), { addSuffix: true, locale: ko })}
                </span>
              </nav>
            </div>

            {/* Title & Tags */}
            <div className="flex flex-col mb-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">{product.title}</h1>
              <div className="flex flex-wrap gap-2 mb-3">
                {(product.transactionMethod === 'face-to-face' || product.transactionMethod === 'both') && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">직거래</span>
                )}
                {(product.transactionMethod === 'delivery' || product.transactionMethod === 'both') && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">택배거래</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center">
                  {(product.transactionMethod !== 'delivery' && product.location) && (
                    <>
                      <MapPin className="w-3 h-3 mr-1" /> {product.location}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center hover:text-gray-600 transition-colors font-medium"
                  >
                    <Share2 className="w-3 h-3 mr-1" /> 공유하기
                  </button>
                  <Link to={`/report?productId=${product.id}`} className="flex items-center hover:text-red-500 transition-colors font-medium">
                    <Flag className="w-3 h-3 mr-1" /> 신고하기
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Seller Profile - Compact single line */}
          <div className="mb-4 pb-4 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <Link to={`/seller/${product.seller.id}`} className="font-bold text-base text-gray-900 block">{product.seller.nickname}</Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs font-bold text-[#009678]">매너온도 {Number(product.seller.mannerTemp).toFixed(1)}</div>
                    <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#009678]" style={{ width: `${product.seller.mannerTemp}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(isFinished && product.winnerId === user?.id) && (
                  <button
                    onClick={() => navigate(`/chat?id=chat_1`)}
                    className="px-3 py-1.5 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg border border-gray-200 transition-all flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-bold">채팅하기</span>
                  </button>
                )}
                <Link to={`/seller/${product.seller.id}`}>
                  <img src={getProfileImageUrl(product.seller.profileImage)} alt="Seller" className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                </Link>
              </div>
            </div>
          </div>

          {/* Auction Status Card */}
          <div id="bid-card" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mt-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-bold text-gray-400 mb-2">남은 시간</p>
                <div className={`flex items-center text-2xl font-bold font-mono tracking-tight ${isFinished ? 'text-gray-400' : 'text-red-500'}`}>
                  <Clock className="w-6 h-6 mr-3 shrink-0" />
                  <span>{timeLeft || '--:--:--'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 mb-2 flex items-center justify-end">
                  <Users className="w-3 h-3 mr-1" />
                  {product.participantCount}명 참여 중
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">시작 입찰가</span>
                <span className="font-bold text-gray-900">{(product.startPrice || 0).toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">최소 입찰 단위</span>
                <span className="font-bold text-gray-900">{(product.minBidIncrement || 0).toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">즉시 구매가</span>
                <span className="font-bold text-emerald-600">
                  {product.instantPrice ? `${Number(product.instantPrice).toLocaleString()} 원` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                <span className="text-gray-500 font-bold mb-1">{isFinished ? '최종 낙찰가' : '현재 입찰가'}</span>
                <span className={`text-3xl font-bold ${isFinished ? 'text-gray-900' : 'text-orange-500'}`}>{(product.currentPrice || 0).toLocaleString()} 원</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 1. 찜하기 버튼 */}
              <button
                onClick={toggleWishlist}
                className={`flex flex-col items-center justify-center transition-all min-w-[48px] ${isWishlisted ? 'text-red-500' : 'text-gray-300 hover:text-gray-400'}`}
              >
                <Heart className={`w-8 h-8 mb-1 ${isWishlisted ? 'fill-current' : ''}`} />
                <span className="text-xs font-bold text-gray-500">
                  {product.wishlistCount || 0}
                </span>
              </button>

              {/* 2. 자동 입찰 버튼 (감싸던 div 삭제) */}
              <button
                onClick={() => openBidModal('auto')}
                disabled={isFinished}
                className="flex-1 py-4 border border-orange-500 text-orange-500 font-bold rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeAutoBid ? '자동입찰 수정' : '자동 입찰'}
              </button>

              <button
                onClick={() => openBidModal('bid')}
                disabled={isFinished}
                className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                입찰 참여하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Content Sections */}
      <div className="border-t border-gray-100 pt-8">
        {/* Sticky Tabs for Navigation */}
        <div className="sticky top-[80px] md:top-[120px] bg-white z-40 border-b border-gray-100 mb-8 -mx-10 px-10 transition-all duration-300">
          <div className="flex">
            {[
              { id: 'detail', label: '상품 상세' },
              { id: 'history', label: `입찰 기록 (${product.participantCount})` },
              { id: 'shipping', label: '배송 정보' },
              { id: 'qna', label: `상품문의 (${qnaList.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  const element = document.getElementById(tab.id);
                  if (element) {
                    const headerOffset = 250;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`pb-4 px-6 font-bold text-sm transition-all relative ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left: Content */}
          <div className="lg:w-[70%] space-y-20">
            {/* Detail Section */}
            <div id="detail" className="scroll-mt-[300px] space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">상품 상세 설명</h3>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-500" /> 실시간 입찰 현황
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">시작가 대비</span>
                    <span className="text-sm font-bold text-orange-500">
                      +{(((product.currentPrice - product.startPrice) / product.startPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(value) => `${((value || 0) / 10000).toLocaleString()}만`} stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => `${(value || 0).toLocaleString()}원`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div id="history" className="scroll-mt-[300px] space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">입찰 기록</h3>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold">입찰자</th>
                      <th className="px-6 py-4 text-right font-bold">입찰 금액</th>
                      <th className="px-6 py-4 text-right font-bold">입찰 시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {product.bids.slice().reverse().slice(0, visibleBidsCount).map(bid => (
                      <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{bid.bidderName}</td>
                        <td className="px-6 py-4 text-right font-bold text-orange-500">{(bid.amount || 0).toLocaleString()}원</td>
                        <td className="px-6 py-4 text-right text-gray-400">{new Date(bid.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {product.bids.length > visibleBidsCount && (
                  <button
                    onClick={() => setVisibleBidsCount(prev => Math.min(prev + 5, product.bids.length))}
                    className="w-full py-4 bg-gray-50 text-gray-500 font-bold text-sm hover:bg-gray-100 transition-colors border-t border-gray-100 flex items-center justify-center gap-2"
                  >
                    입찰 기록 5개 더보기 ({visibleBidsCount} / {product.bids.length})
                  </button>
                )}
              </div>
            </div>

            {/* Shipping Section */}
            <div id="shipping" className="scroll-mt-[300px] space-y-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">배송 정보</h3>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                <div className="flex border-b border-gray-50 pb-4">
                  <span className="w-32 text-gray-500 font-medium">배송 방법</span>
                  <span className="text-gray-900">택배거래, 직거래 가능</span>
                </div>
                <div className="flex border-b border-gray-50 pb-4">
                  <span className="w-32 text-gray-500 font-medium">배송비</span>
                  <span className="text-gray-900">3,000원 (도서산간 지역 제외)</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-gray-500 font-medium">거래 지역</span>
                  <span className="text-gray-900">{product.location}</span>
                </div>
              </div>
            </div>

            {/* QnA Section */}
            <div id="qna" className="scroll-mt-[300px] space-y-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">상품문의 ({qnaList.length})</h3>
              {!isFinished && !isSeller && (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={qnaInput}
                    onChange={e => setQnaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQnaSubmit()}
                    placeholder="상품에 대해 궁금한 점을 남겨주세요."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                  <button onClick={handleQnaSubmit} className="bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-black transition-colors">등록</button>
                </div>
              )}
              <div className="space-y-6">
                {qnaList.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">아직 등록된 문의가 없습니다.</p>
                )}
                {qnaList.map(qna => (
                  <div key={qna.qnaNo} className="border-b border-gray-100 pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{qna.memberNickname}</span>
                        {currentMemberNo === qna.memberNo && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">작성자</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{new Date(qna.createdAt).toLocaleDateString('ko-KR')}</span>
                        {currentMemberNo === qna.memberNo && (
                          <button onClick={() => handleQnaDelete(qna.qnaNo)} className="text-[10px] text-gray-400 hover:text-red-400">삭제</button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{qna.content}</p>

                    {qna.answer ? (
                      <div className="bg-gray-50 p-4 rounded-xl ml-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-orange-600">판매자 답변</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-400">{qna.answeredAt ? new Date(qna.answeredAt).toLocaleDateString('ko-KR') : ''}</span>
                            {isSeller && (
                              <button onClick={() => handleAnswerDelete(qna.qnaNo)} className="text-[10px] text-gray-400 hover:text-red-400">삭제</button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{qna.answer}</p>
                      </div>
                    ) : (
                      isSeller && !isFinished && (
                        showAnswerInput[qna.qnaNo] ? (
                          <div className="ml-6 flex gap-2 mt-2">
                            <input
                              type="text"
                              value={answerInputs[qna.qnaNo] || ''}
                              onChange={e => setAnswerInputs(prev => ({ ...prev, [qna.qnaNo]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(qna.qnaNo)}
                              placeholder="답변을 입력하세요."
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            />
                            <button onClick={() => handleAnswerSubmit(qna.qnaNo)} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600">등록</button>
                            <button onClick={() => setShowAnswerInput(prev => ({ ...prev, [qna.qnaNo]: false }))} className="text-sm text-gray-400 hover:text-gray-600 px-2">취소</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAnswerInput(prev => ({ ...prev, [qna.qnaNo]: true }))}
                            className="mt-2 ml-6 flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-orange-500"
                          >
                            <Reply className="w-3 h-3" /> 답글 달기
                          </button>
                        )
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:w-[30%]">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm sticky top-[160px] md:top-[200px] transition-all duration-300">
              <h4 className="font-bold text-gray-900 mb-6">안전 거래 팁</h4>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">안심 결제 사용</p>
                    <p className="text-xs text-gray-400 leading-relaxed">에스크로 시스템을 통해 안전하게 거래하세요.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">대면 거래는 공공장소에서</p>
                    <p className="text-xs text-gray-400 leading-relaxed">밝고 안전한 장소에서 직접 상품을 확인하세요.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">상품 꼼꼼히 확인</p>
                    <p className="text-xs text-gray-400 leading-relaxed">거래 완료 전에 반드시 상태를 체크하세요.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      {isBidModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {modalType === 'bid' ? '입찰 참여하기' : '자동 입찰 설정'}
              </h3>
              <button onClick={() => setIsBidModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* My Participation Status */}
              {hasBid && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${isHighestBidder ? 'bg-emerald-500' : 'bg-red-500'}`} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isHighestBidder ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className={`text-xs font-bold ${isHighestBidder ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isHighestBidder ? '현재 최고 입찰 중' : '상위 입찰자 발생'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">나의 입찰가</span>
                      <span className="text-sm font-bold text-gray-900">{myHighestBid.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Point Info */}
              <div className="bg-gray-900 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <Wallet className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">보유 포인트</span>
                </div>
                <span className="text-xl font-bold text-orange-400">{(user?.points || 0).toLocaleString()} P</span>
              </div>

              {/* Price Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">현재가</p>
                  <p className="text-lg font-bold text-gray-900">{(product.currentPrice || 0).toLocaleString()}원</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">최소 입찰 단위</p>
                  <p className="text-lg font-bold text-gray-900">{(product.minBidIncrement || 0).toLocaleString()}원</p>
                </div>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                {modalType === 'bid' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">입찰 금액</label>
                      {product.instantPrice ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          즉시 구매가: {Number(product.instantPrice).toLocaleString()}원
                        </span>
                      ) : null}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={bidAmount}
                        step={product.minBidIncrement}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-xl font-bold focus:border-orange-500 focus:bg-white outline-none transition-all pr-12"
                      />
                      <span className="absolute right-6 font-bold text-gray-400 pointer-events-none">원</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center">
                      <Info className="w-3 h-3 mr-1" /> 최소 {((product.currentPrice || 0) + (product.minBidIncrement || 0)).toLocaleString()}원 이상 입찰 가능
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">자동 입찰 한도</label>
                      {product.instantPrice ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          즉시 구매가: {Number(product.instantPrice).toLocaleString()}원
                        </span>
                      ) : null}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={autoBidMaxAmount}
                        step={product.minBidIncrement}
                        onChange={(e) => setAutoBidMaxAmount(Number(e.target.value))}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-xl font-bold focus:border-orange-500 focus:bg-white outline-none transition-all pr-12"
                      />
                      <span className="absolute right-6 font-bold text-gray-400 pointer-events-none">원</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center">
                      <Info className="w-3 h-3 mr-1" /> 설정한 금액까지 자동으로 상위 입찰을 진행합니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {modalType === 'bid' ? (
                isHighestBidder ? (
                  <button
                    onClick={() => {
                      showToast("입찰이 취소되었습니다.", 'success');
                      setIsBidModalOpen(false);
                    }}
                    className="w-full py-5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                  >
                    입찰 취소하기
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleBidSubmit}
                      className="flex-1 py-5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-[0.98]"
                    >
                      입찰하기
                    </button>
                    {product.instantPrice && (
                      <button
                        onClick={() => {
                          if ((user?.points || 0) < Number(product.instantPrice)) {
                            setShowRechargePrompt(true);
                            return;
                          }
                          if (window.confirm(`${Number(product.instantPrice).toLocaleString()}원에 즉시 구매하시겠습니까?`)) {
                            showToast('즉시 구매가 완료되었습니다!', 'success');
                            setIsBidModalOpen(false);
                          }
                        }}
                        className="flex-1 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]"
                      >
                        즉시 구매하기
                      </button>
                    )}
                  </div>
                )
              ) : (
                activeAutoBid ? (
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          await api.delete(`/auto-bid/${product.id}`);
                        } catch (err: any) {
                          if (err?.response?.status !== 400) {
                            showToast('자동입찰 취소에 실패했습니다.', 'error');
                            return;
                          }
                        }
                        setActiveAutoBid(null);
                        showToast("자동 입찰이 취소되었습니다.", 'success');
                        setIsBidModalOpen(false);
                      }}
                      className="flex-1 py-5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                      취소하기
                    </button>
                    <button
                      onClick={handleBidSubmit}
                      className="flex-1 py-5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-[0.98]"
                    >
                      변경하기
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleBidSubmit}
                    className="w-full py-5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-[0.98]"
                  >
                    자동 입찰 설정하기
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">공유하기</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-sm text-gray-500 mb-4 font-bold">상품 링크 복사</p>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400 truncate flex-1 font-medium">
                  {window.location.href}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('링크가 복사되었습니다!', 'success');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 shrink-0"
                >
                  복사
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Prompt Modal */}
      {showRechargePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">포인트가 부족합니다</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              입찰을 진행하기 위해 포인트 충전이 필요합니다.<br />
              현재 보유 포인트: <span className="text-indigo-600 font-bold">{(user?.points || 0).toLocaleString()}P</span><br />
              지금 충전하러 가시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRechargePrompt(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                나중에
              </button>
              <button
                onClick={() => navigate('/points/charge')}
                className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                충전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
