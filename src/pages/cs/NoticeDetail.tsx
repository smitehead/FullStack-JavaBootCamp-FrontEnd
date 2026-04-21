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
  const [prevNotice, setPrevNotice] = useState<NeighborNotice | null>(null);
  const [nextNotice, setNextNotice] = useState<NeighborNotice | null>(null);
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
        
        const allNotices = listRes.data || [];
        const currentIndex = allNotices.findIndex((n: any) => n.id === Number(id));
        
        if (currentIndex !== -1) {
          // 리스트가 보통 최신순(내림차순)으로 온다고 가정: currentIndex - 1이 다음글(더 최신), + 1이 이전글(더 과거)
          // 하지만 UI 상 '이전글 > 다음글' 순서이므로, 논리적으로 이전(과거) -> 이후(미래) 순서로 배치
          // Backend id가 큰 것이 최신이라면:
          const prev = allNotices[currentIndex + 1]; // 이전글 (더 과거)
          const next = allNotices[currentIndex - 1]; // 다음글 (더 최신)
          
          setPrevNotice(prev || null);
          setNextNotice(next || null);
        }
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
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
        <div className="border-t border-gray-100">
          <div className="p-8 flex items-center justify-center bg-gray-50/30">
            {prevNotice && nextNotice ? (
              <div className="flex items-center gap-6 w-full max-w-2xl mx-auto text-sm">
                <Link
                  to={`/notice/${prevNotice.id}`}
                  className="flex-1 flex flex-col items-start group min-w-0"
                >
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">이전글</span>
                  <span className="text-gray-600 font-bold group-hover:text-brand transition-colors truncate w-full">
                    {prevNotice.title}
                  </span>
                </Link>

                <div className="shrink-0 w-px h-8 bg-gray-200 mx-2 hidden sm:block" />
                <div className="shrink-0 text-gray-300 font-light text-xl mx-2">〉</div>

                <Link
                  to={`/notice/${nextNotice.id}`}
                  className="flex-1 flex flex-col items-end group min-w-0 text-right"
                >
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">다음글</span>
                  <span className="text-gray-600 font-bold group-hover:text-brand transition-colors truncate w-full">
                    {nextNotice.title}
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                to="/notice"
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <BsList className="w-4 h-4" />
                목록으로
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
