import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Wallet, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Filter } from 'lucide-react';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';
import { showToast } from '@/components/toastService';

interface WithdrawItem {
  withdrawNo: number;
  memberNo: number;
  memberNickname: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: string;
  adminNickname: string | null;
  rejectReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export const WithdrawManagement: React.FC = () => {
  const { user, addActivityLog } = useAppContext();
  const [withdraws, setWithdraws] = useState<WithdrawItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    withdrawNo: number | null;
    action: string;
    item: WithdrawItem | null;
  }>({ open: false, withdrawNo: null, action: '', item: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchWithdraws = useCallback(async (pageNum: number, reset: boolean) => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/withdraws', {
        params: { status: statusFilter, page: pageNum, size: 15 },
      });
      const content = res.data.content || [];
      setWithdraws(prev => reset ? content : [...prev, ...content]);
      setHasMore(pageNum < (res.data.totalPages || 1));
    } catch (e) {
      showToast('출금 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
    setWithdraws([]);
    setHasMore(true);
    fetchWithdraws(1, true);
  }, [statusFilter, fetchWithdraws]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWithdraws(nextPage, false);
    }
  }, [hasMore, isLoading, page, fetchWithdraws]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const filteredWithdraws = withdraws.filter(w =>
    w.memberNickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.accountNumber.includes(searchTerm) ||
    w.bankName.includes(searchTerm)
  );

  const openConfirm = (item: WithdrawItem, action: string) => {
    setConfirmModal({ open: true, withdrawNo: item.withdrawNo, action, item });
    setRejectReason('');
  };

  const handleProcess = async () => {
    if (!confirmModal.withdrawNo || !confirmModal.item) return;
    if (confirmModal.action === '거절' && !rejectReason.trim()) {
      showToast('거절 사유를 입력해주세요.', 'warning');
      return;
    }

    try {
      await api.patch(`/admin/withdraws/${confirmModal.withdrawNo}`, {
        action: confirmModal.action,
        rejectReason: confirmModal.action === '거절' ? rejectReason : null,
      });

      // 관리자 활동 로그 기록
      const item = confirmModal.item;
      // AppContext의 addActivityLog 존재 여부 확인 후 호출
      if (addActivityLog) {
        addActivityLog(
          `출금 ${confirmModal.action}`,
          `${item.memberNickname}님 출금 신청 ${confirmModal.action} — ${item.amount.toLocaleString()}원 (${item.bankName} ${item.accountNumber})${confirmModal.action === '거절' ? ' / 사유: ' + rejectReason : ''}`,
          String(item.memberNo),
          'user'
        );
      }

      showToast(`출금 신청이 ${confirmModal.action} 처리되었습니다.`, 'success');
      setConfirmModal({ open: false, withdrawNo: null, action: '', item: null });
      fetchWithdraws(1, true);
    } catch (e: any) {
      showToast(e.response?.data?.error || '처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '신청':
        return <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-none border border-amber-100">신청</span>;
      case '처리중':
        return <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-none border border-blue-100">처리중</span>;
      case '완료':
        return <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-none border border-emerald-100">완료</span>;
      case '거절':
        return <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-none border border-rose-100">거절</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-none">{status}</span>;
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">출금 신청 관리</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-[11px] font-medium">포인트 출금 신청 목록을 확인하고 처리합니다.</p>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <p className="text-[#FF5A5A] text-[11px] font-bold">총 {withdraws.length}건</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative w-64 flex items-center h-10">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <Search className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="닉네임, 계좌번호, 은행 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-none px-4 py-2.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="전체">모든 상태</option>
              <option value="신청">신청</option>
              <option value="처리중">처리중</option>
              <option value="완료">완료</option>
              <option value="거절">거절</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-400" /> 출금 신청 목록
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredWithdraws.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredWithdraws.map(item => (
            <div key={item.withdrawNo} className="px-8 py-5 hover:bg-gray-50 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-none bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getStatusBadge(item.status)}
                      <span className="text-sm font-bold text-gray-900">{item.memberNickname}</span>
                      <span className="text-[10px] text-gray-400 font-medium">#{item.memberNo}</span>
                      <span className="text-sm font-bold text-[#FF5A5A]">{item.amount.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-none">{item.bankName}</span>
                      <span className="text-xs font-bold text-gray-900">{item.accountNumber}</span>
                      <span className="text-[10px] text-gray-400 font-medium">예금주: {item.accountHolder}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <span className="text-[10px] font-medium text-gray-400">신청 {formatDate(item.createdAt)}</span>
                      {item.processedAt && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] font-medium text-gray-400">처리 {formatDate(item.processedAt)}</span>
                        </>
                      )}
                      {item.adminNickname && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] font-bold text-gray-500">처리자: {item.adminNickname}</span>
                        </>
                      )}
                      {item.rejectReason && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] font-medium text-rose-400" title={item.rejectReason}>사유: {item.rejectReason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {(item.status === '신청' || item.status === '처리중') && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {item.status === '신청' && (
                      <button
                        onClick={() => openConfirm(item, '처리중')}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-none transition-all"
                        title="처리중으로 변경"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openConfirm(item, '완료')}
                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-none transition-all"
                      title="출금 완료"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openConfirm(item, '거절')}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-none transition-all"
                      title="신청 거절"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isLoading && filteredWithdraws.length === 0 && (
            <div className="px-8 py-20 text-center">
              <Wallet className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">출금 신청 내역이 없습니다.</p>
            </div>
          )}
        </div>

        {(hasMore || isLoading) && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>

      {/* 처리 확인 모달 */}
      {confirmModal.open && confirmModal.item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setConfirmModal({ open: false, withdrawNo: null, action: '', item: null })} />
          <div className="relative bg-white w-full max-w-md rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-none flex items-center justify-center ${confirmModal.action === '완료' ? 'bg-emerald-50' :
                  confirmModal.action === '처리중' ? 'bg-blue-50' : 'bg-rose-50'
                }`}>
                {confirmModal.action === '완료' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> :
                  confirmModal.action === '처리중' ? <RefreshCw className="w-6 h-6 text-blue-500" /> :
                    <AlertTriangle className="w-6 h-6 text-rose-500" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">출금 {confirmModal.action} 처리</h3>
                <p className="text-xs text-gray-400 font-medium">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* 출금 정보 요약 */}
              <div className="bg-gray-50 rounded-none p-5 space-y-3 border border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">신청자</span>
                  <span className="font-bold text-gray-900">{confirmModal.item.memberNickname}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">출금 금액</span>
                  <span className="font-bold text-[#FF5A5A] text-sm">{confirmModal.item.amount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">계좌 정보</span>
                  <span className="font-bold text-gray-900">{confirmModal.item.bankName} {confirmModal.item.accountNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">예금주</span>
                  <span className="font-bold text-gray-900">{confirmModal.item.accountHolder}</span>
                </div>
              </div>

              {/* 완료 처리 시 경고 문구 */}
              {confirmModal.action === '완료' && (
                <div className="flex items-start gap-3 bg-emerald-50 rounded-none p-4 border border-emerald-100">
                  <AlertTriangle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-emerald-700 font-bold leading-relaxed">
                    실제 계좌이체 완료 후 처리하세요. 완료 처리 후에는 포인트가 복구되지 않습니다.
                  </p>
                </div>
              )}

              {/* 거절 시 사유 입력 */}
              {confirmModal.action === '거절' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">거절 사유 <span className="text-rose-400">*</span></label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="거절 사유를 입력해주세요. (회원에게 전달됩니다)"
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 outline-none resize-none font-medium"
                  />
                  <div className="flex items-start gap-2 text-[10px] text-gray-400 font-medium">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <p>거절 시 별도의 포인트 처리는 발생하지 않습니다. (포인트는 완료 시에만 차감됩니다)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-0 flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, withdrawNo: null, action: '', item: null })}
                className="flex-1 py-4 bg-gray-100 text-gray-500 text-sm font-bold rounded-none hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleProcess}
                className={`flex-1 py-4 text-white text-sm font-bold rounded-none transition-all shadow-lg ${confirmModal.action === '완료' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' :
                    confirmModal.action === '처리중' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' :
                      'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                  }`}
              >
                {confirmModal.action} 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};