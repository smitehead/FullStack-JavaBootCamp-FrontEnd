import React, { useState, useEffect, useCallback, useRef } from "react";
import { BsPen, BsTrash3, BsMegaphone } from 'react-icons/bs';

import { BsPlusLg, BsSearch } from 'react-icons/bs';
import { NoticeCategory } from "@/types";
import api from "@/services/api";
import { showToast } from "@/components/toastService";

interface NoticeItem {
  id: number;
  category: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  isDeleted: number;
  maintenanceStart?: string;
  maintenanceEnd?: string;
}

const ITEMS_PER_PAGE = 15;

export const NoticeManagement: React.FC = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("업데이트");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/notices/all");
      setNotices(res.data || []);
    } catch {
      showToast("공지사항 목록을 불러오지 못했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const filteredNotices = notices.filter(
    (n) =>
      !n.isDeleted &&
      (n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredNotices.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredNotices.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  const handleOpenModal = (notice?: NoticeItem) => {
    if (notice) {
      setEditingNotice(notice);
      setTitle(notice.title);
      setCategory(notice.category as NoticeCategory);
      setContent(notice.content);
      setIsImportant(notice.isImportant);
      setMaintenanceStart(notice.maintenanceStart?.slice(0, 16) || "");
      setMaintenanceEnd(notice.maintenanceEnd?.slice(0, 16) || "");
    } else {
      setEditingNotice(null);
      setTitle("");
      setCategory("업데이트");
      setContent("");
      setIsImportant(false);
      setMaintenanceStart("");
      setMaintenanceEnd("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showToast("제목과 내용을 입력해주세요.", "error");
      return;
    }
    try {
      const body: any = { category, title, content, isImportant };
      if (category === "점검") {
        body.maintenanceStart = maintenanceStart || null;
        body.maintenanceEnd = maintenanceEnd || null;
      }
      if (editingNotice) {
        await api.put(`/notices/${editingNotice.id}`, body);
        showToast("공지사항이 수정되었습니다.", "success");
      } else {
        await api.post("/notices", body);
        showToast("공지사항이 등록되었습니다.", "success");
      }
      setIsModalOpen(false);
      fetchNotices();
    } catch {
      showToast("저장에 실패했습니다.", "error");
    }
  };

  const handleDelete = (id: number) => {
    setNoticeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (noticeToDelete == null) return;
    try {
      await api.delete(`/notices/${noticeToDelete}`);
      showToast("공지사항이 삭제되었습니다.", "success");
      setIsDeleteModalOpen(false);
      setNoticeToDelete(null);
      fetchNotices();
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            공지사항 관리
          </h1>
          <p className="text-gray-500 mt-0.5 text-xs font-medium">
            서비스 공지사항을 등록하고 관리합니다.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64 flex items-center h-10">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <BsSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="제목 또는 내용 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#FF5A5A] text-white px-5 py-2 rounded-none font-bold hover:bg-[#E04848] transition-all flex items-center justify-center shadow-lg shadow-red-900/10 active:scale-95 shrink-0 text-xs"
          >
            <BsPlusLg className="w-4 h-4 mr-2" /> 새 공지사항
          </button>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsMegaphone className="w-4 h-4 text-gray-400" /> 공지 목록
          </h2>
          <span className="text-xs font-bold text-gray-400">{filteredNotices.length}건</span>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredNotices.slice(0, visibleCount).map((notice) => (
            <div
              key={notice.id}
              className={`px-5 py-3 hover:bg-gray-50 transition-colors group ${notice.isDeleted ? 'opacity-40' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-none text-[10px] font-bold ${notice.category === "점검"
                        ? "bg-orange-100 text-orange-700"
                        : notice.category === "업데이트"
                          ? "bg-blue-100 text-blue-700"
                          : notice.category === "이벤트"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {notice.category}
                    </span>
                    {notice.isImportant && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-none">
                        중요
                      </span>
                    )}
                    {notice.isDeleted === 1 && (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-none">
                        삭제됨
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-gray-400">
                      {notice.createdAt?.split("T")[0]}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {notice.title}
                  </h3>
                </div>

                {!notice.isDeleted && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleOpenModal(notice)}
                      className="p-2 hover:bg-gray-100 text-gray-600 rounded-none transition-colors"
                    >
                      <BsPen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-none transition-colors"
                    >
                      <BsTrash3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredNotices.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">공지사항이 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredNotices.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              {editingNotice ? "공지사항 수정" : "새 공지사항 등록"}
            </h2>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold appearance-none text-sm"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as NoticeCategory)
                    }
                  >
                    <option value="업데이트">업데이트</option>
                    <option value="이벤트">이벤트</option>
                    <option value="점검">점검</option>
                    <option value="정책">정책</option>
                  </select>
                </div>
                <div className="flex items-end pb-3">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-none border-gray-300 text-brand focus:ring-brand cursor-pointer"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                    />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-[#FF5A5A] transition-colors">
                      중요 공지로 설정
                    </span>
                  </label>
                </div>
              </div>

              {category === "점검" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-100 rounded-none">
                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-2">점검 시작 일시</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium"
                      value={maintenanceStart}
                      onChange={(e) => setMaintenanceStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-2">점검 종료 일시</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white border border-orange-200 rounded-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium"
                      value={maintenanceEnd}
                      onChange={(e) => setMaintenanceEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  placeholder="공지사항 제목을 입력하세요"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  상세 내용
                </label>
                <textarea
                  rows={6}
                  placeholder="공지사항 상세 내용을 입력하세요"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium resize-none text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-none font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-none font-bold text-white bg-[#FF5A5A] hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20 text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-none flex items-center justify-center mb-4 mx-auto">
              <BsTrash3 className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center tracking-tight">
              정말 삭제하시겠습니까?
            </h2>
            <p className="text-gray-500 font-medium text-center mb-8 text-sm">
              삭제된 공지사항은 목록에서 숨겨집니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-brand hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
