import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, DollarSign, FileText } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { Category } from '@/types';
import api from '@/services/api';

const CATEGORY_COLORS: Record<string, string> = {
  [Category.DIGITAL]: '#FF5A5A',
  [Category.CLOTHING]: '#4F46E5',
  [Category.FURNITURE]: '#10B981',
  [Category.BOOKS]: '#F59E0B',
  [Category.ETC]: '#9CA3AF',
};

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  isImportant: boolean;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { reports, products } = useAppContext();
  const [unprocessedWithdraws, setUnprocessedWithdraws] = useState(0);
  const [recentNotices, setRecentNotices] = useState<NoticeItem[]>([]);

  useEffect(() => {
    api.get('/admin/withdraws', { params: { status: '신청', size: 1 } })
      .then(res => setUnprocessedWithdraws(res.data.totalElements || 0))
      .catch(() => {});

    api.get('/notices/all')
      .then(res => setRecentNotices((res.data || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  const unprocessedReports = reports.filter(r => r.status === 'pending').length;

  const stats = [
    { label: '미처리 신고', value: unprocessedReports, icon: AlertCircle, color: 'bg-red-500', path: '/admin/reports' },
    { label: '미처리 출금', value: unprocessedWithdraws, icon: DollarSign, color: 'bg-emerald-500', path: '/admin/withdraws' },
  ];

  const popularCategories = Object.values(Category).map(cat => ({
    name: cat,
    count: products.filter(p => p.category === cat).length,
    color: CATEGORY_COLORS[cat],
  })).filter(c => c.count > 0);

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">관리자 대시보드</h1>
        <p className="text-gray-500 mt-1 text-xs font-medium">서비스 현황을 확인하세요.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="bg-white p-5 rounded-none shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-all text-left group"
            >
              <div className={`${stat.color} p-3 rounded-none text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 mb-0.5">{stat.label}</p>
                <p className="text-xl font-black text-gray-900">{stat.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Popular Categories */}
        <section className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
          <h2 className="text-lg font-black text-gray-900 mb-6">인기 카테고리</h2>
          {popularCategories.length > 0 ? (
            <>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={popularCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {popularCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '0px', border: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: number) => [`${value}건`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
                {popularCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center space-x-1.5 whitespace-nowrap">
                    <div className="w-2 h-2 shrink-0" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-[10px] font-bold text-gray-600">{cat.name} ({cat.count}건)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm font-bold">
              등록된 상품이 없습니다.
            </div>
          )}
        </section>

        {/* Recent Notices */}
        <section className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900">최근 공지사항</h2>
            <button
              onClick={() => navigate('/admin/notices')}
              className="text-xs font-bold text-[#FF5A5A] hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-3">
            {recentNotices.length > 0 ? recentNotices.map((notice) => (
              <div key={notice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`w-1.5 h-1.5 rounded-none shrink-0 ${notice.isImportant ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">{notice.title}</p>
                    <p className="text-[10px] font-medium text-gray-400">{notice.createdAt?.split('T')[0]}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-none shrink-0 ${
                  notice.category === '점검' ? 'bg-orange-100 text-orange-700' :
                  notice.category === '업데이트' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {notice.category}
                </span>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-400 text-sm font-bold">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-100" />
                공지사항이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
