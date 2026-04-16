import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BsBag } from 'react-icons/bs';

import { BsInfoCircle, BsShieldCheck, BsPerson, BsCalendarCheck, BsCurrencyDollar, BsWallet, BsExclamationTriangle, BsClockHistory } from 'react-icons/bs';
import { BiSearch } from 'react-icons/bi';
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
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">관리자 활동 로그</h1>
          <p className="text-gray-500 mt-1 text-[11px] font-medium">관리자들의 모든 활동 내역을 기록하고 모니터링합니다.</p>
        </div>
        <div className="relative w-full sm:w-64 flex items-center h-10">
          <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
            <BiSearch className="text-gray-400 w-4 h-4" />
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
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BsClockHistory className="w-5 h-5 text-gray-400" /> 활동 내역
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredLogs.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredLogs.slice(0, visibleCount).map((log) => {
            const target = getTargetLabel(log.targetType);
            const TargetIcon = target.icon;
            return (
              <div key={log.id} className="px-8 py-5 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-none bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                      <BsExclamationTriangle className="w-4 h-4 text-[#FF5A5A]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">{log.adminNickname}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold ${target.color}`}>
                          <TargetIcon className="w-3 h-3" />
                          {target.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 shrink-0">
                    <BsCalendarCheck className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="px-8 py-20 text-center">
              <BsClockHistory className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-gray-400 font-bold">활동 로그가 없습니다.</p>
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
