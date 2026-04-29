import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { resolveImageUrl, getProfileImageUrl } from '@/utils/imageUtils';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';
import { AlertCircle } from 'lucide-react';
import { BsXCircle, BsBox2, BsCreditCard, BsInfoCircle, BsChat, BsChevronLeft, BsChevronRight, BsGeoAltFill, BsPerson, BsCopy, BsArrowRepeat } from 'react-icons/bs';
import { showToast } from '@/components/toastService';
import { ReviewModal } from '@/components/ReviewModal';

interface SellerResultDetail {
  resultNo: number;
  status: string; // 배송대기 | 취소요청 | 결제완료 | 구매확정 | 거래취소
  confirmedAt: string | null;
  productNo: number;
  title: string;
  description: string;
  finalPrice: number;
  tradeType: string;
  location: string | null;
  images: string[];
  buyer: {
    buyerNo: number;
    nickname: string;
    mannerTemp: number;
    profileImage?: string;
  };
  deliveryAddrRoad: string | null;
  deliveryAddrDetail: string | null;
  hasReview?: boolean;
  hasBuyerReview?: boolean;
  hasSellerReview?: boolean;
  createdAt: string;
}

export const SellerAuctionResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isInitialized } = useAppContext();

  const [result, setResult] = useState<SellerResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeTransactionTab, setActiveTransactionTab] = useState<'delivery' | 'face-to-face'>('delivery');
  const [chatRoomNo, setChatRoomNo] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/auction-results/seller/product/${id}`);
      const data = res.data;
      setResult(data);
      if (data.tradeType === '직거래') {
        setActiveTransactionTab('face-to-face');
      } else {
        setActiveTransactionTab('delivery');
      }
    } catch {
      showToast('낙찰 정보를 불러올 수 없습니다.', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isInitialized && user) {
      fetchDetail();
    }
  }, [fetchDetail, isInitialized, user]);

  // 낙찰 결과 로드 시 채팅방 자동 생성 + 초기 시스템 메시지 전송
  useEffect(() => {
    if (!result || !user) return;
    const sellerNo = getMemberNo(user);
    if (!sellerNo) return;
    api.post('/chat/rooms', {
      buyerNo: result.buyer.buyerNo,
      sellerNo,
      productNo: result.productNo,
    }).then(res => {
      const roomNo = res.data?.roomNo;
      if (!roomNo) return;
      setChatRoomNo(roomNo);
      // 신규 방일 때만 안내 시스템 메시지 전송 (중복 방지)
      if (res.data?.isNew === true) {
        api.post(`/chat/rooms/${roomNo}/messages`, {
          content: '첫 대화를 남겨보세요',
          msgType: 'SYSTEM',
        }).catch(() => {});
      }
    }).catch(() => {});
  // result.productNo가 확정됐을 때 한 번만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.productNo]);

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner-border w-12 h-12" />
      </div>
    );
  }
  if (!result) return null;

  const isPending = result.status === '배송대기';
  const isCancelRequested = result.status === '취소요청';       // 구매자가 취소 요청한 상태
  const isSellerCancelRequested = result.status === '판매자취소요청'; // 판매자가 취소 요청, 구매자 승인 대기
  const isCompleted = result.status === '구매확정';
  const isCanceled = result.status === '거래취소';

  const images = result.images.map(img => resolveImageUrl(img) || img);

  const handleChatWithBuyer = async () => {
    if (chatRoomNo) {
      navigate(`/chat?roomNo=${chatRoomNo}`);
      return;
    }
    const sellerNo = getMemberNo(user);
    if (!sellerNo) {
      showToast('로그인이 필요한 서비스입니다.', 'error');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/chat/rooms', {
        buyerNo: result.buyer.buyerNo,
        sellerNo,
        productNo: result.productNo,
      });
      if (res.data?.roomNo) {
        navigate(`/chat?roomNo=${res.data.roomNo}`);
      }
    } catch {
      showToast('채팅방 생성에 실패했습니다.', 'error');
    }
  };

  // 구매자의 취소요청을 판매자가 승인
  const executeApproveCancel = async () => {
    setShowCancelConfirm(false);
    setIsProcessing(true);
    try {
      await api.post(`/auction-results/${result.resultNo}/cancel-approve`);
      setResult(prev => prev ? { ...prev, status: '거래취소' } : null);
      showToast('취소 처리가 완료되었습니다. 구매자에게 환불됩니다.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || '취소 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 판매자가 취소를 요청 (구매자 동의 대기)
  const executeRequestCancelBySeller = async () => {
    setShowCancelConfirm(false);
    setIsProcessing(true);
    try {
      await api.post(`/auction-results/${result.resultNo}/seller-request-cancel`);
      setResult(prev => prev ? { ...prev, status: '판매자취소요청' } : null);
      showToast('구매자에게 취소 요청을 보냈습니다. 구매자의 동의를 기다려주세요.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || '취소 요청 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAddress = () => {
    if (!result) return;
    const fullAddress = `${result.deliveryAddrRoad || ''} ${result.deliveryAddrDetail || ''}`.trim();
    if (!fullAddress) {
      showToast('복사할 배송지 정보가 없습니다.', 'error');
      return;
    }

    // 최신 Clipboard API 시도
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(fullAddress).then(() => {
        showToast('배송지가 복사되었습니다.', 'success');
      }).catch(() => {
        // 실패 시 Fallback으로 전환
        copyFallback(fullAddress);
      });
    } else {
      // API를 사용할 수 없는 경우 Fallback 실행
      copyFallback(fullAddress);
    }
  };

  // 구형 브라우저 및 비보안 환경(HTTP)을 위한 복사 로직
  const copyFallback = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 화면에 보이지 않도록 설정
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showToast('배송지가 복사되었습니다.', 'success');
      } else {
        showToast('복사에 실패했습니다.', 'error');
      }
    } catch (err) {
      showToast('복사 기능을 사용할 수 없는 브라우저입니다.', 'error');
    }
    
    document.body.removeChild(textArea);
  };

  const cancelModalTitle = isCancelRequested
    ? '구매자의 취소 요청을 승인하시겠습니까?'
    : '구매자에게 취소를 요청하시겠습니까?';
  const cancelModalDesc = isCancelRequested
    ? '승인 시 양측 합의 취소로 처리됩니다. 구매자에게 낙찰 포인트가 전액 환불됩니다.'
    : '구매자가 동의해야만 최종 취소됩니다. 요청 후 구매자의 승인을 기다려야 합니다.';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
          <div />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Product Summary */}
              <section className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-baseline justify-between w-full">
                  <div className="flex items-center gap-2">낙찰 상품 정보</div>
                  <span className="text-xs text-gray-400 font-medium font-sans">
                    낙찰일 : {new Date(result.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </span>
                </h3>
                <div className="flex gap-6">
                  {images.length > 0 && (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100">
                      <img src={images[0] || undefined} alt={result.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Link to={`/products/${result.productNo}`} className="block group">
                      <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-600 transition-colors">{result.title}</h4>
                    </Link>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">{result.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">최종 낙찰가</span>
                      <span className="text-2xl font-bold text-gray-900">{result.finalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100 mx-8" />

              {/* 거래 정보 (배송지 또는 거래 장소) */}
              <section className="p-8">
                {result.tradeType === '혼합' && (
                  <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-4">
                    <button
                      onClick={() => setActiveTransactionTab('delivery')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTransactionTab === 'delivery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      택배 거래
                    </button>
                    <button
                      onClick={() => setActiveTransactionTab('face-to-face')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTransactionTab === 'face-to-face' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      직거래
                    </button>
                  </div>
                )}

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">
                      {activeTransactionTab === 'face-to-face' ? '거래 방식 및 장소' : '배송지 정보'}
                    </h3>
                    {activeTransactionTab === 'delivery' && (
                      <button
                        onClick={handleCopyAddress}
                        className="text-xs font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
                      >
                        <BsCopy className="w-3.5 h-3.5" />
                        복사하기
                      </button>
                    )}
                  </div>

                  {activeTransactionTab === 'face-to-face' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                          <BsGeoAltFill className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">희망 거래 장소</p>
                          <p className="font-bold text-gray-900">{result.location || '구매자와 협의 후 장소를 결정해주세요.'}</p>
                          <p className="text-xs text-gray-400 mt-1">상세 장소는 구매자와 채팅으로 협의해주세요.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[100px] flex flex-col justify-center">
                        {result.deliveryAddrRoad || result.deliveryAddrDetail ? (
                          <>
                            <p className="font-bold text-gray-900">
                              {result.deliveryAddrRoad || result.deliveryAddrDetail}
                            </p>
                            {result.deliveryAddrRoad && result.deliveryAddrDetail && (
                              <p className="text-sm text-gray-500 mt-1">{result.deliveryAddrDetail}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 font-medium italic">구매자가 아직 배송지를 입력하지 않았습니다.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 정산 정보 */}
              <section className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-baseline justify-between w-full">
                  <div className="flex items-center gap-2">정산 정보</div>
                  {result.confirmedAt && (
                    <span className="text-xs text-gray-400 font-medium font-sans">
                      정산일 : {new Date(result.confirmedAt).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </span>
                  )}
                </h3>
                {(() => {
                  const feeRate = result.tradeType === '직거래' ? 0.01 : 0.02;
                  const feePercent = result.tradeType === '직거래' ? '1%' : '2%';
                  const fee = Math.round(result.finalPrice * feeRate);
                  const settlementAmount = result.finalPrice - fee;
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">최종 낙찰가</span>
                        <span className="text-gray-900 font-bold">{result.finalPrice.toLocaleString()} P</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">배송비</span>
                        <span className={`font-medium ${result.tradeType === '직거래' ? 'text-gray-900' : 'text-gray-400'}`}>
                          {result.tradeType === '직거래' ? '-' : '(배송비 별도)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">플랫폼 이용료 (안심 결제 수수료 {feePercent})</span>
                        <span className="text-brand font-bold">- {fee.toLocaleString()} P</span>
                      </div>
                      <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-base font-bold text-gray-900">
                          {isCompleted ? '최종 정산 금액' : '최종 정산 예정 금액'}
                        </span>
                        <span className="text-2xl font-bold text-blue-500">{settlementAmount.toLocaleString()} P</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-8 space-y-3">
                  {/* 구매자 취소 요청 수신 — 툴팁 인라인 알림 */}
                  {isCancelRequested && (
                    <div className="flex items-center gap-2 mb-3 group relative">
                      <AlertCircle className="w-[18px] h-[18px] text-brand" />
                      <span className="text-sm font-bold text-brand cursor-help border-b border-dashed border-brand/30">
                        구매자 취소 요청 수신
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] shadow-2xl pointer-events-none border border-white/10">
                        <p className="leading-relaxed font-medium">
                          구매자가 낙찰 취소를 요청했습니다.<br />
                          승인하면 구매자에게 포인트가 환불되고 경매는 유찰 처리됩니다.
                        </p>
                        <div className="absolute top-full left-4 border-[6px] border-transparent border-t-gray-900/95" />
                      </div>
                    </div>
                  )}

                  {/* 배송대기: [취소 요청하기] — 즉시 취소 아님, 구매자 동의 필요 */}
                  {isPending && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={isProcessing}
                        className="w-full h-[56px] flex items-center justify-center border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                      >
                        취소 요청하기
                      </button>
                      <button
                        disabled
                        className="w-full h-[56px] bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed border border-gray-200 flex items-center justify-center"
                      >
                        구매 확정 대기
                      </button>
                    </div>
                  )}

                  {/* 구매자 취소 요청 수신: [취소 승인] 버튼 */}
                  {isCancelRequested && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={isProcessing}
                        className="w-full h-[56px] flex items-center justify-center border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                      >
                        취소 승인
                      </button>
                      <button
                        disabled
                        className="w-full h-[56px] bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed border border-gray-200 flex items-center justify-center"
                      >
                        구매 확정 대기
                      </button>
                    </div>
                  )}

                  {/* 판매자 취소 요청 후 구매자 응답 대기 — 흰색 칩 + 툴팁 스타일로 통일 */}
                  {isSellerCancelRequested && (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm group relative cursor-help">
                        <AlertCircle className="w-5 h-5 text-brand" />
                        <span className="text-sm font-bold text-brand">구매자 동의 대기 중</span>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-gray-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] shadow-2xl pointer-events-none border border-white/10 text-center">
                          <p className="leading-relaxed font-medium">
                            구매자가 취소요청을 검토 중입니다.<br />
                            동의 완료 시 거래가 자동으로 취소됩니다.
                          </p>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900/95" />
                        </div>
                      </div>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-8 space-y-3">
                      {(!result.hasSellerReview && !result.hasReview) ? (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="w-full h-[56px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/10 active:scale-95 flex items-center justify-center"
                        >
                          후기 남기기
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full h-[56px] flex items-center justify-center bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed border border-gray-200"
                        >
                          거래 완료
                        </button>
                      )}
                    </div>
                  )}

                  {isCanceled && (
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center space-y-4">
                      <p className="text-sm font-bold text-gray-500">거래가 취소되었습니다.</p>
                      <button
                        onClick={() => navigate(`/products/${result.productNo}`)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        <BsArrowRepeat className="w-4 h-4" /> 재게시하기
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Right Column: Buyer Info */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20 flex-shrink-0 bg-white/10 flex items-center justify-center">
                    <img
                      src={getProfileImageUrl(result.buyer.profileImage)}
                      alt={result.buyer.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">낙찰자</p>
                    <p className="font-bold text-white truncate">{result.buyer.nickname}</p>
                    <p className="text-xs text-white/50">매너온도 {Number(result.buyer.mannerTemp).toFixed(1)}°</p>
                  </div>
                  <Link to={`/seller/${result.buyer.buyerNo}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors shrink-0">
                    <BsChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-8 border-t border-white/10 space-y-3">

                  <button
                    onClick={handleChatWithBuyer}
                    className="w-full py-5 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <BsChat className="w-5 h-5 text-gray-900" />
                    낙찰자와 채팅하기
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-3">
                  <BsInfoCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">안전 거래 안내</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      낙찰 포인트는 JAVAJAVA에서 안전하게 보관하며, 구매자가 '수령 확인'을 완료한 후 판매자에게 정산됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{cancelModalTitle}</h3>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">{cancelModalDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                아니오
              </button>
              <button
                onClick={isCancelRequested ? executeApproveCancel : executeRequestCancelBySeller}
                className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 active:scale-95"
              >
                {isCancelRequested ? '승인하기' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => {
          setShowReviewModal(false);
          setResult(prev => prev ? { ...prev, hasSellerReview: true } : null);
          showToast('후기가 등록되었습니다.', 'success');
          // 서버 데이터 동기화를 위해 재조회
          setTimeout(fetchDetail, 500);
        }}
        resultNo={result.resultNo}
        sellerNickname={result.buyer.nickname}
        productTitle={result.title}
        productImage={images[0]}
        role="seller"
      />
    </div>
  );
};
