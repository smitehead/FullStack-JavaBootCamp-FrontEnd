import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BiSearch, BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { NoticeCategory } from '@/types';
import { format } from 'date-fns';
import { CustomerCenterSidebar } from '@/pages/cs/CustomerCenterSidebar';
import api from '@/services/api';

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
}

export const NoticeList: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<NoticeCategory | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const categories: (NoticeCategory | '전체')[] = ['전체', '업데이트', '이벤트', '점검', '정책'];

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: currentPage - 1, size: 10 };
      if (activeCategory !== '전체') params.category = activeCategory;
      if (searchQuery.trim()) params.keyword = searchQuery.trim();
      const res = await api.get('/notices', { params });
      setNotices(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeCategory, searchQuery]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchNotices();
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-xl font-bold text-gray-900 mb-2">고객센터</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <CustomerCenterSidebar />

        <div className="flex-1">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">공지사항</h2>
            <p className="text-gray-500 mt-1 text-sm">경매 마켓플레이스의 새로운 소식과 안내를 확인하세요.</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-8">
            <input
              type="text"
              placeholder="공지사항 제목이나 내용을 검색하세요"
              className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 transition-all outline-none text-sm text-gray-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
                <BiSearch className="w-5 h-5 text-gray-400" />
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${activeCategory === category
                  ? 'bg-red-500 text-white border border-transparent shadow-lg shadow-red-500/10'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Notice List */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
              </div>
            ) : notices.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notices.map(notice => (
                  <Link
                    key={notice.id}
                    to={`/notice/${notice.id}`}
                    className="block px-8 py-5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 shrink-0">
                        {notice.isImportant ? (
                          <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-semibold rounded-md inline-block shadow-lg shadow-gray-900/10">공지</span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-md shadow-lg shadow-gray-200/50">{notice.category}</span>
                        )}
                      </div>
                      <h3 className={`flex-1 text-sm text-gray-900 group-hover:underline underline-offset-4 transition-all line-clamp-1 ${notice.isImportant ? 'font-bold' : 'font-bold'}`}>
                        {notice.title}
                      </h3>
                      <span className="w-24 text-sm text-gray-400 font-medium shrink-0 text-right">
                        {format(new Date(notice.createdAt), 'yyyy.MM.dd')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <p className="text-gray-400">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30"
              >
                <BiChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              {pageNumbers.map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${page === currentPage
                    ? 'bg-red-500 text-white border border-transparent shadow-lg shadow-red-500/10'
                    : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-30"
              >
                <BiChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
