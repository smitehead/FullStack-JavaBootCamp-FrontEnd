import React, { useState } from 'react';
import { History, Search, ShieldCheck, User, Gavel, AlertTriangle, Calendar, Info } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { ActivityLog } from '@/types';

export const ActivityLogManagement: React.FC = () => {
  const { activityLogs } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = activityLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminNickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTargetLabel = (type?: ActivityLog['targetType']) => {
    switch (type) {
      case 'user': return { icon: User, label: '사용자', color: 'bg-blue-50 text-blue-600' };
      case 'product': return { icon: Gavel, label: '상품/경매', color: 'bg-purple-50 text-purple-600' };
      case 'report': return { icon: AlertTriangle, label: '신고', color: 'bg-orange-50 text-orange-600' };
      default: return { icon: Info, label: '기타', color: 'bg-gray-50 text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">관리자 활동 로그</h1>
          <p className="text-gray-500 mt-1 text-[11px] font-medium">관리자들의 모든 활동 내역을 기록하고 모니터링합니다.</p>
        </div>
        <div className="relative w-full sm:w-64 flex items-center h-10">
          <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
            <Search className="text-gray-400 w-4 h-4" />
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

      {/* Log List - Card Style */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const target = getTargetLabel(log.targetType);
          const TargetIcon = target.icon;
          return (
            <div key={log.id} className="bg-white p-4 rounded-none shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-none bg-red-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF5A5A]" />
                  </div>
                  <span className="text-sm font-black text-gray-900">{log.adminNickname}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-black ${target.color}`}>
                    <TargetIcon className="w-3 h-3" />
                    {target.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
              <div className="pl-9">
                <p className="text-sm font-bold text-gray-800">{log.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLogs.length === 0 && (
        <div className="py-20 text-center">
          <History className="w-12 h-12 text-gray-100 mx-auto mb-4" />
          <p className="text-gray-400 font-bold">활동 로그가 없습니다.</p>
        </div>
      )}
    </div>
  );
};
