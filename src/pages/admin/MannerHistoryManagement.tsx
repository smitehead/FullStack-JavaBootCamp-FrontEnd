import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BsThermometerHalf } from 'react-icons/bs';

import { BsCalendarCheck, BsSearch } from 'react-icons/bs';
import { useAppContext } from '@/context/AppContext';

const ITEMS_PER_PAGE = 15;

export const MannerHistoryManagement: React.FC = () => {
  const { mannerHistory, users } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const getNickname = (userId: string) => {
    return users.find(u => u.id === userId)?.nickname || '알 수 없는 사용자';
  };

  const filteredHistory = mannerHistory.filter(history =>
    getNickname(history.userId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    history.reason.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredHistory.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredHistory.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">매너온도 히스토리</h1>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">사용자들의 매너온도 변경 이력을 모니터링합니다.</p>
        </div>
        <div className="relative w-64 flex items-center h-10">
          <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
            <BsSearch className="text-gray-400 w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="닉네임 또는 사유 검색"
            className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsThermometerHalf className="w-4 h-4 text-gray-400" /> 변경 이력
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredHistory.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredHistory.slice(0, visibleCount).map((history) => {
            const isIncrease = history.newTemp > history.previousTemp;
            return (
              <div key={history.id} className="px-5 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center min-w-0">
                  <span className="w-[120px] shrink-0 text-[13px] font-bold text-gray-900 truncate" title={history.userNickname || getNickname(history.userId)}>{history.userNickname || getNickname(history.userId)}</span>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <div className="w-[180px] shrink-0 inline-flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{history.previousTemp.toFixed(1)}°C</span>
                    <span className="text-xs text-gray-300">→</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-none ${isIncrease ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{history.newTemp.toFixed(1)}°C</span>
                    <span className={`text-xs font-bold ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
                      ({isIncrease ? '+' : ''}{(history.newTemp - history.previousTemp).toFixed(1)})
                    </span>
                  </div>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <span className="flex-1 min-w-0 text-xs text-gray-600 truncate" title={history.reason}>{history.reason}</span>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <span className="w-[120px] shrink-0 text-xs text-gray-400">{new Date(history.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
          {filteredHistory.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredHistory.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
};
