import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';

interface PointHistoryItem {
  type: string;
  amount: number;
  balance: number;
  reason: string;
  createdAt: string;
}

export const Points: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();

  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 필터 상태 — 기존 UI 유지
  const [typeFilter, setTypeFilter] = useState<'all' | 'charge' | 'withdraw' | 'use'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '1m' | '3m' | '6m'>('all');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async (pageNum: number, reset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.get('/points/history', {
        params: { page: pageNum, size: 20 },
      });
      const { content, last } = res.data;
      setHistory((prev) => (reset ? content : [...prev, ...content]));
      setHasMore(!last);
    } catch (e) {
      console.error('포인트 내역 조회 실패', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchHistory(1, true);
  }, []);

  // 무한스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchHistory(nextPage);
        }
      },
      { threshold: 1.0 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page, fetchHistory]);

  // 날짜 필터 클라이언트 처리
  const getDateCutoff = () => {
    if (dateFilter === 'all') return null;
    const d = new Date();
    if (dateFilter === '1m') d.setMonth(d.getMonth() - 1);
    if (dateFilter === '3m') d.setMonth(d.getMonth() - 3);
    if (dateFilter === '6m') d.setMonth(d.getMonth() - 6);
    return d;
  };

  const filteredHistory = history.filter((item) => {
    const matchType = typeFilter === 'all' || item.type === typeFilter ||
      (typeFilter === 'charge' && item.type === '충전') ||
      (typeFilter === 'withdraw' && item.type === '출금') ||
      (typeFilter === 'use' && (item.type === '낙찰차감' || item.type === '판매정산'));
    const cutoff = getDateCutoff();
    const matchDate = !cutoff || new Date(item.createdAt) >= cutoff;
    return matchType && matchDate;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const y = date.getFullYear().toString().slice(-2);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${y}.${m}.${d} ${h}:${min}`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'all': return '전체유형';
      case 'charge': return '충전';
      case 'withdraw': return '출금';
      case 'use': return '입찰정산';
      case '충전': return '충전';
      case '출금': return '출금';
      case '낙찰차감': return '입찰차감';
      case '입찰차감': return '입찰참여';
      case '입찰환불': return '입찰환불';
      case '판매정산': return '판매정산';
      case '낙찰대금수령': return '판매정산';
      case '거래취소환불': return '거래취소환불';
      case '거래취소회수': return '거래취소회수';
      case '관리자추가': return '관리자추가';
      case '관리자회수': return '관리자회수';
      default: return type;
    }
  };

  const isIncome = (item: PointHistoryItem) => item.amount > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h2 className="text-3xl font-black text-gray-900 tracking-normal">포인트</h2>
        </div>
        <Link
          to="/points/charge"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
        >
          <CreditCard className="w-3.5 h-3.5" /> 카드 관리
        </Link>
      </div>

      {/* 잔액 카드 */}
      <div className="bg-gray-900 rounded-[32px] p-8 text-white mb-10 shadow-2xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">현재 보유 포인트</p>
            <h3 className="text-4xl font-black tracking-tight">
              {(user?.points || 0).toLocaleString()}
              <span className="text-xl ml-1 text-indigo-400">P</span>
            </h3>
          </div>
          <div className="flex gap-2">
            <Link to="/points/charge" className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20">
              충전
            </Link>
            <Link to="/points/withdraw" className="px-6 py-2.5 bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl hover:bg-white/20 transition-all">
              출금
            </Link>
          </div>
        </div>
      </div>

      {/* 내역 섹션 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">포인트 내역</h4>
          <div className="flex items-center gap-4">
            {/* 유형 필터 */}
            <div className="relative">
              <button
                onClick={() => { setShowTypeFilters(!showTypeFilters); setShowDateFilters(false); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                {typeFilter === 'all' ? '전체유형' : getTypeLabel(typeFilter)}
                {showTypeFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTypeFilters && (
                <div className="absolute right-0 mt-2 w-28 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden">
                  {[
                    { label: '전체유형', value: 'all' },
                    { label: '충전', value: 'charge' },
                    { label: '출금', value: 'withdraw' },
                    { label: '입찰정산', value: 'use' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTypeFilter(opt.value as any); setShowTypeFilters(false); }}
                      className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-gray-50 transition-colors ${typeFilter === opt.value ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-600'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 기간 필터 */}
            <div className="relative">
              <button
                onClick={() => { setShowDateFilters(!showDateFilters); setShowTypeFilters(false); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                {dateFilter === 'all' ? '전체기간' : dateFilter === '1m' ? '1개월' : dateFilter === '3m' ? '3개월' : '6개월'}
                {showDateFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showDateFilters && (
                <div className="absolute right-0 mt-2 w-24 bg-white border border-gray-100 rounded-xl shadow-xl z-10 overflow-hidden">
                  {[
                    { label: '전체', value: 'all' },
                    { label: '1개월', value: '1m' },
                    { label: '3개월', value: '3m' },
                    { label: '6개월', value: '6m' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setDateFilter(opt.value as any); setShowDateFilters(false); }}
                      className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-gray-50 transition-colors ${dateFilter === opt.value ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-600'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          {filteredHistory.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredHistory.map((item, idx) => (
                <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-400 font-medium">{formatDate(item.createdAt)}</p>
                    <p className="text-lg font-bold text-gray-900">{getTypeLabel(item.type)}</p>
                    {item.reason && <p className="text-xs text-gray-400">{item.reason}</p>}
                  </div>
                  <div className="text-right flex flex-col gap-1">
                    <p className={`text-xl font-bold ${isIncome(item) ? 'text-blue-500' : 'text-gray-900'}`}>
                      {isIncome(item) ? '+' : ''}{item.amount.toLocaleString()}P
                    </p>
                    <p className="text-sm text-gray-400 font-medium">{item.balance.toLocaleString()}P</p>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div ref={loaderRef} className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-gray-400 font-medium">
                {isLoading ? '내역을 불러오는 중...' : '포인트 내역이 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};