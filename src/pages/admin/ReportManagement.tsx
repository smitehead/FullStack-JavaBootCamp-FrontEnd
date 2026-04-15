import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, Search, Filter, User, Gavel, MessageSquare, ShieldAlert, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { showToast } from '@/components/toastService';
import { ImageLightbox } from '@/components/ImageLightbox';
import api from '@/services/api';

interface ReportDetail {
  reportNo: number;
  reporterNo: number;
  reporterNickname?: string;
  targetMemberNo?: number;
  targetMemberNickname?: string;
  targetProductNo?: number;
  type: string;
  content: string;
  status: string;
  penaltyMsg?: string;
  createdAt: string;
  imageUrls?: string[];
}

const ITEMS_PER_PAGE = 15;

export const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [resolveAction, setResolveAction] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailReport, setDetailReport] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 신고 목록 fetch (실제 API)
  useEffect(() => {
    setListLoading(true);
    api.get('/admin/reports')
      .then(res => setReports(res.data))
      .catch(() => showToast('신고 목록 조회에 실패했습니다.', 'error'))
      .finally(() => setListLoading(false));
  }, []);

  const isResolved = (status: string) =>
    status !== '접수' && status !== 'PENDING' && status !== 'pending';

  const filteredReports = reports.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      String(r.reportNo).includes(searchTerm) ||
      (r.type || '').toLowerCase().includes(term) ||
      (r.content || '').toLowerCase().includes(term) ||
      (r.reporterNickname || '').toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !isResolved(r.status)) ||
      (statusFilter === 'resolved' && isResolved(r.status));
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, statusFilter]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredReports.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredReports.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleViewDetail = async (reportNo: number) => {
    // 이미 목록에 있는 데이터를 먼저 활용 (이미지 포함 최신 데이터는 API로 보강)
    setDetailReport(null);
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/admin/reports/${reportNo}`);
      setDetailReport(res.data);
    } catch {
      showToast('신고 상세 조회에 실패했습니다.', 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    if (!resolveAction.trim()) {
      showToast('처리 내용 및 제재 사유를 입력해주세요.', 'error');
      return;
    }
    try {
      await api.put(`/admin/reports/${selectedReport.reportNo}/resolve`, {
        status: '처리완료',
        penaltyMsg: resolveAction.trim(),
      });
      setReports(prev =>
        prev.map(r =>
          r.reportNo === selectedReport.reportNo
            ? { ...r, status: '처리완료', penaltyMsg: resolveAction.trim() }
            : r
        )
      );
      setShowResolveModal(false);
      setSelectedReport(null);
      setResolveAction('');
      showToast('신고 처리가 완료되었습니다.', 'success');
    } catch {
      showToast('신고 처리에 실패했습니다.', 'error');
    }
  };

  const getTargetInfo = (report: ReportDetail) => {
    if (report.targetMemberNo) {
      return {
        name: report.targetMemberNickname || `사용자 #${report.targetMemberNo}`,
        icon: User,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        link: `/admin/users?nickname=${report.targetMemberNickname || ''}`,
      };
    } else if (report.targetProductNo) {
      return {
        name: `상품 #${report.targetProductNo}`,
        icon: Gavel,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        link: `/admin/auctions`,
      };
    }
    return {
      name: '알 수 없는 대상',
      icon: MessageSquare,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      link: '#',
    };
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">신고 관리</h1>
          <p className="text-gray-500 mt-1 text-[11px] font-medium">사용자 및 상품에 대한 신고 내역을 검토하고 처리합니다.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative w-64 flex items-center h-10">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <Search className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="신고번호, 유형, 내용 검색"
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
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">전체 상태</option>
              <option value="pending">처리 대기</option>
              <option value="resolved">처리 완료</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400" /> 신고 목록
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredReports.length}건</span>
        </div>

        {listLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
          </div>
        )}

        {!listLoading && (
          <div className="divide-y divide-gray-50">
            {filteredReports.slice(0, visibleCount).map((report) => {
              const target = getTargetInfo(report);
              const TargetIcon = target.icon;
              const resolved = isResolved(report.status);
              return (
                <div key={report.reportNo} className="px-8 py-5 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-none ${target.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                        <TargetIcon className={`w-4 h-4 ${target.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold ${resolved ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            {resolved ? '처리됨' : '대기중'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{report.reportNo}</span>
                        </div>
                        <button
                          onClick={() => handleViewDetail(report.reportNo)}
                          className="text-sm font-bold text-gray-900 mb-1 text-left hover:text-[#FF5A5A] transition-colors cursor-pointer"
                        >
                          {report.type ? `[${report.type}] ` : ''}{(report.content || '').length > 40 ? (report.content || '').slice(0, 40) + '…' : (report.content || '')}
                        </button>
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <Link
                            to={`/admin/users?nickname=${report.reporterNickname || ''}`}
                            className="font-bold text-gray-500 hover:text-[#FF5A5A] transition-colors"
                          >
                            신고자: {report.reporterNickname || `#${report.reporterNo}`}
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            to={target.link}
                            className="font-bold text-gray-500 hover:text-[#FF5A5A] transition-colors"
                          >
                            대상: {target.name}
                          </Link>
                          <span className="text-gray-300">|</span>
                          <span className="text-[10px] font-medium text-gray-400">{report.createdAt ? new Date(report.createdAt).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    </div>
                    {!resolved && (
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowResolveModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-[#FF5A5A] hover:bg-red-50 rounded-none transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="신고 처리"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredReports.length === 0 && (
              <div className="px-8 py-20 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <p className="text-gray-400 font-bold">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {visibleCount < filteredReports.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#FF5A5A]" />
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-red-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#FF5A5A]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">신고 상세</h3>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {detailLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                </div>
              )}

              {!detailLoading && detailReport && (
                <div className="px-8 pb-8 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">신고 번호</p>
                      <p className="text-sm font-bold text-gray-900">#{detailReport.reportNo}</p>
                    </div>
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">신고 유형</p>
                      <p className="text-sm font-bold text-gray-900">{detailReport.type}</p>
                    </div>
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">처리 상태</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold ${isResolved(detailReport.status) ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        {detailReport.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">신고 일시</p>
                      <p className="text-xs font-bold text-gray-900">{detailReport.createdAt ? new Date(detailReport.createdAt).toLocaleString() : '-'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-none p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">신고자</p>
                    <p className="text-sm font-bold text-gray-900">{detailReport.reporterNickname || `#${detailReport.reporterNo}`}</p>
                  </div>

                  {(detailReport.targetMemberNickname || detailReport.targetMemberNo) && (
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">피신고 사용자</p>
                      <p className="text-sm font-bold text-gray-900">{detailReport.targetMemberNickname || `#${detailReport.targetMemberNo}`}</p>
                    </div>
                  )}

                  {detailReport.targetProductNo && (
                    <div className="bg-gray-50 rounded-none p-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">신고 상품 번호</p>
                      <p className="text-sm font-bold text-gray-900">#{detailReport.targetProductNo}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-none p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">신고 내용</p>
                    <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">{detailReport.content}</p>
                  </div>

                  {detailReport.penaltyMsg && (
                    <div className="bg-red-50 rounded-none p-4 border border-red-100">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">처리 내용 / 제재 사유</p>
                      <p className="text-sm font-medium text-red-700 whitespace-pre-wrap leading-relaxed">{detailReport.penaltyMsg}</p>
                    </div>
                  )}

                  {detailReport.imageUrls && detailReport.imageUrls.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">첨부 이미지</p>
                      <div className="flex flex-wrap gap-3">
                        {detailReport.imageUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`report-img-${idx}`}
                            className="w-28 h-28 object-cover rounded-xl border border-gray-100 hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => { setLightboxUrls(detailReport.imageUrls!); setLightboxIndex(idx); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resolve Report Modal */}
      <AnimatePresence>
        {showResolveModal && selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowResolveModal(false); setResolveAction(''); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#FF5A5A]" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-none bg-red-50 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-[#FF5A5A]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">신고 처리</h3>
                  <p className="text-sm text-gray-500 font-medium">신고 내용을 검토하고 조치를 취합니다.</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-none p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">신고 유형</p>
                  <p className="text-sm font-bold text-gray-900">{selectedReport.type}</p>
                </div>
                <div className="bg-gray-50 rounded-none p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">신고 내용</p>
                  <p className="text-sm font-medium text-gray-600 line-clamp-3">{selectedReport.content}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">처리 내용 / 제재 사유 <span className="text-[#FF5A5A]">*</span></label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium text-sm resize-none h-24"
                    placeholder="처리 내용 및 피신고자에게 전달할 제재 사유를 입력하세요"
                    value={resolveAction}
                    onChange={(e) => setResolveAction(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowResolveModal(false); setResolveAction(''); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-none hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={handleResolve}
                  className="flex-1 py-4 bg-[#FF5A5A] text-white font-bold rounded-none hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                  처리 완료
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {lightboxUrls.length > 0 && (
        <ImageLightbox
          urls={lightboxUrls}
          index={lightboxIndex}
          onClose={() => setLightboxUrls([])}
          onNav={setLightboxIndex}
        />
      )}
    </div>
  );
};
