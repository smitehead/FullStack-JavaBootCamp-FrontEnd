import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsCalendarCheck, BsExclamationCircle, BsCurrencyDollar, BsFileText, BsCheckCircle, BsChatLeftDots } from 'react-icons/bs';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import api from '@/services/api';

const PALETTE = [
  '#FF5A5A', '#4F46E5', '#10B981', '#F59E0B', '#9CA3AF',
  '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16',
];

interface CategoryStat {
  name: string;
  count: number;
  color: string;
}

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  isImportant: boolean;
  createdAt: string;
}

interface InquiryItem {
  inquiryNo: string;
  title: string;
  status: number;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { reports } = useAppContext();
  const [unprocessedWithdraws, setUnprocessedWithdraws] = useState(0);
  const [unprocessedInquiries, setUnprocessedInquiries] = useState(0);
  const [recentNotices, setRecentNotices] = useState<NoticeItem[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<InquiryItem[]>([]);
  const [popularCategories, setPopularCategories] = useState<CategoryStat[]>([]);

  useEffect(() => {
    // 미처리 출금 건수 조회
    api.get('/admin/withdraws', { params: { status: '신청', size: 1 } })
      .then(res => setUnprocessedWithdraws(res.data.totalElements || 0))
      .catch(() => { });

    // 최근 공지사항 조회
    api.get('/notices/all')
      .then(res => setRecentNotices((res.data || []).slice(0, 5)))
      .catch(() => { });

    // 미처리 문의 건수 및 최근 문의 조회
    api.get('/admin/inquiries', { params: { status: 0, size: 5 } })
      .then(res => {
        setUnprocessedInquiries(res.data.totalElements || 0);
        setRecentInquiries(res.data.content || []);
      })
      .catch(() => { });

    // 대분류별 상품 건수 조회
    api.get('/admin/products/category-stats')
      .then(res => {
        setPopularCategories(
          (res.data || []).map((item: { name: string; count: number }, index: number) => ({
            name: item.name,
            count: Number(item.count),
            color: PALETTE[index % PALETTE.length],
          }))
        );
      })
      .catch(() => { });
  }, []);

  const unprocessedReports = reports.filter(r => r.status === 'pending').length;

  const stats = [
    { label: '미처리 신고', value: unprocessedReports, icon: BsExclamationCircle, color: 'bg-red-500', path: '/admin/reports' },
    { label: '미처리 문의', value: unprocessedInquiries, icon: BsChatLeftDots, color: 'bg-orange-500', path: '/admin/inquiries' },
    { label: '미처리 출금', value: unprocessedWithdraws, icon: BsCurrencyDollar, color: 'bg-emerald-500', path: '/admin/withdraws' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">관리자 대시보드</h1>
        <p className="text-gray-500 mt-1 text-xs font-medium">서비스 현황을 확인하세요.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Popular Categories */}
        <section className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-6">인기 카테고리</h2>
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
                      nameKey="name"
                    >
                      {popularCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '0px', border: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [`${value}건`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
                {popularCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center space-x-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
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

        {/* Recent Inquiries */}
        <section className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">최근 문의사항</h2>
            <button
              onClick={() => navigate('/admin/inquiries')}
              className="text-xs font-bold text-[#FF5A5A] hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-3">
            {recentInquiries.length > 0 ? recentInquiries.map((inquiry) => (
              <div key={inquiry.inquiryNo} className="flex items-center justify-between p-3 bg-gray-50 rounded-none cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => navigate('/admin/inquiries')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`w-1.5 h-1.5 rounded-none shrink-0 ${inquiry.status === 1 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">{inquiry?.title || '제목 없음'}</p>
                    <p className="text-[10px] font-medium text-gray-400">{inquiry?.createdAt?.split('T')[0] || '-'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none shrink-0 ${inquiry.status === 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {inquiry.status === 1 ? '답변 완료' : '답변 대기중'}
                </span>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-400 text-sm font-bold">
                <BsChatLeftDots className="w-8 h-8 mx-auto mb-2 text-gray-100" />
                문의사항이 없습니다.
              </div>
            )}
          </div>
        </section>

        {/* Recent Notices */}
        <section className="bg-white p-6 rounded-none shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">최근 공지사항</h2>
            <button
              onClick={() => navigate('/admin/notices')}
              className="text-xs font-bold text-[#FF5A5A] hover:underline"
            >
              전체보기
            </button>
          </div>
          <div className="space-y-3">
            {recentNotices.length > 0 ? recentNotices.map((notice) => (
              <div key={notice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-none cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => navigate('/admin/notices')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={`w-1.5 h-1.5 rounded-none shrink-0 ${notice.isImportant ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-gray-900 truncate">{notice.title}</p>
                    <p className="text-[10px] font-medium text-gray-400">{notice.createdAt?.split('T')[0]}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none shrink-0 ${notice.category === '점검' ? 'bg-orange-100 text-orange-700' :
                  notice.category === '업데이트' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                  {notice.category}
                </span>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-400 text-sm font-bold">
                <BsFileText className="w-8 h-8 mx-auto mb-2 text-gray-100" />
                공지사항이 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
