import React, { useState, useEffect } from 'react';
import { Search, Wallet, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [totalPages, setTotalPages] = useState(1);

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    withdrawNo: number | null;
    action: string;
    item: WithdrawItem | null;
  }>({ open: false, withdrawNo: null, action: '', item: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchWithdraws = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/withdraws', {
        params: { status: statusFilter, page, size: 20 },
      });
      setWithdraws(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      showToast('출금 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWithdraws(); }, [statusFilter, page]);

  const filteredWithdraws = withdraws.filter(w =>
    w.memberNickname.includes(searchTerm) ||
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
      addActivityLog(
        `출금 ${confirmModal.action}`,
        `${item.memberNickname}님 출금 신청 ${confirmModal.action} — ${item.amount.toLocaleString()}원 (${item.bankName} ${item.accountNumber})${confirmModal.action === '거절' ? ' / 사유: ' + rejectReason : ''}`,
        String(item.memberNo),
        'user'
      );

      showToast(`출금 신청이 ${confirmModal.action} 처리되었습니다.`, 'success');
      setConfirmModal({ open: false, withdrawNo: null, action: '', item: null });
      fetchWithdraws();
    } catch (e: any) {
      showToast(e.response?.data?.error || '처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '신청':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-black rounded-none"><Clock className="w-3 h-3" />신청</span>;
      case '처리중':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-none"><RefreshCw className="w-3 h-3" />처리중</span>;
      case '완료':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-none"><CheckCircle2 className="w-3 h-3" />완료</span>;
      case '거절':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-black rounded-none"><XCircle className="w-3 h-3" />거절</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-none">{status}</span>;
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">출금 신청 관리</h1>
          <p className="text-gray-500 mt-1 text-[11px] font-medium">포인트 출금 신청 목록을 확인하고 처리합니다.</p>
        </div>
        <div className="relative w-64 flex items-center h-10">
          <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
            <Search className="text-gray-400 w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="닉네임, 계좌번호, 은행 검색"
            className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* 상태 필터 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        {['전체', '신청', '처리중', '완료', '거절'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 text-xs font-black border-b-2 transition-colors ${
              statusFilter === s
                ? 'border-[#FF5A5A] text-[#FF5A5A]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-[5%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">번호</th>
                <th className="w-[12%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">신청자</th>
                <th className="w-[12%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider text-right">출금 금액</th>
                <th className="w-[20%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">계좌 정보</th>
                <th className="w-[8%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">상태</th>
                <th className="w-[10%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">처리 관리자</th>
                <th className="w-[12%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">신청일시</th>
                <th className="w-[12%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider">처리일시</th>
                <th className="w-[9%] px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-400 text-sm font-medium">
                    불러오는 중...
                  </td>
                </tr>
              ) : filteredWithdraws.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <Wallet className="w-10 h-10 text-gray-100 mx-auto mb-3" />
                    <p className="text-gray-400 font-bold text-sm">출금 신청 내역이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredWithdraws.map(item => (
                  <tr key={item.withdrawNo} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 font-medium">{item.withdrawNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{item.memberNickname}</p>
                      <p className="text-[10px] text-gray-400">#{item.memberNo}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-black text-gray-900">{item.amount.toLocaleString()}원</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-gray-900">{item.bankName}</p>
                      <p className="text-[10px] text-gray-500">{item.accountNumber}</p>
                      <p className="text-[10px] text-gray-400">{item.accountHolder}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      {item.adminNickname ? (
                        <p className="text-xs font-bold text-gray-700">{item.adminNickname}</p>
                      ) : (
                        <p className="text-[10px] text-gray-300">-</p>
                      )}
                      {item.rejectReason && (
                        <p className="text-[10px] text-red-400 mt-0.5 line-clamp-1">{item.rejectReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 font-medium">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 font-medium">{formatDate(item.processedAt)}</td>
                    <td className="px-4 py-3 text-center">
                      {(item.status === '신청' || item.status === '처리중') ? (
                        <div className="flex flex-col gap-1 items-center">
                          {item.status === '신청' && (
                            <button
                              onClick={() => openConfirm(item, '처리중')}
                              className="w-16 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black rounded-none transition-all"
                            >
                              처리중
                            </button>
                          )}
                          <button
                            onClick={() => openConfirm(item, '완료')}
                            className="w-16 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-none transition-all"
                          >
                            완료
                          </button>
                          <button
                            onClick={() => openConfirm(item, '거절')}
                            className="w-16 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-[10px] font-black rounded-none transition-all"
                          >
                            거절
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-medium">처리완료</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-gray-50">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs font-bold rounded-none transition-all ${
                  page === p ? 'bg-[#FF5A5A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 처리 확인 모달 */}
      {confirmModal.open && confirmModal.item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, withdrawNo: null, action: '', item: null })} />
          <div className="relative bg-white w-full max-w-md rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-none flex items-center justify-center ${
                confirmModal.action === '완료' ? 'bg-emerald-50' :
                confirmModal.action === '처리중' ? 'bg-blue-50' : 'bg-red-50'
              }`}>
                {confirmModal.action === '완료' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                 confirmModal.action === '처리중' ? <RefreshCw className="w-5 h-5 text-blue-500" /> :
                 <AlertTriangle className="w-5 h-5 text-red-500" />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">출금 {confirmModal.action} 처리</h3>
                <p className="text-xs text-gray-400 font-medium">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 출금 정보 요약 */}
              <div className="bg-gray-50 rounded-none p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">신청자</span>
                  <span className="font-black text-gray-900">{confirmModal.item.memberNickname}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">출금 금액</span>
                  <span className="font-black text-gray-900">{confirmModal.item.amount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">계좌</span>
                  <span className="font-black text-gray-900">{confirmModal.item.bankName} {confirmModal.item.accountNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold">예금주</span>
                  <span className="font-black text-gray-900">{confirmModal.item.accountHolder}</span>
                </div>
              </div>

              {/* 완료 처리 시 경고 문구 */}
              {confirmModal.action === '완료' && (
                <div className="flex items-start gap-2 bg-emerald-50 rounded-none p-3">
                  <AlertTriangle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                    실제 계좌이체 완료 후 처리하세요. 완료 처리 후에는 포인트가 복구되지 않습니다.
                  </p>
                </div>
              )}

              {/* 거절 시 사유 입력 */}
              {confirmModal.action === '거절' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">거절 사유 <span className="text-red-400">*</span></label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="거절 사유를 입력해주세요. (회원에게 전달됩니다)"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-none text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 outline-none resize-none font-medium"
                  />
                  <p className="text-[10px] text-gray-400 font-medium">
                    ⚠ 거절 시 별도의 포인트 처리는 발생하지 않습니다. (포인트는 완료 시에만 차감됩니다)
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, withdrawNo: null, action: '', item: null })}
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-none hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleProcess}
                className={`flex-1 py-3 text-white text-sm font-black rounded-none transition-all ${
                  confirmModal.action === '완료' ? 'bg-emerald-500 hover:bg-emerald-600' :
                  confirmModal.action === '처리중' ? 'bg-blue-500 hover:bg-blue-600' :
                  'bg-red-500 hover:bg-red-600'
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