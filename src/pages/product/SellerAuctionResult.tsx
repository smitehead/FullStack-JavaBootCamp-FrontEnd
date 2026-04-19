import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { resolveImageUrl, getProfileImageUrl } from '@/utils/imageUtils';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';
import { AlertCircle } from 'lucide-react';
import { BsXCircle, BsCheckCircle, BsBox2, BsCreditCard, BsInfoCircle, BsChat, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { showToast } from '@/components/toastService';

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
}

export const SellerAuctionResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();

  const [result, setResult] = useState<SellerResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.get(`/auction-results/seller/product/${id}`)
      .then(res => setResult(res.data))
      .catch(() => {
        showToast('낙찰 정보를 불러올 수 없습니다.', 'error');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="spinner-border w-8 h-8" />
      </div>
    );
  }
  if (!result) return null;

  const isPending = result.status === '배송대기';
  const isCancelRequested = result.status === '취소요청';
  const isCompleted = result.status === '구매확정';
  const isCanceled = result.status === '거래취소';

  const images = result.images.map(img => resolveImageUrl(img) || img);

  const handleChatWithBuyer = async () => {
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

  const cancelButtonLabel = isCancelRequested ? '취소 승인' : '낙찰 취소';
  const cancelModalTitle = isCancelRequested
    ? '구매자의 취소 요청을 승인하시겠습니까?'
    : '낙찰을 취소하시겠습니까?';
  const cancelModalDesc = isCancelRequested
    ? '승인 시 양측 합의 취소로 처리됩니다. 구매자에게 낙찰 포인트가 전액 환불됩니다.'
    : '판매자가 낙찰을 취소합니다. 구매자에게 포인트가 전액 환불됩니다.';

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
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  낙찰 상품 정보
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
                            <BsChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setImgIndex(i => Math.min(images.length - 1, i + 1))}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 text-white p-0.5 rounded-l"
                          >
                            <BsChevronRight className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link to={`/products/${result.productNo}`} className="block group">
                      <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-600 transition-colors">{result.title}</h4>
                    </Link>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">{result.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">최종 낙찰가</span>
                      <span className="text-2xl font-bold text-emerald-600">{result.finalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100 mx-8" />

              {/* 배송지 정보 (택배 거래 시) */}
              {result.tradeType !== '직거래' && (
                <>
                  <section className="p-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      배송지 정보
                    </h3>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                      {result.deliveryAddrDetail ? (
                        <p className="font-bold text-gray-900">{result.deliveryAddrDetail}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">구매자가 아직 배송지를 입력하지 않았습니다.</p>
                      )}
                    </div>
                  </section>
                  <hr className="border-gray-100 mx-8" />
                </>
              )}

              {/* 정산 정보 */}
              <section className="p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  정산 정보
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">낙찰 금액</span>
                    <span className="text-gray-900 font-bold">{result.finalPrice.toLocaleString()}원</span>
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">총 수령 예정액</span>
                    <span className="text-2xl font-bold text-emerald-600">{result.finalPrice.toLocaleString()}원</span>
                  </div>
                </div>

                {/* 취소 요청 안내 배너 */}
                {isCancelRequested && (
                  <div className="mt-6 rounded-2xl bg-orange-50 border border-orange-100 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-orange-700 mb-1">구매자 취소 요청 수신</p>
                      <p className="text-[11px] text-orange-600 leading-relaxed font-medium">
                        구매자가 낙찰 취소를 요청했습니다.<br />
                        승인하면 구매자에게 포인트가 환불되고 경매는 유찰 처리됩니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                  {(isPending || isCancelRequested) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={isProcessing}
                        className="w-full py-5 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {cancelButtonLabel}
                      </button>
                      <button
                        disabled
                        className="w-full py-5 bg-gray-100 text-gray-400 font-bold rounded-2xl cursor-not-allowed border border-gray-200"
                      >
                        결제 진행 중 (구매 확정 대기)
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
                      <BsCheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3 animate-in fade-in zoom-in duration-300" />
                      <p className="text-sm font-bold text-emerald-600">구매자가 수령을 확인하여 거래가 완료되었습니다.</p>
                    </div>
                  )}

                  {isCanceled && (
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-center">
                      <BsXCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500">거래가 취소되었습니다.</p>
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
                </div>

                <div className="pt-8 border-t border-white/10">
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
                    <p className="text-xs font-bold text-gray-900 mb-1">안전 거래 안내</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                      낙찰 포인트는 LiveBid에서 안전하게 보관하며, 구매자가 '수령 확인'을 완료한 후 판매자에게 정산됩니다.
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
                onClick={executeApproveCancel}
                className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/10 active:scale-95"
              >
                {isCancelRequested ? '승인하기' : '취소하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
