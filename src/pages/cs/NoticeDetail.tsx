import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BsList } from 'react-icons/bs';

import { BsInfoCircle, BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { BsCalendar } from 'react-icons/bs';
import { format } from 'date-fns';
import api from '@/services/api';

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  maintenanceStart?: string;
  maintenanceEnd?: string;
}

interface NeighborNotice {
  id: number;
  title: string;
}

export const NoticeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<NoticeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [detailRes, listRes] = await Promise.all([
          api.get(`/notices/${id}`),
          api.get('/notices/all')
        ]);
        
        setNotice(detailRes.data);
      } catch (err) {
        console.error("Notice fetch error:", err);
        setNotice(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner-border w-12 h-12" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-400">존재하지 않는 공지사항입니다.</p>
        <button
          onClick={() => navigate('/notice')}
          className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Back Button */}
      <button
        onClick={() => navigate('/notice')}
        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
      >
        <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        공지사항 목록
      </button>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Header Section */}
        <div className="p-10 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-lg shadow-gray-100/50 ${notice.category === '점검' ? 'bg-blue-50 text-blue-500' :
              notice.category === '업데이트' ? 'bg-green-50 text-green-500' :
                notice.category === '이벤트' ? 'bg-purple-50 text-purple-500' :
                  'bg-gray-100 text-gray-600'
              }`}>
              {notice.category}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{notice.title}</h1>
          <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <BsCalendar className="w-4 h-4" />
              {format(new Date(notice.createdAt), 'yyyy.MM.dd')}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-10">
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[300px]">
            {notice.content}
          </div>

          {/* Info Box */}
          {notice.category === '점검' && (
            <div className="mt-10 p-8 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4 text-blue-500">
                <BsInfoCircle className="w-5 h-5" />
                <span className="font-bold">점검 상세 안내</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-4">
                  <span className="w-20 text-gray-400 font-bold shrink-0">점검 일시</span>
                  <span className="text-gray-900">
                    {notice.maintenanceStart
                      ? `${format(new Date(notice.maintenanceStart), 'yyyy.MM.dd HH:mm')} ~ ${notice.maintenanceEnd ? format(new Date(notice.maintenanceEnd), 'yyyy.MM.dd HH:mm') : '미정'}`
                      : '공지사항 내용을 확인해주세요.'}
                  </span>
                </div>
              </div>

              {/* Separator Line */}
              <div className="h-px bg-gray-200 my-6" />

              <p className="text-sm text-gray-500 leading-relaxed">
                경매 종료 시간이 점검 시간과 겹치는 물품의 경우, 점검 시간만큼 경매 종료 시간이 자동으로 연장될 예정입니다.<br /> 입찰 참여 시 이 점 유의하시기 바랍니다.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-gray-100 bg-gray-50/30 p-8">
          <div className="flex justify-center">
            <Link
              to="/notice"
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-100 rounded-full text-sm font-bold text-gray-600 hover:text-gray-900 hover:border-gray-200 hover:shadow-md transition-all shadow-sm"
            >
              <BsList className="w-5 h-5" />
              목록보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
