import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BsX, BsExclamationCircle, BsWallet } from 'react-icons/bs';
import { Product } from '@/types';
import { showToast } from '@/components/toastService';
import { formatPrice } from '@/utils/formatUtils';

interface ProductDetailModalsProps {
  product: Product;
  user: { points?: number; id?: string } | null;
  bidAmount: number;
  autoBidMaxAmount: number;
  isFinished: boolean;
  cancelCondition: 'A' | 'B' | 'C';

  isShareModalOpen: boolean;
  showCancelModal: boolean;
  showBidCancelModal: boolean;
  showBidTermsModal: boolean;
  showRechargePrompt: boolean;
  showDeleteModal: boolean;
  showRepostModal: boolean;
  showBuyoutModal: boolean;
  showBidConfirmModal: boolean;
  showAutoBidConfirmModal: boolean;

  isBidCancelling: boolean;
  isBidProcessing: boolean;
  isBuyoutProcessing: boolean;
  isDeleting: boolean;
  isConfirming: boolean;

  agreedNoRebid: boolean;
  agreedPenalty: boolean;
  dontAskToday: boolean;

  setIsShareModalOpen: (v: boolean) => void;
  setShowCancelModal: (v: boolean) => void;
  setShowBidCancelModal: (v: boolean) => void;
  setShowRechargePrompt: (v: boolean) => void;
  setShowDeleteModal: (v: boolean) => void;
  setShowRepostModal: (v: boolean) => void;
  setShowBuyoutModal: (v: boolean) => void;
  setShowBidConfirmModal: (v: boolean) => void;
  setShowAutoBidConfirmModal: (v: boolean) => void;
  setAgreedNoRebid: (v: boolean) => void;
  setAgreedPenalty: (v: boolean) => void;
  setDontAskToday: (v: boolean) => void;

  handleAuctionCancel: () => void;
  handleBidCancelConfirm: () => void;
  handleBidTermsClose: () => void;
  handleBidTermsConfirm: () => void;
  handleDeleteProduct: () => void;
  executeBuyout: () => void;
  executeStandardBid: () => void;
  executeAutoBid: () => void;
}

export const ProductDetailModals: React.FC<ProductDetailModalsProps> = ({
  product, user, bidAmount, autoBidMaxAmount, isFinished, cancelCondition,
  isShareModalOpen, showCancelModal, showBidCancelModal, showBidTermsModal,
  showRechargePrompt, showDeleteModal, showRepostModal, showBuyoutModal,
  showBidConfirmModal, showAutoBidConfirmModal,
  isBidCancelling, isBidProcessing, isBuyoutProcessing, isDeleting, isConfirming,
  agreedNoRebid, agreedPenalty, dontAskToday,
  setIsShareModalOpen, setShowCancelModal, setShowBidCancelModal, setShowRechargePrompt,
  setShowDeleteModal, setShowRepostModal, setShowBuyoutModal, setShowBidConfirmModal,
  setShowAutoBidConfirmModal, setAgreedNoRebid, setAgreedPenalty, setDontAskToday,
  handleAuctionCancel, handleBidCancelConfirm, handleBidTermsClose, handleBidTermsConfirm,
  handleDeleteProduct, executeBuyout, executeStandardBid, executeAutoBid,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">공유하기</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <BsX className="w-5 h-5 text-gray-400" />
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 shrink-0"
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
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">경매 취소</h3>
                </div>

                <div className="mb-2">
                  {cancelCondition === 'A' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                        <p className="text-sm text-gray-700 leading-relaxed font-bold">
                          현재 입찰 참여자가 없습니다. <br />
                          <span className="text-gray-900 underline underline-offset-4 decoration-2">아무런 패널티 없이</span> 즉시 취소할 수 있습니다.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowCancelModal(false)} className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                          돌아가기
                        </button>
                        <button onClick={handleAuctionCancel} className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
                          취소 확정
                        </button>
                      </div>
                    </div>
                  )}

                  {cancelCondition === 'B' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <BsExclamationCircle className="w-4 h-4 text-red-500" />
                          <p className="text-sm font-bold text-gray-900">주의: 취소 패널티가 발생합니다</p>
                        </div>
                        <ul className="space-y-3">
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            매너온도 <span className="text-red-500 font-bold">10점</span> 즉시 차감
                          </li>
                          <li className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            포인트 벌금: <span className="text-red-500 font-bold">{Math.floor(product.currentPrice * 0.03).toLocaleString()}P (현재가의 3%)</span>
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
                        <button onClick={() => setShowCancelModal(false)} className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
                          돌아가기
                        </button>
                        <button onClick={handleAuctionCancel} className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-95">
                          패널티 감수하고 취소
                        </button>
                      </div>
                    </div>
                  )}

                  {cancelCondition === 'C' && (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <BsExclamationCircle className="w-4 h-4 text-brand" />
                          <p className="text-sm font-bold text-gray-900">마감 임박 (12시간 이내)</p>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed font-bold">
                          경매 종료가 얼마 남지 않아 판매자가 직접 취소할 수 없습니다.
                          부득이한 사유가 있다면 관리자에게 문의해주세요.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowCancelModal(false)} className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
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

      {/* Bid Cancel Modal */}
      {showBidCancelModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="p-8">
              <div className="flex flex-col mb-8 text-left">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">입찰 취소</h3>
              </div>
              {(() => {
                const penalty = Math.floor((product.currentPrice || 0) * 0.05);
                const userPoints = user?.points || 0;
                const canAfford = userPoints >= penalty;
                const refundAmount = (product.currentPrice || 0) - penalty;
                return (
                  <div className="space-y-6 mb-8 text-left">
                    <div className="bg-gray-900 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl">
                          <BsWallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">보유 포인트</span>
                      </div>
                      <div className={`text-xl font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                        {userPoints.toLocaleString()}<span className="text-sm ml-1 text-indigo-400">P</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <BsExclamationCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-bold text-gray-900">취소 패널티 안내</p>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center justify-between text-xs font-bold text-gray-600">
                          <span>현재 입찰가</span>
                          <span className="text-gray-900 font-bold">{(product.currentPrice || 0).toLocaleString()} P</span>
                        </li>
                        <li className="flex items-center justify-between text-xs font-bold text-gray-600">
                          <span>취소 위약금 (5%)</span>
                          <span className="text-red-500 font-bold">-{penalty.toLocaleString()} P</span>
                        </li>
                        <div className="h-px bg-gray-200 my-1" />
                        <li className="flex items-center justify-between text-base font-bold">
                          <span className="text-gray-900 font-bold text-xs">최종 반환 금액</span>
                          <span className="text-gray-900 tracking-tight">{refundAmount.toLocaleString()} P</span>
                        </li>
                      </ul>
                    </div>
                    {!canAfford && (
                      <div className="flex items-start gap-3 bg-brand/10 border border-orange-100 rounded-2xl p-4">
                        <BsExclamationCircle className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-brand-dark leading-relaxed">
                          위약금 납부를 위한 포인트가 부족합니다. <br />포인트 충전을 완료하셔야 취소가 가능합니다.
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 leading-relaxed text-center font-medium">
                      경매 마감 시간은 변동 없이 유지됩니다.<br />
                      차감된 위약금은 플랫폼 수익으로 귀속됩니다.
                    </p>
                    <div className="space-y-3 mt-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                          <input type="checkbox" checked={agreedNoRebid} onChange={(e) => setAgreedNoRebid(e.target.checked)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-red-500 checked:border-red-500 transition-all cursor-pointer" />
                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">재입찰이 불가능함을 확인했습니다.</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                          <input type="checkbox" checked={agreedPenalty} onChange={(e) => setAgreedPenalty(e.target.checked)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-red-500 checked:border-red-500 transition-all cursor-pointer" />
                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">위약금 내용을 인지했습니다.</span>
                      </label>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const penalty = Math.floor((product.currentPrice || 0) * 0.05);
                const canAfford = (user?.points || 0) >= penalty;
                return (
                  <div className="flex gap-3">
                    <button onClick={() => setShowBidCancelModal(false)} disabled={isBidCancelling}
                      className="flex-1 py-4 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50">
                      돌아가기
                    </button>
                    <button onClick={handleBidCancelConfirm} disabled={!agreedNoRebid || !agreedPenalty || isBidCancelling || !canAfford}
                      className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {isBidCancelling ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />취소 처리 중...</>
                      ) : '위약금 승인 및 취소'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bid Terms Modal */}
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
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">입찰 참여 전 확인사항</h3>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 space-y-4 text-sm text-gray-700 leading-relaxed">
                  <p className="font-bold text-gray-900">입찰 전 아래 사항을 반드시 확인하세요.</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>입찰가는 현재 최고가보다 <span className="text-gray-900 font-bold">높아야</span> 하며, 한 번 제출된 입찰은 취소 시 <span className="text-red-500 font-bold">위약금(5%)</span>이 발생합니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>경매 마감 <span className="text-gray-900 font-bold">12시간 이내</span>에는 입찰 취소가 불가합니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>낙찰 후 <span className="text-gray-900 font-bold">12시간 이내</span>에 결제를 완료하지 않으면 낙찰이 취소되고 차순위 입찰자에게 권한이 이전됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs font-bold text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 shrink-0" />
                      <span>입찰 포인트는 상회 입찰 발생 시 즉시 환불되며, 낙찰 시 최종 결제에 사용됩니다.</span>
                    </li>
                  </ul>
                </div>
                <div className="flex items-center gap-2 mb-6 px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="checkbox"
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-brand checked:border-brand transition-all cursor-pointer"
                        checked={dontAskToday} onChange={(e) => setDontAskToday(e.target.checked)} />
                      <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">오늘 하루 더 이상 보지 않기</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleBidTermsClose}
                    className="flex-1 h-[56px] border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center">
                    뒤로가기
                  </button>
                  <button onClick={handleBidTermsConfirm}
                    className={`flex-1 h-[56px] font-bold rounded-2xl transition-all active:scale-95 bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200 flex items-center justify-center ${isConfirming ? 'animate-pulse' : ''}`}>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRechargePrompt(false)}></div>
          <div className="bg-white w-full max-w-sm relative z-10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">포인트가 부족합니다</h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                입찰을 진행하기 위해 포인트 충전이 필요합니다.<br />
                현재 보유 포인트: <span className="text-indigo-600 font-bold">{formatPrice(user?.points || 0)}P</span><br />
                지금 충전하러 가시겠습니까?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowRechargePrompt(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm">
                  나중에
                </button>
                <button onClick={() => { setShowRechargePrompt(false); navigate('/points/charge'); }}
                  className="flex-1 py-3.5 bg-brand-dark text-white font-bold rounded-2xl hover:bg-brand-dark transition-colors shadow-lg shadow-orange-100 flex items-center justify-center gap-2 text-sm">
                  충전하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">게시글을 삭제하시겠습니까?</h3>
              {product.participantCount > 0 && !isFinished ? (
                <div className="bg-red-50 p-4 rounded-2xl mb-6">
                  <p className="text-sm text-red-600 font-bold leading-relaxed">
                    현재 입찰자가 {product.participantCount}명 있습니다. <br />
                    경매 도중 삭제 시 매너온도가 차감될 수 있습니다.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">삭제된 게시글은 복구할 수 없습니다.</p>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                  취소
                </button>
                <button onClick={handleDeleteProduct} disabled={isDeleting}
                  className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm flex items-center justify-center gap-2">
                  {isDeleting ? <div className="spinner-border w-4 h-4" style={{ borderTopColor: '#fff', borderLeftColor: 'rgba(255,255,255,0.2)', borderBottomColor: 'rgba(255,255,255,0.2)', borderRightColor: 'rgba(255,255,255,0.2)' }} /> : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repost Confirmation Modal */}
      {showRepostModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRepostModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">재게시하시겠습니까?</h3>
              <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">기존 정보를 유지한 채 경매를 다시 시작합니다.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowRepostModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                  닫기
                </button>
                <button
                  onClick={() => { setShowRepostModal(false); navigate('/register', { state: { product } }); }}
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm">
                  재게시하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buyout Confirmation Modal */}
      {showBuyoutModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBuyoutModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">즉시 구매하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                <span className="font-semibold text-gray-900">{formatPrice(Number(product.instantPrice))}원</span>에 즉시 구매합니다.<br />
                구매 후에는 취소가 불가능합니다.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowBuyoutModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                  취소
                </button>
                <button onClick={executeBuyout} disabled={isBuyoutProcessing}
                  className="flex-1 py-3.5 bg-[#1a1a3a] text-white rounded-2xl font-bold hover:bg-[#2a2a4a] transition-all shadow-lg shadow-blue-500/10 text-sm flex items-center justify-center gap-2">
                  {isBuyoutProcessing ? <div className="spinner-border w-4 h-4" style={{ borderTopColor: '#fff', borderLeftColor: 'rgba(255,255,255,0.2)', borderBottomColor: 'rgba(255,255,255,0.2)', borderRightColor: 'rgba(255,255,255,0.2)' }} /> : '구매하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Bid Confirmation Modal */}
      {showBidConfirmModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBidConfirmModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">입찰하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                <span className="font-semibold text-gray-900">{formatPrice(bidAmount)}원</span>으로 입찰에 참여합니다.<br />
                입찰 후 취소 시 위약금이 발생할 수 있습니다.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowBidConfirmModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                  취소
                </button>
                <button onClick={executeStandardBid} disabled={isBidProcessing}
                  className="flex-1 py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 text-sm flex items-center justify-center gap-2">
                  {isBidProcessing ? <div className="spinner-border w-4 h-4" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> : '입찰하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Bid Confirmation Modal */}
      {showAutoBidConfirmModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAutoBidConfirmModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">자동 입찰을 설정하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                최대 <span className="font-semibold text-gray-900">{formatPrice(autoBidMaxAmount)}원</span>까지 자동으로 상위 입찰을 진행하도록 설정합니다.
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowAutoBidConfirmModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">
                  취소
                </button>
                <button onClick={executeAutoBid} disabled={isBidProcessing}
                  className="flex-1 py-3.5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 text-sm flex items-center justify-center gap-2">
                  {isBidProcessing ? <div className="spinner-border w-4 h-4" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> : '설정하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
