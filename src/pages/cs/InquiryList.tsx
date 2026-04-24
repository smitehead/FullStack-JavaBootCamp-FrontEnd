import { Link, useNavigate } from 'react-router-dom';

import { BsClock, BsChatLeftDots, BsSearch, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { Inquiry, InquiryType } from '@/types';
import { format } from 'date-fns';
import { CustomerCenterSidebar } from '@/pages/cs/CustomerCenterSidebar';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';
import React, { useEffect, useState, useCallback } from 'react';
import { Pagination } from '@/components/Pagination';
import { showToast } from '@/components/toastService';

export const InquiryList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<InquiryType | '전체'>('전체');
  const navigate = useNavigate();
  const { user, isInitialized } = useAppContext();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInquiries = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, size: 10 };
      if (selectedType !== '전체') params.type = selectedType;
      if (searchTerm.trim()) params.keyword = searchTerm.trim();

      const res = await api.get('/inquiries/my', { params });
      setInquiries(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('문의 내역 조회 실패', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentPage, selectedType, searchTerm]);

  useEffect(() => {
    if (isInitialized && !user) {
      showToast('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.', 'info');
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInquiries();
  };

  const categories: (InquiryType | '전체')[] = ['전체', '버그 신고', '포인트 문의', '계정 문의', '기타'];

  if (!isInitialized || isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">고객센터</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <CustomerCenterSidebar />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">문의하기</h2>
              <p className="text-gray-500 mt-1 text-sm">서비스 이용 중 궁금하신 점이나 불편한 사항을 남겨주세요.</p>
            </div>
            <button
              onClick={() => navigate('/inquiry/create')}
              className="px-6 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 flex items-center justify-center shrink-0 text-sm"
            >
              문의 작성하기
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-8">
            <input
              type="text"
              placeholder="문의 제목이나 내용을 검색해보세요"
              className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-gray-200 transition-all outline-none text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
              <BsSearch className="w-5 h-5 text-gray-400" />
            </button>
          </form>

          {/* type Tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedType(cat);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${selectedType === cat
                  ? 'bg-brand text-white border border-transparent shadow-lg shadow-brand/10'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100 shadow-sm'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Inquiry List */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            {inquiries.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {inquiries.map(inquiry => (
                  <Link
                    key={inquiry.inquiryNo}
                    to={`/inquiry/${inquiry.inquiryNo}`}
                    className="block px-8 py-5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-24 shrink-0 flex items-center">
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md shadow-lg shadow-gray-100/50">{inquiry.type}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-4 min-w-0">
                        <h3 className="flex-1 text-sm text-gray-900 group-hover:underline underline-offset-4 transition-all line-clamp-1 font-bold">
                          {inquiry.title}
                        </h3>
                        <div className="w-24 shrink-0 text-center">
                          {inquiry.status === 1 ? (
                            <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-600 rounded-md shadow-lg shadow-gray-100/50 inline-block">답변완료</span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-600 rounded-md shadow-lg shadow-gray-100/50 inline-block">답변대기</span>
                          )}
                        </div>
                      </div>
                      <span className="w-24 text-sm text-gray-400 font-medium shrink-0 text-right">
                        {format(new Date(inquiry.createdAt), 'yyyy.MM.dd')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BsChatLeftDots className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold">문의 내역이 없습니다.</p>
              </div>
            )}
          </div>

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={(page) => setCurrentPage(page)} 
          />

          {/* Help Banner */}
          <div className="mt-12 p-8 bg-gray-900 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-xl font-bold mb-2">도움이 더 필요하신가요?</h4>
              <p className="text-gray-400 text-sm">자주 묻는 질문(FAQ)에서 빠르게 답을 찾아보실 수 있습니다.</p>
            </div>
            <Link to="/faq" className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-colors">
              FAQ 바로가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
