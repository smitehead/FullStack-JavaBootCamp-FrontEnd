import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BsBag } from 'react-icons/bs';

import { BsInfoCircle, BsPerson, BsCalendar, BsExclamationTriangle, BsClockHistory, BsSearch } from 'react-icons/bs';
import { useAppContext } from '@/context/AppContext';
import { ActivityLog } from '@/types';

const ITEMS_PER_PAGE = 15;

export const ActivityLogManagement: React.FC = () => {
  const { activityLogs } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredLogs = activityLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminNickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredLogs.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredLogs.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const getTargetLabel = (type?: ActivityLog['targetType']) => {
    switch (type) {
      case 'user': return { icon: BsPerson, label: '사용자', color: 'bg-blue-50 text-blue-600' };
      case 'product': return { icon: BsBag, label: '상품/경매', color: 'bg-purple-50 text-purple-600' };
      default: return { icon: BsInfoCircle, label: '기타', color: 'bg-gray-50 text-gray-600' };
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">관리자 활동 로그</h1>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">관리자들의 모든 활동 내역을 기록하고 모니터링합니다.</p>
        </div>
        <div className="relative w-full sm:w-64 flex items-center h-10">
          <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
            <BsSearch className="text-gray-400 w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="관리자, 활동, 상세 검색"
            className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsClockHistory className="w-4 h-4 text-gray-400" /> 활동 내역
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredLogs.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredLogs.slice(0, visibleCount).map((log) => {
            const target = getTargetLabel(log.targetType);
            const TargetIcon = target.icon;
            return (
              <div key={log.id} className="px-5 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center min-w-0">
                  <span className="w-[120px] shrink-0 text-[13px] font-bold text-gray-900 truncate" title={log.adminNickname}>{log.adminNickname}</span>
                  <div className="w-[68px] shrink-0">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-bold ${target.color}`}>
                      <TargetIcon className="w-2.5 h-2.5" />{target.label}
                    </span>
                  </div>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <span className="w-[160px] shrink-0 text-xs font-bold text-gray-800 truncate" title={log.action}>{log.action}</span>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <span className="flex-1 min-w-0 text-xs text-gray-500 truncate" title={log.details}>{log.details}</span>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  <span className="w-[80px] shrink-0 text-[11px] text-gray-400">{new Date(log.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                </div>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">활동 로그가 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredLogs.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
};
