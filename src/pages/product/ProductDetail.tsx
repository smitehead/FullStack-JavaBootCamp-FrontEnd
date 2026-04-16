import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product, CategoryItem, ProductQna } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { AlertTriangle, Package, Reply, Ban, AlertCircle, MoreVertical } from 'lucide-react';
import { BsShieldCheck, BsFlag, BsChatLeft, BsInfoCircle, BsCreditCard, BsArrowUpRight } from 'react-icons/bs';
import { BiArrowBack, BiChevronRight, BiX, BiShareAlt, BiRefresh, BiTrash } from 'react-icons/bi';
import { BsHeart, BsClock, BsGeoAlt, BsPeople, BsPerson } from 'react-icons/bs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/services/api';
import { CATEGORY_DATA } from '@/constants';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { resolveImageUrls, getProfileImageUrl } from '../../utils/imageUtils';
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

  /** 상품 삭제 처리 */
  const handleDeleteProduct = async () => {
    if (!product) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${product.id}`);
      showToast('상품이 삭제되었습니다.', 'success');
      navigate('/products');
    } catch {
      showToast('상품 삭제에 실패했습니다.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // 최고 입찰자 입찰 취소 모달 (Phase 1)
  const [showBidCancelModal, setShowBidCancelModal] = useState(false);
  const [isBidCancelling, setIsBidCancelling] = useState(false);
  // 입찰 약관 동의 모달 + 더블탭 확인 UX (Phase 0)
  const [showBidTermsModal, setShowBidTermsModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [dontAskToday, setDontAskToday] = useState(false);
  const confirmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // 백엔드 status(정수): 0=진행중, 1=낙찰완료, 2=판매자취소, 3=결제대기, 4=유찰/최종실패
      const backendStatus: number = data.status ?? 0;
      const isAuctionEnded = new Date(data.endTime).getTime() <= Date.now() || backendStatus >= 1;
      const mappedStatus: Product['status'] =
        backendStatus === 4 ? 'closed_failed' :
          backendStatus === 3 ? 'pending_payment' :
            backendStatus === 2 ? 'canceled' :
              isAuctionEnded ? 'completed' : 'active';

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
        status: mappedStatus,
        location: data.location || '',
        transactionMethod: data.tradeType === '혼합' ? 'both' : (data.tradeType === '직거래' ? 'face-to-face' : 'delivery'),
        shippingFee: data.shippingFee ?? 0,
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

      // 입찰 참여 여부: 닉네임 비교 (hasBid 뱃지용)
      if (user?.nickname) {
        const userHasBid = mappedProduct.bids.some(b => b.bidderName === user.nickname);
        setHasBid(userHasBid);
      } else {
        setHasBid(false);
      }

      // 최고입찰자 여부: 백엔드가 memberNo 기반으로 직접 판별한 값을 사용
      // SSE가 이미 실시간으로 업데이트했다면 fetchProduct의 응답으로 덮어쓰지 않음
      if (!sseHasRunRef.current) {
        setIsHighestBidder(data.isHighestBidder === true);
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

    const handlePriceUpdate = (detail: {
      productNo: number | string;
      currentPrice: number;
      bidderNo?: number | null;
      auctionEnded?: boolean;
      bidCancelled?: boolean;
    }) => {
      if (String(detail.productNo) !== String(product.id)) return;

      // SSE 수신 가격을 ref에 기록 — fetchProduct 경쟁 조건 방지
      // bidCancelled 이벤트는 가격이 내려가므로 max 비교 없이 직접 반영
      if (!detail.bidCancelled) {
        latestSsePriceRef.current = Math.max(latestSsePriceRef.current, detail.currentPrice);
      } else {
        latestSsePriceRef.current = detail.currentPrice;
      }
      sseHasRunRef.current = true;

      const myMemberNo = getMemberNo(user);
      const bidderNo = detail.bidderNo != null ? Number(detail.bidderNo) : null;
      const isMyBid = bidderNo !== null && myMemberNo !== null && bidderNo === myMemberNo;

      // ── 최고 입찰자 취소 이벤트 (Phase 1) ─────────────────────────────────────
      if (detail.bidCancelled) {
        const title = product?.title || '이 상품';
        const truncatedTitle = title.length > 10 ? title.substring(0, 10) + '..' : title;

        // 현재가를 차순위 가격으로 즉시 갱신 (전체 리로드 없음)
        setProduct(prev => prev ? ({ ...prev, currentPrice: detail.currentPrice }) : prev);
        setBidAmount(detail.currentPrice + (product?.minBidIncrement || 0));

        if (isMyBid) {
          // 내가 차순위 → 최고 입찰자로 승계됨
          setIsHighestBidder(true);
          showToast(`'${truncatedTitle}' 상위 입찰자 취소로 최고 입찰자가 되었습니다!`, 'success');
        } else {
          // 나는 다른 순위 → 가격 변동 토스트
          setIsHighestBidder(false);
          if (!justBidRef.current) {
            showToast(`'${truncatedTitle}' 1등 입찰자가 취소하여 현재가가 변동되었습니다.`, 'bid');
          }
        }
        return;
      }

      // 즉시구매/입찰가 도달로 경매 종료된 경우
      if (detail.auctionEnded) {
        setProduct(prev => prev ? ({ ...prev, currentPrice: detail.currentPrice, status: 'completed' }) : prev);
        setIsHighestBidder(isMyBid);
        if (isMyBid) {
          setHasBid(true);
        } else if (!justBidRef.current) {
          const title = product?.title || '이 상품';
          const truncatedTitle = title.length > 10 ? title.substring(0, 10) + '..' : title;
          showToast(`'${truncatedTitle}' 즉시구매로 경매가 종료되었습니다.`, 'bid');
        }
        // 경매 종료 후 최신 상태 반영
        setTimeout(() => fetchProduct(), 600);
        return;
      }

      setProduct(prev => prev ? ({ ...prev, currentPrice: detail.currentPrice }) : prev);

      // bidderNo로 입찰자 식별 → justBidRef와 관계없이 정확한 뱃지 업데이트
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
      const onAuctionCancelled = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (String(detail.productNo) !== String(product.id)) return;
        setProduct((prev: Product | null | undefined) => prev ? { ...prev, status: 'completed' } : prev);
        showToast('판매자의 사정으로 경매가 취소되었습니다.', 'error');
      };
      window.addEventListener('sse:priceUpdate', onPriceUpdate);
      window.addEventListener('sse:pointUpdate', onPointUpdate);
      window.addEventListener('sse:reconnected', onReconnected);
      window.addEventListener('sse:auctionCancelled', onAuctionCancelled);
      return () => {
        window.removeEventListener('sse:priceUpdate', onPriceUpdate);
        window.removeEventListener('sse:pointUpdate', onPointUpdate);
        window.removeEventListener('sse:reconnected', onReconnected);
        window.removeEventListener('sse:auctionCancelled', onAuctionCancelled);
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

  const handleBuyout = async () => {
    if (!user) {
      showToast("로그인이 필요한 서비스입니다.", 'error');
      navigate('/login');
      return;
    }
    if (user.isSuspended) {
      showToast("계정이 정지된 상태에서는 즉시 구매할 수 없습니다.", 'error');
      return;
    }
    if (!product?.instantPrice) return;

    if ((user?.points || 0) < Number(product.instantPrice)) {
      setShowRechargePrompt(true);
      return;
    }
    if (!window.confirm(`${Number(product.instantPrice).toLocaleString()}원에 즉시 구매하시겠습니까?\n구매 후 취소가 불가능합니다.`)) {
      return;
    }

    try {
      const memberNo = getMemberNo(user);
      if (!memberNo) return;
      justBidRef.current = true;
      setTimeout(() => { justBidRef.current = false; }, 5000);

      await api.post('/bids/buyout', { productNo: Number(product.id) });

      showToast('즉시 구매가 완료되었습니다! 입찰 내역으로 이동합니다.', 'success');
      setIsBidModalOpen(false);
      setTimeout(() => navigate('/mypage?tab=bidding'), 800);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message
        || (typeof error.response?.data === 'string' ? error.response.data : '즉시 구매에 실패했습니다.');
      showToast(errorMsg, 'error');
    }
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

      if (modalType === 'auto') {
        showToast('자동 입찰이 설정되었습니다! 입찰 내역으로 이동합니다.', 'success');
        setIsBidModalOpen(false);
        setTimeout(() => navigate('/mypage?tab=bidding'), 800);
        return;
      }

      showToast('입찰이 완료되었습니다!', 'success');
      await fetchProduct();

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : '입찰에 실패했습니다.');
      showToast(errorMsg, 'error');
    }
  };

  // 경매 마감까지 남은 시간 (시간 단위)
  const hoursLeft = product
    ? Math.max(0, (new Date(product.endTime).getTime() - Date.now()) / (1000 * 60 * 60))
    : 0;

  // 취소 조건 판별
  const cancelCondition: 'A' | 'B' | 'C' =
    product.participantCount === 0 ? 'A'
      : hoursLeft < 12 ? 'C'
        : 'B';

  const handleAuctionCancel = async () => {
    if (cancelCondition === 'C') {
      setShowCancelModal(false);
      return;
    }
    try {
      await api.post(`/products/${product.id}/cancel`);
      setShowCancelModal(false);
      showToast('경매가 취소되었습니다.', 'success');
      setProduct(prev => prev ? { ...prev, status: 'completed' } : prev);
    } catch (error: any) {
      const msg = error.response?.data?.message
        || (typeof error.response?.data === 'string' ? error.response.data : '경매 취소에 실패했습니다.');
      showToast(msg, 'error');
      setShowCancelModal(false);
    }
  };

  /**
   * 최고 입찰자 본인 입찰 취소 (Phase 1).
   * POST /api/bids/cancel  →  { productNo }
   * 성공 시: SSE broadcastBidCancelled → handlePriceUpdate(bidCancelled=true) 로 자동 반영
   */
  const handleBidCancelConfirm = async () => {
    if (!user || !product) return;
    setIsBidCancelling(true);
    try {
      await api.post(`/bids/${product.id}/cancel`);
      setShowBidCancelModal(false);
      setIsBidModalOpen(false);
      setIsHighestBidder(false);
      showToast('입찰이 취소되었습니다. 위약금이 차감되었습니다.', 'success');
      // SSE가 currentPrice를 갱신하므로 fetchProduct는 선택적으로 호출
      setTimeout(() => fetchProduct(), 800);
    } catch (error: any) {
      const msg = error.response?.data?.error
        || (typeof error.response?.data === 'string' ? error.response.data : '입찰 취소에 실패했습니다.');
      showToast(msg, 'error');
    } finally {
      setIsBidCancelling(false);
    }
  };

  /**
   * 약관 모달 내 "확인 및 입찰하기" 더블탭 UX.
   * 첫 탭: 확인 대기 상태 (3초 후 자동 해제).
   * 두 번째 탭: 모달 닫고 실제 입찰 모달 오픈.
   */
  const handleBidTermsConfirm = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      confirmTimerRef.current = setTimeout(() => setIsConfirming(false), 3000);
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setIsConfirming(false);
      setShowBidTermsModal(false);
      openBidModal('bid');
    }
  };

  /** 약관 모달 닫기 — 더블탭 대기 상태도 함께 초기화. */
  const handleBidTermsClose = () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setIsConfirming(false);
    setShowBidTermsModal(false);
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

  const isFinished = product ? (
    product.status === 'completed' ||
    product.status === 'pending_payment' ||
    product.status === 'closed_failed' ||
    product.status === 'canceled' ||
    new Date(product.endTime).getTime() <= Date.now()
  ) : false;

  const isSeller = product?.seller.id === user?.id;
  // 나의 입찰가 표시용 (금액 계산에만 사용)
  const userBids = product?.bids.filter(b => b.bidderName === user?.nickname) || [];
  const myHighestBid = userBids.length > 0 ? Math.max(...userBids.map(b => b.amount)) : 0;
  // isHighestBidder / hasBid 는 state로 관리 (SSE 실시간 반영)

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-4">
      {/* Header with Back Button & More Menu */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <BiArrowBack className="w-6 h-6 text-gray-900" />
        </button>

        {isSeller && (
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-6 h-6 text-gray-900" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                <button
                  onClick={() => { setShowMoreMenu(false); setShowDeleteModal(true); }}
                  className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
                >
                  <BiTrash className="w-4 h-4 mr-2.5" /> 삭제하기
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); setShowRepostModal(true); }}
                  className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#FF5A5A] transition-colors"
                >
                  <BiRefresh className="w-4 h-4 mr-2.5" /> 재게시하기
                </button>
              </div>
            )}
          </div>
        )}
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
                  <BiChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <button
                  onClick={() => setSelectedImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <BiChevronRight className="w-6 h-6" />
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
                <BiChevronRight className="w-3 h-3" />
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
                        {index < product.categoryPath!.length - 1 && <BiChevronRight className="w-3 h-3" />}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <span>기타</span>
                )}
                <span className="mx-1 text-gray-300">•</span>
                <span className="flex items-center">
                  <BsClock className="w-3.5 h-3.5 mr-1.5" />
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
                      <BsGeoAlt className="w-3 h-3 mr-1" /> {product.location}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center hover:text-gray-600 transition-colors font-medium"
                  >
                    <BiShareAlt className="w-4 h-4 mr-1" /> 공유하기
                  </button>
                  <Link to={`/report?productId=${product.id}`} className="flex items-center hover:text-red-500 transition-colors font-medium">
                    <BsFlag className="w-3 h-3 mr-1" /> 신고하기
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
                    <BsChatLeft className="w-4 h-4" />
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
                  <BsClock className="w-6 h-6 mr-3 shrink-0" />
                  <span>{timeLeft || '--:--:--'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 mb-2 flex items-center justify-end">
                  <BsPeople className="w-3 h-3 mr-1" />
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
                <BsHeart className={`w-8 h-8 mb-1 ${isWishlisted ? 'fill-current' : ''}`} />
                <span className="text-xs font-bold text-gray-500">
                  {product.wishlistCount || 0}
                </span>
              </button>

              {/* 2. 판매자 버튼 / 입찰자 버튼 분기 */}
              {isSeller ? (
                /* 판매자 전용: 경매 취소 or 경매 종료 표시 */
                isFinished ? (
                  <button
                    disabled
                    className="flex-1 py-4 bg-gray-100 text-gray-400 font-black rounded-2xl cursor-not-allowed opacity-70 flex items-center justify-center"
                  >
                    <span>경매 종료</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex-1 py-4 bg-gray-50 border-2 border-gray-100 text-gray-400 font-black rounded-2xl hover:bg-[#FF5A5A] hover:text-white hover:border-[#FF5A5A] transition-all duration-300 flex items-center justify-center shadow-sm active:scale-95"
                  >
                    <span>경매 취소</span>
                  </button>
                )
              ) : (
                <>
                  {/* 자동 입찰 버튼 */}
                  <button
                    onClick={() => openBidModal('auto')}
                    disabled={isFinished}
                    className="flex-1 py-4 border border-orange-500 text-orange-500 font-bold rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activeAutoBid ? '자동입찰 수정' : '자동 입찰'}
                  </button>

                  {/* 최고 입찰자: 입찰 취소하기 / 일반: 입찰 참여하기 → 약관 모달 */}
                  {isHighestBidder ? (
                    <button
                      onClick={() => setShowBidCancelModal(true)}
                      disabled={isFinished}
                      className="flex-1 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      입찰 취소하기
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowBidTermsModal(true)}
                      disabled={isFinished}
                      className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      입찰 참여하기
                    </button>
                  )}
                </>
              )}
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
                    <BsArrowUpRight className="w-5 h-5 mr-2 text-orange-500" /> 실시간 입찰 현황
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
                    {product.bids.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, visibleBidsCount).map(bid => (
                      <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-[150px] truncate" title={bid.bidderName}>
                          {bid.bidderName}
                        </td>
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
                  <span className="text-gray-900">
                    {product.transactionMethod === 'both' ? '택배거래, 직거래 가능' :
                      product.transactionMethod === 'delivery' ? '택배거래' : '직거래'}
                  </span>
                </div>
                {(product.transactionMethod === 'delivery' || product.transactionMethod === 'both') && (
                  <div className="flex border-b border-gray-50 pb-4">
                    <span className="w-32 text-gray-500 font-medium">배송비</span>
                    <span className="text-gray-900">{product.shippingFee === 0 ? '무료배송' : `${product.shippingFee?.toLocaleString()}원`}</span>
                  </div>
                )}
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
                    <BsShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">안심 결제 사용</p>
                    <p className="text-xs text-gray-400 leading-relaxed">에스크로 시스템을 통해 안전하게 거래하세요.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BsGeoAlt className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">대면 거래는 공공장소에서</p>
                    <p className="text-xs text-gray-400 leading-relaxed">밝고 안전한 장소에서 직접 상품을 확인하세요.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BsInfoCircle className="w-5 h-5 text-blue-500" />
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
                <BiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8">
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
                    <BsCreditCard className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">보유 포인트</span>
                </div>
                <div className="text-xl font-bold">
                  {(user?.points || 0).toLocaleString()}
                  <span className="text-sm ml-1 text-indigo-400">P</span>
                </div>
              </div>

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
                      <BsInfoCircle className="w-3 h-3 mr-1" /> 최소 {((product.currentPrice || 0) + (product.minBidIncrement || 0)).toLocaleString()}원 이상 입찰 가능
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
                      <BsInfoCircle className="w-3 h-3 mr-1" /> 설정한 금액까지 자동으로 상위 입찰을 진행합니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {modalType === 'bid' ? (
                isHighestBidder ? (
                  <button
                    onClick={() => {
                      setIsBidModalOpen(false);
                      setShowBidCancelModal(true);
                    }}
                    className="w-full py-5 bg-gray-50 border-2 border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-[#FF5A5A] hover:text-white hover:border-[#FF5A5A] transition-all active:scale-[0.98]"
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
                        onClick={handleBuyout}
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
                <BiX className="w-5 h-5" />
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
                    const url = window.location.href;
                    const fallbackCopy = () => {
                      const el = document.createElement('textarea');
                      el.value = url;
                      el.style.position = 'fixed';
                      el.style.opacity = '0';
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      showToast('링크가 복사되었습니다!', 'success');
                    };
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(url)
                        .then(() => showToast('링크가 복사되었습니다!', 'success'))
                        .catch(fallbackCopy);
                    } else {
                      fallbackCopy();
                    }
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

      {/* Auction Cancel Confirm Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative"
            >
              <div className="p-8">
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">경매 취소</h3>
                </div>

                <div className="mb-2">
                  {/* 조건 A: 입찰자 없음 */}
                  {cancelCondition === 'A' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                        <p className="text-sm text-gray-700 leading-relaxed font-bold">
                          현재 입찰 참여자가 없습니다. <br />
                          <span className="text-gray-900 underline underline-offset-4 decoration-2">아무런 패널티 없이</span> 즉시 취소할 수 있습니다.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowCancelModal(false)}
                          className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                        >
                          돌아가기
                        </button>
                        <button
                          onClick={handleAuctionCancel}
                          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                          취소 확정
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 조건 B: 입찰자 있음 (패널티 발생) */}
                  {cancelCondition === 'B' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <BsInfoCircle className="w-4 h-4 text-red-500" />
                          <p className="text-sm font-black text-gray-900">주의: 취소 패널티가 발생합니다</p>
                        </div>
                        <ul className="space-y-3">
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            매너온도 <span className="text-red-500 font-black">10점</span> 즉시 차감
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            포인트 벌금: <span className="text-red-500 font-black">{Math.floor(product.currentPrice * 0.03).toLocaleString()}P (현재가의 3%)</span>
                          </li>
                        </ul>
                      </div>

                      <div className="px-1">
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                          현재 <span className="font-bold text-gray-900 border-b-2 border-red-100">{product.participantCount}명</span>의 입찰자가 대기 중입니다.
                          취소 시 모든 입찰자에게 포인트가 환불되며 알림이 가요.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowCancelModal(false)}
                          className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                        >
                          돌아가기
                        </button>
                        <button
                          onClick={handleAuctionCancel}
                          className="flex-1 py-4 bg-[#FF5A5A] text-white font-bold rounded-2xl hover:bg-[#FF4545] transition-all shadow-lg shadow-red-100 active:scale-95"
                        >
                          패널티 감수하고 취소
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 조건 C: 마감 임박 */}
                  {cancelCondition === 'C' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <BsInfoCircle className="w-4 h-4 text-orange-500" />
                          <p className="text-sm font-black text-gray-900">마감 임박 (12시간 이내)</p>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed font-bold">
                          경매 종료가 얼마 남지 않아 판매자가 직접 취소할 수 없습니다.
                          부득이한 사유가 있다면 관리자에게 문의해주세요.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowCancelModal(false)}
                          className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                        >
                          닫기
                        </button>
                        <button
                          onClick={() => { setShowCancelModal(false); navigate(`/report?productId=${product.id}`); }}
                          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                          관리자에게 문의
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────
          입찰 취소 확인 모달 (Phase 1 — 최고 입찰자 본인 취소)
          - 위약금(현재 입찰가의 10%) 명시
          - 보유 포인트 부족 시 취소 버튼 비활성화
      ────────────────────────────────────────────────────────────────── */}
      {showBidCancelModal && product && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            {/* 위험 강조 상단 라인 */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />

            <div className="p-8">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center shadow-sm">
                    <BsFlag className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">입찰 취소</h3>
                    <p className="text-sm text-gray-400 font-bold mt-0.5">Bid Cancellation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBidCancelModal(false)}
                  disabled={isBidCancelling}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <BiX className="w-6 h-6" />
                </button>
              </div>

              {/* 위약금 경고 카드 */}
              {(() => {
                const penalty = Math.floor((product.currentPrice || 0) * 0.05);
                const userPoints = user?.points || 0;
                const canAfford = userPoints >= penalty;
                return (
                  <div className="space-y-6 mb-8">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <BsInfoCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-black text-red-600">취소 시 위약금이 즉시 차감됩니다</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500">현재 입찰가</span>
                          <span className="text-sm font-bold text-gray-900">
                            {(product.currentPrice || 0).toLocaleString()} P
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-red-500">위약금 (5%)</span>
                          <span className="text-base font-black text-red-600">
                            -{penalty.toLocaleString()} P
                          </span>
                        </div>
                        <div className="border-t border-red-100 pt-3 flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500">취소 후 예상 잔액</span>
                          <span className={`text-sm font-bold ${canAfford ? 'text-gray-900' : 'text-red-500'}`}>
                            {(userPoints - penalty + (product.currentPrice || 0)).toLocaleString()} P
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 보유 포인트 표시 */}
                    <div className="bg-gray-900 rounded-2xl p-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BsCreditCard className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-bold text-gray-400">현재 보유 포인트</span>
                      </div>
                      <span className={`text-base font-bold ${canAfford ? 'text-orange-400' : 'text-red-400'}`}>
                        {userPoints.toLocaleString()} P
                      </span>
                    </div>

                    {/* 포인트 부족 경고 */}
                    {!canAfford && (
                      <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <BsInfoCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-orange-700 leading-relaxed">
                          위약금 납부를 위한 포인트가 부족합니다. 포인트를 충전하셔야 취소가 가능합니다.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed text-center">
                      경매 마감 시간은 변동 없이 유지됩니다.
                      위약금은 위약금 풀에 적립되어 최종 정산 시 분배됩니다.
                    </p>
                  </div>
                );
              })()}

              {/* 액션 버튼 */}
              {(() => {
                const penalty = Math.floor((product.currentPrice || 0) * 0.05);
                const canAfford = (user?.points || 0) >= penalty;
                return (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBidCancelModal(false)}
                      disabled={isBidCancelling}
                      className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      돌아가기
                    </button>
                    {canAfford ? (
                      <button
                        onClick={handleBidCancelConfirm}
                        disabled={isBidCancelling}
                        className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBidCancelling ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />처리 중...</>
                        ) : (
                          `위약금 ${Math.floor((product.currentPrice || 0) * 0.05).toLocaleString()}P 차감 후 취소`
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowBidCancelModal(false); navigate('/points/charge'); }}
                        className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 active:scale-95"
                      >
                        포인트 충전하기
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showBidTermsModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative"
            >
              <div className="p-8">
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">입찰 참여 전 확인사항</h3>
                </div>

                {/* 약관 내용 박스 */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 space-y-4 text-sm text-gray-700 leading-relaxed">
                  <p className="font-bold text-gray-900">입찰 전 아래 사항을 반드시 확인하세요.</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>입찰가는 현재 최고가보다 <span className="text-gray-900 font-black">높아야</span> 하며, 한 번 제출된 입찰은 취소 시 <span className="text-red-500 font-black">위약금(5%)</span>이 발생합니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>경매 마감 <span className="text-gray-900 font-black">12시간 이내</span>에는 입찰 취소가 불가합니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>낙찰 후 <span className="text-gray-900 font-black">12시간 이내</span>에 결제를 완료하지 않으면 낙찰이 취소되고 차순위 입찰자에게 권한이 이전됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>입찰 포인트는 상회 입찰 발생 시 즉시 환불되며, 낙찰 시 최종 결제에 사용됩니다.</span>
                    </li>
                  </ul>
                </div>

                {/* 오늘 하루 보지 않기 체크박스 */}
                <div className="flex items-center gap-2 mb-6 px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input
                        type="checkbox"
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                        checked={dontAskToday}
                        onChange={(e) => setDontAskToday(e.target.checked)}
                      />
                      <svg
                        className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <BsInfoCircle className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                      오늘 하루 더 이상 보지 않기
                    </span>
                  </label>
                </div>

                {/* 하단 버튼 영역 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBidTermsClose}
                    className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                  >
                    뒤로가기
                  </button>
                  <button
                    onClick={handleBidTermsConfirm}
                    className={`flex-1 py-4 font-bold rounded-2xl transition-all active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 ${isConfirming ? 'animate-pulse' : ''
                      }`}
                  >
                    {isConfirming ? '한 번 더 탭하여 확인' : '확인 및 입찰하기'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
