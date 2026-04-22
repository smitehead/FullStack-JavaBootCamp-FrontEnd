import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BsSend, BsLink } from 'react-icons/bs';

import { BsInfoCircle, BsBell, BsPlusLg, BsX } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { showToast } from '@/components/toastService';

interface AdminNotification {
  notiNo: number;
  type: string;
  content: string;
  linkUrl: string | null;
  isRead: number;
  createdAt: string;
}

type TypeFilter = 'all' | '시스템' | '활동' | '입찰';

const ITEMS_PER_PAGE = 15;

export const NotificationManagement: React.FC = () => {
  const [recentNotifications, setRecentNotifications] = useState<AdminNotification[]>([]);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState('시스템');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchRecentNotifications = async (filter: TypeFilter = typeFilter) => {
    setIsLoading(true);
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const res = await api.get('/admin/notifications/recent', { params });
      setRecentNotifications(res.data);
    } catch (err) {
      console.error('알림 내역 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentNotifications(typeFilter);
    setVisibleCount(ITEMS_PER_PAGE);
  }, [typeFilter]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < recentNotifications.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, recentNotifications.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !link.trim()) {
      showToast('메시지와 링크를 모두 입력해주세요.', 'error');
      return;
    }

    setIsSending(true);
    try {
      await api.post('/admin/notifications/broadcast', {
        type,
        content: message,
        linkUrl: link,
      });
      setMessage('');
      setLink('');
      setType('시스템');
      setShowForm(false);
      showToast('알림이 성공적으로 전송되었습니다.', 'success');
      await fetchRecentNotifications(typeFilter);
    } catch (err) {
      console.error('알림 발송 실패:', err);
      showToast('알림 발송에 실패했습니다.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const typeOptions = [
    { value: '시스템', label: '시스템' },
    { value: '활동', label: '활동' },
    { value: '입찰', label: '입찰' },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">알림 관리</h1>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">사용자에게 새로운 알림을 발송하고 내역을 확인합니다.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF5A5A] text-white font-bold rounded-none hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20 active:scale-95 text-xs"
        >
          {showForm ? <BsX className="w-4 h-4" /> : <BsPlusLg className="w-4 h-4" />}
          {showForm ? '닫기' : '새 알림 등록'}
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-none p-5 shadow-sm border border-gray-100"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BsSend className="w-4 h-4 text-[#FF5A5A]" /> 새 알림 발송
            </h2>

            <form onSubmit={handleSend} className="flex flex-col lg:flex-row items-end gap-6">
              <div className="w-full lg:w-48 shrink-0">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-widest">알림 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`py-2 text-[10px] font-bold rounded-none transition-all ${type === t.value
                        ? 'bg-[#FF5A5A] text-white shadow-lg shadow-red-100'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-widest">알림 메시지</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium text-sm"
                  placeholder="사용자에게 보낼 메시지를 입력하세요."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="w-full lg:w-72 shrink-0">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-widest">이동 링크 (URL)</label>
                <div className="relative">
                  <BsLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium text-sm"
                    placeholder="예: /products/p_123"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full lg:w-40 py-3 bg-[#FF5A5A] text-white font-bold rounded-none hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isSending ? '발송 중...' : '발송하기'}
              </button>
            </form>
            <p className="text-[10px] text-gray-400 mt-4 font-medium flex items-center gap-1">
              <BsInfoCircle className="w-3 h-3" /> 내부 경로(/products/...) 또는 외부 URL을 입력하세요.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification History */}
      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 shrink-0">
            <BsBell className="w-4 h-4 text-gray-400" /> 발송 내역
          </h2>
          <div className="flex items-center gap-1.5">
            {(['all', '시스템', '활동', '입찰'] as TypeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 text-[11px] font-bold rounded-none transition-all ${
                  typeFilter === f
                    ? 'bg-[#FF5A5A] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '전체' : f}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-gray-400 shrink-0">{recentNotifications.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {recentNotifications.slice(0, visibleCount).map((noti) => (
            <div key={noti.notiNo} className="px-5 py-2.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center min-w-0">
                <span className="w-[56px] shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400">{noti.type}</span>
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="flex-1 min-w-0 text-xs font-bold text-gray-900 truncate" title={noti.content}>{noti.content}</span>
                {noti.linkUrl && (
                  <>
                    <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                    <span className="w-[160px] shrink-0 text-[11px] text-gray-400 truncate inline-flex items-center gap-1" title={noti.linkUrl}>
                      <BsLink className="w-2.5 h-2.5 shrink-0" />{noti.linkUrl}
                    </span>
                  </>
                )}
                <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                <span className="w-[120px] shrink-0 text-[11px] text-gray-400">{new Date(noti.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
          {recentNotifications.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">발송된 알림이 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < recentNotifications.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
};
