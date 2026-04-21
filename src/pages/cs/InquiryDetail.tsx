import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { BsShieldCheck, BsClock, BsPerson, BsCalendar, BsList } from 'react-icons/bs';
import { format } from 'date-fns';
import api from '@/services/api';
import { Inquiry } from '@/types';
import { useAppContext } from '@/context/AppContext';

export const InquiryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [inquiry, setInquiry] = React.useState<Inquiry | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    if (!id || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.get(`/inquiries/${id}`)
      .then(res => {
        setInquiry(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch inquiry:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, user]);

  if (!user && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400 font-bold">로그인이 필요한 서비스입니다.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-colors shadow-lg shadow-brand/10"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-bold">내역을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !inquiry) {
    const errorMessage = error?.response?.data?.message || '존재하지 않는 문의 내역입니다.';
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400 font-bold">{errorMessage}</p>
        <button
          onClick={() => navigate('/inquiry')}
          className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Back Button */}
      <button
        onClick={() => navigate('/inquiry')}
        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
      >
        <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        문의 목록으로
      </button>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Header Section */}
        <div className="p-10 border-b border-gray-50">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider bg-gray-100 text-gray-600 shadow-lg shadow-gray-100/50">
                {inquiry.type}
              </span>
              {inquiry.bugType && (
                <span className="px-3 py-1 bg-blue-50 text-blue-500 text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-gray-100/50">
                  {inquiry.bugType}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">{inquiry.title}</h1>

          <div className="flex items-center gap-6 text-sm text-gray-400 font-bold">
            <div className="flex items-center gap-2">
              <BsCalendar className="w-4 h-4" />
              작성일: {format(new Date(inquiry.createdAt), 'yyyy.MM.dd HH:mm')}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
              <BsPerson className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 mb-2">문의 내용</div>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                {inquiry.content}
              </div>

              {/* Images (if any) */}
              {inquiry.imageUrls && inquiry.imageUrls.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-4">
                  {inquiry.imageUrls.map((img, index) => (
                    <img
                      key={index}
                      src={img || undefined}
                      alt={`inquiry-img-${index}`}
                      className="w-32 h-32 object-cover rounded-2xl border border-gray-100 hover:scale-105 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Answer Section */}
          {inquiry.status === 1 && inquiry.answer && (
            <div className="mt-12 p-8 bg-gray-50 rounded-3xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shrink-0 shadow-lg shadow-brand/10">
                  <BsShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="text-sm font-bold text-gray-900">
                      {inquiry.adminNickname || '운영팀'} 답변
                    </div>
                    {inquiry.answeredAt && (
                      <div className="text-xs text-gray-400 font-bold">
                        답변일: {format(new Date(inquiry.answeredAt), 'yyyy.MM.dd HH:mm')}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {inquiry.answer}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200/50 flex items-center gap-2 text-xs text-gray-400 font-bold italic">
                    <BsClock className="w-3.5 h-3.5" />
                    추가 문의가 필요하신 경우 새로운 문의를 작성해 주시기 바랍니다.
                  </div>
                </div>
              </div>
            </div>
          )}

          {inquiry.status === 0 && (
            <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center shrink-0">
                  <BsClock className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="text-sm font-bold text-gray-400">운영팀 답변</div>
                  </div>

                  <div className="text-gray-400 leading-relaxed font-bold italic">
                    답변을 준비 중입니다.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-100">
          <div className="p-6 flex items-center justify-center bg-gray-50/30">
            <Link
              to="/inquiry"
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <BsList className="w-4 h-4" />
              목록으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
