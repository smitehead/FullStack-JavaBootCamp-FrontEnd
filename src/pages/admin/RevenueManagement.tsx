import React, { useState, useEffect, useCallback } from 'react';
import { BsBarChart, BsCurrencyDollar, BsCalendar3, BsSearch, BsFilter } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';

interface RevenueItem {
  revenueNo: number;
  amount: number;
  reason: string;
  sourceMemberNo: number | null;
  relatedProductNo: number | null;
  createdAt: string;
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  todayRevenue: number;
  totalCount: number;
}

export const RevenueManagement: React.FC = () => {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [items, setItems] = useState<RevenueItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // filters
  const [reason, setReason] = useState('');
  const [sourceMemberNo, setSourceMemberNo] = useState('');
  const [relatedProductNo, setRelatedProductNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/revenue/stats');
      setStats(res.data);
    } catch {
      showToast('통계를 불러오는데 실패했습니다.', 'error');
    }
  }, []);

  const fetchList = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/revenue', {
        params: {
          reason: reason || undefined,
          sourceMemberNo: sourceMemberNo || undefined,
          relatedProductNo: relatedProductNo || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: pageNum,
          size: 20,
        },
      });
      setItems(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      showToast('수익 내역을 불러오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [reason, sourceMemberNo, relatedProductNo, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    fetchList(1);
  }, [fetchList]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchList(p);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getReasonBadgeClass = (r: string) => {
    if (r.includes('위약금')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (r.includes('수수료')) return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-gray-50 text-gray-600 border-gray-100';
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">수익 관리</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-gray-500 text-xs font-medium">플랫폼 수익 내역을 확인합니다.</p>
          {stats && (
            <>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <p className="text-[#FF5A5A] text-xs font-bold">총 {stats.totalCount.toLocaleString()}건</p>
            </>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-none border border-gray-100 shadow-sm px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-none bg-gray-100 flex items-center justify-center">
                <BsCurrencyDollar className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">전체 누적 수익</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()}<span className="text-xs font-bold text-gray-400 ml-1">P</span></p>
          </div>
          <div className="bg-white rounded-none border border-gray-100 shadow-sm px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-none bg-blue-50 flex items-center justify-center">
                <BsBarChart className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">이번 달 수익</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.monthlyRevenue.toLocaleString()}<span className="text-xs font-bold text-gray-400 ml-1">P</span></p>
          </div>
          <div className="bg-white rounded-none border border-gray-100 shadow-sm px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-none bg-emerald-50 flex items-center justify-center">
                <BsCalendar3 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">오늘 수익</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.todayRevenue.toLocaleString()}<span className="text-xs font-bold text-gray-400 ml-1">P</span></p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-none border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-none px-3 py-2">
            <BsFilter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">필터</span>
          </div>
          <div className="relative flex items-center h-9 w-44">
            <BsSearch className="absolute left-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="사유 검색"
              className="w-full pl-9 pr-3 h-full bg-white border border-gray-200 rounded-none text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <input
            type="text"
            placeholder="회원번호"
            className="h-9 w-28 px-3 bg-white border border-gray-200 rounded-none text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent"
            value={sourceMemberNo}
            onChange={(e) => setSourceMemberNo(e.target.value)}
          />
          <input
            type="text"
            placeholder="상품번호"
            className="h-9 w-28 px-3 bg-white border border-gray-200 rounded-none text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent"
            value={relatedProductNo}
            onChange={(e) => setRelatedProductNo(e.target.value)}
          />
          <input
            type="date"
            className="h-9 px-3 bg-white border border-gray-200 rounded-none text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-300 text-xs font-bold">~</span>
          <input
            type="date"
            className="h-9 px-3 bg-white border border-gray-200 rounded-none text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            type="submit"
            className="h-9 px-4 bg-[#FF5A5A] text-white text-xs font-bold rounded-none hover:bg-[#e04e4e] transition-colors"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => { setReason(''); setSourceMemberNo(''); setRelatedProductNo(''); setStartDate(''); setEndDate(''); }}
            className="h-9 px-4 bg-gray-100 text-gray-500 text-xs font-bold rounded-none hover:bg-gray-200 transition-colors"
          >
            초기화
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsBarChart className="w-4 h-4 text-gray-400" /> 수익 내역
          </h2>
          <span className="text-xs font-bold text-gray-400">{items.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {items.map((item, idx) => (
            <div key={item.revenueNo} className="px-5 py-2 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-6 text-[11px] font-bold text-gray-300 shrink-0">
                  {(page - 1) * 20 + idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none border ${getReasonBadgeClass(item.reason)}`}>
                      {item.reason}
                    </span>
                    <span className="text-sm font-bold text-[#FF5A5A]">{item.amount.toLocaleString()}P</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-400 font-medium">
                    {item.sourceMemberNo && <span>회원 #{item.sourceMemberNo}</span>}
                    {item.relatedProductNo && (
                      <>
                        {item.sourceMemberNo && <span className="text-gray-200">|</span>}
                        <span>상품 #{item.relatedProductNo}</span>
                      </>
                    )}
                    <span className="text-gray-200">|</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-300 shrink-0">#{item.revenueNo}</span>
              </div>
            </div>
          ))}

          {!isLoading && items.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">수익 내역이 없습니다.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-center gap-1">
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-8 h-8 text-xs font-bold rounded-none transition-colors ${
                  p === page
                    ? 'bg-[#FF5A5A] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
