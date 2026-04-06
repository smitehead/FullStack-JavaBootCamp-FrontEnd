import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUtils';
import { 
  ChevronLeft, ChevronRight, MapPin, Truck, CreditCard, MessageSquare, 
  CheckCircle2, XCircle, Package, Info, AlertCircle, Star 
} from 'lucide-react';
import { showToast } from '@/components/toastService';

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
  deliveryAddrDetail: string | null;
}

const REVIEW_TAGS = [
  { id: 'tag_1', content: '응답이 빨라요' },
  { id: 'tag_2', content: '친절하고 매너가 좋아요' },
  { id: 'tag_3', content: '시간 약속을 잘 지켜요' },
  { id: 'tag_4', content: '상품 상태가 설명과 같아요' },
];

export const WonProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<AuctionResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);

  const [imgIndex, setImgIndex] = useState(0);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [activeTransactionTab, setActiveTransactionTab] = useState<'delivery' | 'face-to-face'>('delivery');

  // 후기 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/auction-results/product/${id}`)
      .then(res => {
        const data: AuctionResultDetail = res.data;
        setResult(data);
        if (data.deliveryAddrDetail) {
          setAddress(data.deliveryAddrDetail);
        }
        // 초기 거래 방식 지정
        if (data.tradeType === '직거래') {
          setActiveTransactionTab('face-to-face');
        } else {
          setActiveTransactionTab('delivery');
        }
      })
      .catch(() => {
        showToast('낙찰 정보를 불러올 수 없습니다.', 'error');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!result) return null;

  const isPending = result.status === '배송대기';
  const isPaid = result.status === '결제완료';
  const isCompleted = result.status === '구매확정';
  const isCanceled = result.status === '거래취소';
  
  const statusLabel = isPending ? '결제 대기' 
    : isPaid ? (result.tradeType === '직거래' ? '결제 완료 (거래 대기)' : '결제 완료 (배송 대기)')
    : isCompleted ? '거래 완료' 
    : '거래 취소';

  const statusClass = isPending ? 'bg-amber-100 text-amber-600'
    : isPaid ? 'bg-emerald-100 text-emerald-600'
    : isCompleted ? 'bg-indigo-100 text-indigo-600'
    : 'bg-gray-100 text-gray-500';

  const images = result.images.map(img => resolveImageUrl(img) || img);

  const handlePayment = () => {
    if (activeTransactionTab === 'delivery' && !address.trim() && result.tradeType !== '직거래') {
      showToast('배송지를 입력해주세요.', 'error');
      return;
    }
    setShowPaymentConfirm(true);
  };

  const executePayment = async () => {
    setShowPaymentConfirm(false);
    setIsProcessing(true);
    try {
      await api.post(`/auction-results/${result.resultNo}/pay`, {
        address,
        addressDetail: detailAddress,
        tradeType: activeTransactionTab === 'delivery' ? '택배' : '직거래'
      });
      setResult(prev => prev ? { ...prev, status: '결제완료' } : null);
      setIsEditingAddress(false);
      showToast('확정이 되었습니다.', 'success');
    } catch {
      showToast('결제 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeConfirmPurchase = async () => {
    setShowPurchaseConfirm(false);
    try {
      await api.post(`/auction-results/${result.resultNo}/confirm`);
      setResult(prev => prev ? { ...prev, status: '구매확정' } : null);
      setShowReviewModal(true);
    } catch {
      showToast('구매 확정 중 오류가 발생했습니다.', 'error');
    }
  };

  const executeCancel = async () => {
    setShowCancelConfirm(false);
    try {
      await api.post(`/auction-results/${result.resultNo}/cancel`);
      setResult(prev => prev ? { ...prev, status: '거래취소' } : null);
      showToast('결제가 취소되었습니다.', 'success');
    } catch {
      showToast('취소 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const toggleTag = (tagContent: string) => {
    setSelectedTags(prev => 
      prev.includes(tagContent) 
        ? prev.filter(t => t !== tagContent) 
        : [...prev, tagContent]
    );
  };

  const handleSubmitReview = async () => {
    if (selectedTags.length === 0 && !reviewContent.trim() && reviewRating === 0) {
      showToast('별점, 태그, 또는 후기 내용 중 하나 이상 입력해주세요.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await api.post('/reviews', {
        resultNo: result.resultNo,
        rating: reviewRating > 0 ? reviewRating : null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        content: reviewContent.trim() || null,
      });
      setShowReviewSuccess(true);
      setTimeout(() => {
        setShowReviewSuccess(false);
        setShowReviewModal(false);
        navigate('/mypage');
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || '리뷰 등록에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleChatWithSeller = () => {
    showToast('판매자와의 채팅방으로 이동합니다.', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            뒤로가기
          </button>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Consolidated Info Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Product Summary */}
              <section className="p-8">
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-500" /> 낙찰 상품 정보
                </h3>
                <div className="flex gap-6">
                  {images.length > 0 && (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100">
                      <img src={images[imgIndex] || undefined} alt={result.title} className="w-full h-full object-cover" />
                      {images.length > 1 && (
                        <>
                          <button 
                            onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/30 text-white p-0.5 rounded-r"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setImgIndex(i => Math.min(images.length - 1, i + 1))}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 text-white p-0.5 rounded-l"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link to={`/product/${result.productNo}`} className="block group">
                      <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-500 transition-colors">{result.title}</h4>
                    </Link>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">{result.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">최종 낙찰가</span>
                      <span className="text-2xl font-black text-emerald-600">{result.finalPrice.toLocaleString()}원</span>
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
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTransactionTab === 'delivery' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      택배 거래
                    </button>
                    <button 
                      onClick={() => setActiveTransactionTab('face-to-face')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTransactionTab === 'face-to-face' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      직거래
                    </button>
                  </div>
                )}

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-gray-900">
                        {activeTransactionTab === 'face-to-face' ? '거래 방식 및 장소' : '배송지 정보'}
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                        {activeTransactionTab === 'face-to-face' ? '직거래' : '택배거래'}
                      </span>
                    </div>
                    {isPending && activeTransactionTab === 'delivery' && (
                      <button 
                        onClick={() => setIsEditingAddress(!isEditingAddress)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {isEditingAddress ? '저장' : '변경하기'}
                      </button>
                    )}
                  </div>

                  {activeTransactionTab === 'face-to-face' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                          <MapPin className="w-5 h-5 text-indigo-600" />
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
                                  onChange={(e) => setAddress(e.target.value)}
                                  placeholder="주소를 입력해주세요"
                                  className="flex-1 p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                                />
                                <button className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">검색</button>
                              </div>
                              <input 
                                type="text" 
                                value={detailAddress}
                                onChange={(e) => setDetailAddress(e.target.value)}
                                placeholder="상세 주소를 입력해주세요"
                                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                              />
                            </div>
                          ) : (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                              {address || result.deliveryAddrDetail ? (
                                <>
                                  <p className="font-bold text-gray-900">{address || result.deliveryAddrDetail || '주소를 등록해주세요'}</p>
                                  {(detailAddress || result.deliveryAddrDetail) && (
                                    <p className="text-sm text-gray-500 mt-1">{detailAddress || ''}</p>
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
                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                   <CreditCard className="w-5 h-5 text-indigo-500" /> 결제 정보
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">낙찰 금액</span>
                    <span className="text-gray-900 font-bold">{result.finalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">배송비</span>
                    <span className="text-gray-900 font-bold">0원 (무료배송)</span>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-base font-black text-gray-900">총 결제 금액</span>
                    <span className="text-2xl font-black text-[#FF5A5A]">{result.finalPrice.toLocaleString()}원</span>
                  </div>
                </div>

                {/* Local Action Buttons */}
                <div className="mt-8 space-y-3">
                  {isPending && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? '처리 중...' : '입찰 구매 확정 (결제)'}
                      </button>
                      <button 
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all border border-gray-200 shadow-sm"
                      >
                        낙찰 취소하기
                      </button>
                    </div>
                  )}

                  {isPaid && (
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setShowPurchaseConfirm(true)}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                      >
                        구매 확정하기
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-in fade-in zoom-in duration-300" />
                      <p className="text-sm font-bold text-emerald-600">거래가 성공적으로 완료되었습니다.</p>
                    </div>
                  )}

                  {isCanceled && (
                    <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center">
                      <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3 animate-in fade-in zoom-in duration-300" />
                      <p className="text-sm font-bold text-red-500">거래가 취소되었습니다.</p>
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
                    {result.seller.profileImage ? (
                      <img src={resolveImageUrl(result.seller.profileImage)} alt={result.seller.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">{result.seller.nickname[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">판매자</p>
                    <p className="font-bold text-white truncate">{result.seller.nickname}</p>
                    <p className="text-xs text-white/50">매너온도 {result.seller.mannerTemp}°</p>
                  </div>
                  <Link to={`/seller/${result.seller.sellerNo}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-8 border-t border-white/10">
                  <div className="space-y-3">
                    <button 
                      onClick={handleChatWithSeller}
                      className="w-full py-5 bg-white text-gray-900 font-black rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <MessageSquare className="w-5 h-5 text-gray-900" />
                      판매자와 채팅하기
                    </button>
                  </div>
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 mb-1">안전 거래 안내</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                      결제된 포인트는 LiveBid에서 안전하게 보관하며, 구매자가 '구매 확정'을 누른 후에 판매자에게 전달됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">결제를 진행할까요?</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
              낙찰된 금액만큼 포인트가 차감됩니다.<br/>
              결제 후에는 취소가 어려울 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPaymentConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button 
                onClick={executePayment}
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                결제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurchaseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">구매를 확정하시겠습니까?</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
              물건을 정상적으로 수령하셨나요?
            </p>
            <p className="text-xs text-red-500 font-bold mb-8 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 구매 확정 시 다시 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowPurchaseConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button 
                onClick={executeConfirmPurchase}
                className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                확정하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">낙찰을 취소하시겠습니까?</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-2">
              정말 취소하시겠습니까?
            </p>
            <p className="text-xs text-red-500 font-bold mb-8 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 취소 시 서비스 이용 패널티가 부과될 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                아니오
              </button>
              <button 
                onClick={executeCancel}
                className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-400 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-50">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                <img src={images[0]} alt={result.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">
                  <span className="text-indigo-600">{result.seller.nickname}</span>님과의 거래<br/>
                  어떤 점이 좋았나요?
                </h3>
              </div>
            </div>

            <div className="space-y-8">
              {/* 별점 */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">거래는 어떠셨나요?</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star === reviewRating ? 0 : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-9 h-9 ${
                          star <= (hoverRating || reviewRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-200'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm font-bold text-gray-500">{reviewRating}점</span>
                  )}
                </div>
              </div>

              {/* 태그 */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">거래하며 느낀 점을 선택해주세요</p>
                <div className="flex flex-wrap gap-2">
                  {REVIEW_TAGS.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.content)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                        selectedTags.includes(tag.content)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tag.content}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-black text-gray-900 mb-3 ml-1">상세 후기 남기기</h4>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="판매자에게 따뜻한 후기를 남겨주세요."
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none font-medium text-gray-900"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setShowReviewModal(false); navigate('/mypage'); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all font-black"
                >
                  나중에 하기
                </button>
                <button 
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 active:scale-95"
                >
                  {isSubmittingReview ? '등록 중...' : '후기 등록하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Success Modal */}
      {showReviewSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-sm w-full p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">후기 등록 완료!</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              소중한 후기가 등록되었습니다.<br/>
              마이페이지로 이동합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
