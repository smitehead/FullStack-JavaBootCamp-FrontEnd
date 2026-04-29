import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { resolveImageUrl, getProfileImageUrl } from '@/utils/imageUtils';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';
import { BsXCircle } from 'react-icons/bs';
import { Sparkles, AlertCircle } from 'lucide-react';

declare global {
  interface Window { daum: any; }
}

import { BsCheckCircle, BsBox2, BsExclamationCircle, BsInfoCircle, BsCreditCard, BsGeoAltFill, BsChat, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { showToast } from '@/components/toastService';
import { ReviewModal } from '@/components/ReviewModal';
import { formatPrice } from '@/utils/formatUtils';
interface AuctionResultDetail {
  resultNo: number;
  status: string; // 배송대기 | 결제완료 | 구매확정 | 거래취소
  confirmedAt: string | null;
  productNo: number;
  title: string;
  description: string;
  finalPrice: number;
  tradeType: string; // 택배 | 직거래 | 혼합
  location: string | null;
  images: string[];
  seller: {
    sellerNo: number;
    nickname: string;
    mannerTemp: number;
    profileImage?: string;
  };
  deliveryEmdNo: number | null;
  deliveryAddrRoad: string | null;
  deliveryAddrDetail: string | null;
  isForcePromoted: number; // 1 = 강제 승계 낙찰자
  hasReview: boolean;
  hasBuyerReview?: boolean;
  hasSellerReview?: boolean;
  createdAt: string;
}


export const WonProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isInitialized } = useAppContext();

  const [result, setResult] = useState<AuctionResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSellerCancelApproveConfirm, setShowSellerCancelApproveConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [activeTransactionTab, setActiveTransactionTab] = useState<'delivery' | 'face-to-face'>('delivery');
  const [chatRoomNo, setChatRoomNo] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/auction-results/product/${id}`);
      const data: AuctionResultDetail = res.data;
      setResult(data);

      if (data.deliveryAddrRoad) {
        setAddress(data.deliveryAddrRoad);
        setDetailAddress(data.deliveryAddrDetail || '');
      } else if (data.deliveryAddrDetail) {
        setAddress(data.deliveryAddrDetail);
      } else {
        try {
          const memberRes = await api.get('/members/me');
          if (memberRes.data.addrRoad) setAddress(memberRes.data.addrRoad);
          if (memberRes.data.addrDetail) setDetailAddress(memberRes.data.addrDetail);
        } catch { /* 무시 */ }
      }

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
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (isInitialized && !user) {
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  // 낙찰 결과 로드 시 채팅방 자동 생성 + 초기 시스템 메시지 전송
  useEffect(() => {
    if (!result || !user) return;
    const buyerNo = getMemberNo(user);
    if (!buyerNo) return;
    api.post('/chat/rooms', {
      buyerNo,
      sellerNo: result.seller.sellerNo,
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

  if (!isInitialized || !user) return null;

  const openPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setAddress(data.roadAddress || data.jibunAddress);
        setDetailAddress('');
      },
    }).open();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner-border w-12 h-12" />
      </div>
    );
  }
  if (!result) return null;

  const isPending = result.status === '배송대기';
  const isPaid = result.status === '결제완료';
  const isCompleted = result.status === '구매확정';
  const isCanceled = result.status === '거래취소';
  const isCancelRequested = result.status === '취소요청';           // 구매자가 취소 요청, 판매자 승인 대기
  const isSellerCancelRequested = result.status === '판매자취소요청'; // 판매자가 취소 요청, 구매자 동의 대기
  const isForcePromoted = result.isForcePromoted === 1;

  const images = result.images.map(img => resolveImageUrl(img) || img);

  const handleConfirmClick = () => {
    if (activeTransactionTab === 'delivery' && !address.trim() && result.tradeType !== '직거래') {
      showToast('배송지를 입력해주세요.', 'error');
      return;
    }
    setShowPurchaseConfirm(true);
  };

  const executeConfirmPurchase = async () => {
    setShowPurchaseConfirm(false);
    setIsProcessing(true);
    try {
      await api.post(`/auction-results/${result.resultNo}/confirm`, {
        address,
        addressDetail: detailAddress,
      });
      setResult(prev => prev ? { ...prev, status: '구매확정' } : null);
      setIsEditingAddress(false);
      setShowReviewModal(true);
    } catch {
      showToast('구매 확정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 강제 승계 낙찰자 단독 취소 (패널티 없음)
  const executeCancel = async () => {
    setShowCancelConfirm(false);
    try {
      await api.post(`/auction-results/${result.resultNo}/cancel`);
      setResult(prev => prev ? { ...prev, status: '거래취소' } : null);
      showToast('낙찰이 취소되었습니다. 포인트가 환불됩니다.', 'success');
    } catch {
      showToast('취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 일반 낙찰자 취소 요청 (판매자 동의 필요)
  const executeRequestCancel = async () => {
    setShowCancelConfirm(false);
    try {
      await api.post(`/auction-results/${result.resultNo}/request-cancel`);
      setResult(prev => prev ? { ...prev, status: '취소요청' } : null);
      showToast('취소 요청을 보냈습니다. 판매자 승인 후 환불됩니다.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || '취소 요청 중 오류가 발생했습니다.', 'error');
    }
  };

  // 판매자의 취소 요청을 구매자가 동의 → 에스크로 환불
  const executeApproveCancelBySeller = async () => {
    setShowSellerCancelApproveConfirm(false);
    setIsProcessing(true);
    try {
      await api.post(`/auction-results/${result.resultNo}/buyer-approve-cancel`);
      setResult(prev => prev ? { ...prev, status: '거래취소' } : null);
      showToast('취소에 동의했습니다. 포인트가 환불됩니다.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || '처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewSuccess = () => {
    navigate('/mypage');
  };

  const handleChatWithSeller = async () => {
    if (chatRoomNo) {
      navigate(`/chat?roomNo=${chatRoomNo}`);
      return;
    }
    const buyerNo = getMemberNo(user);
    if (!buyerNo) {
      showToast("'로그인이 필요한 서비스입니다.' 로그인 페이지로 이동합니다.", 'error');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/chat/rooms', {
        buyerNo,
        sellerNo: result.seller.sellerNo,
        productNo: result.productNo,
      });
      if (res.data?.roomNo) {
        navigate(`/chat?roomNo=${res.data.roomNo}`);
      } else {
        showToast('채팅방 정보를 받아올 수 없습니다.', 'error');
      }
    } catch (err: any) {
      console.error('Chat room creation failed:', err);
      showToast('채팅방 생성에 실패했습니다.', 'error');
    }
  };

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
          {/* Left Column: Consolidated Info Card */}
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
                      <span className="text-2xl font-bold text-gray-900">{formatPrice(result.finalPrice)}원</span>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100 mx-8" />

              {/* Address Section */}
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
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {activeTransactionTab === 'face-to-face' ? '거래 방식 및 장소' : '배송지 정보'}
                      </h3>
                    </div>
                    {isPending && activeTransactionTab === 'delivery' && (
                      <button
                        onClick={() => setIsEditingAddress(!isEditingAddress)}
                        className="text-xs font-bold text-brand hover:text-brand-dark"
                      >
                        {isEditingAddress ? '저장' : '변경하기'}
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
                          <p className="font-bold text-gray-900">{result.location || '판매자와 협의 후 장소를 결정해주세요.'}</p>
                          <p className="text-sm text-gray-500 mt-1">상세 장소는 판매자와 채팅으로 협의해주세요.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          {isEditingAddress ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={address}
                                  readOnly
                                  placeholder="주소 검색 버튼을 눌러주세요"
                                  onClick={openPostcode}
                                  className="flex-1 p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={openPostcode}
                                  className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl active:scale-95 transition-transform whitespace-nowrap"
                                >
                                  주소 검색
                                </button>
                              </div>
                              <input
                                type="text"
                                value={detailAddress}
                                onChange={(e) => setDetailAddress(e.target.value)}
                                placeholder="상세 주소를 입력해주세요 (동·호수 등)"
                                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                              />
                            </div>
                          ) : (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                              {address ? (
                                <>
                                  <p className="font-bold text-gray-900">{address}</p>
                                  {detailAddress && (
                                    <p className="text-sm text-gray-500 mt-1">{detailAddress}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-gray-400 font-medium italic">배송지 정보를 입력해주세요.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <hr className="border-gray-100 mx-8" />

              {/* Payment Summary */}
              <section className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-baseline justify-between w-full">
                  <div className="flex items-center gap-2">결제 정보</div>
                  {result.confirmedAt && (
                    <span className="text-xs text-gray-400 font-medium font-sans">
                      결제일 : {new Date(result.confirmedAt).toLocaleString('ko-KR', {
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
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">낙찰 금액</span>
                    <span className="text-gray-900 font-bold">{formatPrice(result.finalPrice)}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">배송비</span>
                    <span className={`font-medium ${result.tradeType === '직거래' ? 'text-gray-900' : 'text-gray-400'}`}>
                      {result.tradeType === '직거래' ? '-' : '(배송비 별도)'}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">총 결제 금액</span>
                    <span className="text-2xl font-bold text-brand">{formatPrice(result.finalPrice)}원</span>
                  </div>
                </div>

                {/* 강제 승계 안내 배너 */}
                {isForcePromoted && !isCanceled && !isCompleted && (
                  <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 mb-1">자동 승계 낙찰 안내</p>
                      <p className="text-[11px] text-amber-600 leading-relaxed font-medium">
                        상위 입찰자의 취소로 자동 승계된 낙찰입니다.<br />
                        원하지 않을 경우 <span className="font-bold">패널티 없이</span> 낙찰 취소가 가능합니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Action Buttons */}
                <div className="mt-8 space-y-3">
                  {/* 판매자 취소 요청 수신: 구매자에게 동의/거절 UI — 판매자 페이지 스타일로 통일 */}
                  {isSellerCancelRequested && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3 group relative">
                        <AlertCircle className="w-[18px] h-[18px] text-brand" />
                        <span className="text-sm font-bold text-brand cursor-help border-b border-dashed border-brand/30">
                          판매자 취소 요청 수신
                        </span>
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] shadow-2xl pointer-events-none border border-white/10">
                          <p className="leading-relaxed font-medium">
                            판매자가 거래 취소를 요청했습니다.<br />
                            동의하면 낙찰 포인트가 전액 환불됩니다.<br />
                            동의하지 않으면 기존대로 거래가 진행됩니다.
                          </p>
                          <div className="absolute top-full left-4 border-[6px] border-transparent border-t-gray-900/95" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setShowSellerCancelApproveConfirm(true)}
                          disabled={isProcessing}
                          className="w-full h-[56px] flex items-center justify-center border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                          취소 동의
                        </button>
                        <button
                          onClick={handleConfirmClick}
                          disabled={isProcessing}
                          className="w-full h-[56px] bg-brand hover:bg-brand-dark text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                          {isProcessing ? '처리 중...' : '상품 수령 확인 (구매 확정)'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 배송대기 / 구매자 취소요청 상태 */}
                  {(isPending || isCancelRequested) && (
                    isCancelRequested ? (
                      /* 취소요청 상태: 판매자 승인 대기 중 안내 (흰색 칩 + 툴팁 형태) */
                      <div className="flex items-center justify-center py-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm group relative cursor-help">
                          <AlertCircle className="w-5 h-5 text-brand" />
                          <span className="text-sm font-bold text-brand">취소 요청 대기 중</span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-gray-900/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] shadow-2xl pointer-events-none border border-white/10 text-center">
                            <p className="leading-relaxed font-medium">
                              판매자가 취소요청을 검토 중입니다.<br />
                              승인 완료 시 포인트가 자동 환불됩니다.
                            </p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900/95" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 배송대기: [낙찰 취소하기] 왼쪽 + [상품 수령 확인] 오른쪽 — 모든 낙찰자 공통 */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="w-full h-[56px] flex items-center justify-center border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                        >
                          낙찰 취소하기
                        </button>
                        <button
                          onClick={handleConfirmClick}
                          disabled={isProcessing}
                          className="w-full h-[56px] bg-brand hover:bg-brand-dark text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                          {isProcessing ? '처리 중...' : '상품 수령 확인 (구매 확정)'}
                        </button>
                      </div>
                    )
                  )}

                  {isPaid && (
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={handleConfirmClick}
                        disabled={isProcessing}
                        className="w-full h-[56px] bg-brand hover:bg-brand-dark text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand/10 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                      >
                        {isProcessing ? '처리 중...' : '상품 수령 확인 (구매 확정)'}
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-8 space-y-3">
                      {(!result.hasBuyerReview && !result.hasReview) ? (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="w-full h-[56px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/10 active:scale-95 flex items-center justify-center"
                        >
                          후기 남기기
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full h-[56px] bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed flex items-center justify-center"
                        >
                          거래 완료
                        </button>
                      )}
                    </div>
                  )}

                  {isCanceled && (
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center">
                      <p className="text-sm font-bold text-gray-500">거래가 취소되었습니다.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Right Column: Actions & Seller Info */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Action Card */}
              <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20 flex-shrink-0 bg-white/10 flex items-center justify-center">
                    <img
                      src={getProfileImageUrl(result.seller.profileImage)}
                      alt={result.seller.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">판매자</p>
                    <p className="font-bold text-white truncate">{result.seller.nickname}</p>
                    <p className="text-xs text-white/50">매너온도 {Number(result.seller.mannerTemp).toFixed(1)}°</p>
                  </div>
                  <Link to={`/seller/${result.seller.sellerNo}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors shrink-0">
                    <BsChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-8 border-t border-white/10">
                  <div className="space-y-3">
                      <button
                        onClick={handleChatWithSeller}
                      className="w-full py-5 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                      <BsChat className="w-5 h-5 text-gray-900" />
                      판매자와 채팅하기
                    </button>
                  </div>
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-3">
                  <BsInfoCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-1">안전 거래 안내</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      배송 완료 후 7일이 지나면 자동으로 구매가 확정되어 판매자에게 정산됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showPurchaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">상품을 수령하셨나요?</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
              확인하면 판매자에게 포인트가 즉시 정산됩니다.
            </p>
            <p className="text-xs text-red-500 font-bold mb-8 flex items-center gap-1">
              <BsExclamationCircle className="w-3.5 h-3.5" /> 구매 확정 후에는 취소할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseConfirm(false)}
                className="flex-1 h-[56px] bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center active:scale-[0.98]"
              >
                취소
              </button>
              <button
                onClick={executeConfirmPurchase}
                className="flex-1 h-[56px] bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 active:scale-[0.98] flex items-center justify-center"
              >
                확정하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            {isForcePromoted ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">낙찰을 취소하시겠습니까?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
                  상위 입찰자 취소로 자동 승계된 낙찰입니다.
                </p>
                <p className="text-xs text-emerald-600 font-bold mb-8 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 패널티 없이 취소됩니다. 입찰가는 전액 환불됩니다.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">낙찰 취소를 요청하시겠습니까?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
                  일반 낙찰 건의 취소는 <span className="font-bold text-gray-700">판매자의 동의(상호 합의)</span>가 필요합니다.
                </p>
                <p className="text-xs text-red-500 font-bold mb-8 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> 취소 요청 후 판매자가 승인해야 환불됩니다.
                </p>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                아니오
              </button>
              <button
                onClick={isForcePromoted ? executeCancel : executeRequestCancel}
                className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 active:scale-95"
              >
                {isForcePromoted ? '즉시 취소하기' : '취소 요청하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 판매자 취소 요청 동의 모달 */}
      {showSellerCancelApproveConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">거래 취소에 동의하시겠습니까?</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
              판매자의 취소 요청에 동의합니다.
            </p>
            <p className="text-xs text-emerald-600 font-bold mb-8 flex items-center gap-1">
              <BsCheckCircle className="w-3.5 h-3.5" /> 동의 시 낙찰 포인트가 전액 환불됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSellerCancelApproveConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                아니오
              </button>
              <button
                onClick={executeApproveCancelBySeller}
                className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/10 active:scale-95"
              >
                동의하기
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
          setResult(prev => prev ? { ...prev, hasBuyerReview: true } : null);
          showToast('후기가 등록되었습니다.', 'success');
          // 서버 데이터 동기화를 위해 재조회
          setTimeout(fetchDetail, 500);
        }}
        resultNo={result.resultNo}
        sellerNickname={result.seller.nickname}
        productTitle={result.title}
        productImage={images[0]}
        role="buyer"
      />
    </div>
  );
};
