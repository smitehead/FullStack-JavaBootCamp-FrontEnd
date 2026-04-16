import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BsTrash3, BsSend } from 'react-icons/bs';

import { BsChatLeft, BsCheckCircle, BsPerson } from 'react-icons/bs';
import { BiSearch } from 'react-icons/bi';
import { Inquiry } from '@/types';
import { showToast } from '@/components/toastService';
import { ImageLightbox } from '@/components/ImageLightbox';
import api from '@/services/api';

export const InquiryManagement: React.FC = () => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [activeTab, setActiveTab] = useState<'전체' | '답변 대기중' | '답변 완료'>('전체');
  const [selectedType, setSelectedType] = useState<string>('전체');
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filteredInquiries = inquiries.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === '전체' || (activeTab === '답변 대기중' && i.status === 0) || (activeTab === '답변 완료' && i.status === 1);
    const matchesType = selectedType === '전체' || i.type === selectedType;
    return matchesSearch && matchesTab && matchesType;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setAnswer(inquiry.answer || '');
  };

  const statusParam = activeTab === '전체' ? null : activeTab === '답변 대기중' ? 0 : 1;
  const fetchInquiries = async () => {
    const res = await api.get('/admin/inquiries', {
      params: { status: statusParam, page: 1, size: 50 }
    });
    setInquiries(res.data.content || []);
  };

  useEffect(() => { fetchInquiries(); }, [activeTab]);

  const handleSaveAnswer = async () => {
    if (!selectedInquiry || !answer.trim()) return;
    try {
      await api.patch(`/admin/inquiries/${selectedInquiry.inquiryNo}/answer`, { answer });
      showToast('답변이 등록되었습니다.', 'success');
      fetchInquiries();
      setSelectedInquiry(null);
      setAnswer('');
    } catch (e) {
      showToast('답변 등록에 실패했습니다.', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setInquiryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!inquiryToDelete) return;
    await api.delete(`/admin/inquiries/${inquiryToDelete}`);
    fetchInquiries();
    setIsDeleteModalOpen(false);
  };

  const getUserNickname = (inquiry: Inquiry) => {
    return inquiry.memberNickname || '알 수 없는 사용자';
  };

  return (
    <div className="flex h-[calc(100vh-140px)] space-x-6">
      {/* Inquiry List */}
      <div className="w-1/2 flex flex-col space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">문의사항 관리</h1>
            <p className="text-gray-500 mt-1 text-[11px] font-medium">사용자들의 문의에 답변을 작성합니다.</p>
          </div>
        </header>

        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-6 border-b border-gray-200 w-full px-1">
            {(['전체', '답변 대기중', '답변 완료'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedType('전체');
                }}
                className={`pb-3 text-xs font-bold transition-all relative ${activeTab === tab
                  ? 'text-[#FF5A5A]'
                  : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A5A]" />
                )}
              </button>
            ))}
          </div>

          {(activeTab === '답변 대기중' || activeTab === '답변 완료') && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              {['전체', '버그 신고', '계정 문의', '기타'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedType(cat);
                  }}
                  className={`px-3 py-1.5 rounded-none text-[10px] font-bold whitespace-nowrap transition-all border ${selectedType === cat
                    ? 'bg-[#FF5A5A] text-white border-[#FF5A5A] shadow-sm'
                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <div className="relative flex items-center h-10 w-64">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <BiSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="문의 제목 또는 내용 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredInquiries.map((inquiry) => (
            <button
              key={inquiry.inquiryNo}
              onClick={() => handleSelectInquiry(inquiry)}
              className={`w-full text-left p-4 rounded-none border-2 transition-all ${selectedInquiry?.inquiryNo === inquiry.inquiryNo
                ? 'bg-white border-[#FF5A5A] shadow-lg shadow-red-900/5'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold ${inquiry.status === 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {inquiry.status === 1 ? '답변 완료' : '답변 대기중'}
                </span>
                <span className="text-[10px] font-medium text-gray-400">{inquiry.inquiryNo}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{inquiry.title}</h3>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <Link
                  to={`/admin/users?nickname=${getUserNickname(inquiry)}`}
                  className="font-bold text-gray-500 hover:text-[#FF5A5A] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  작성자: {getUserNickname(inquiry)}
                </Link>
                <span className="text-gray-300">|</span>
                <span className="font-bold text-gray-500">{inquiry.type}</span>
                <span className="text-gray-300">|</span>
                <span className="text-[10px] font-medium text-gray-400">{formatDate(inquiry.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry Detail & Answer */}
      <div className="w-1/2 bg-white rounded-none shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedInquiry ? (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">문의 상세 내용</h2>
              <button
                onClick={() => handleDelete(selectedInquiry.inquiryNo)}
                className="p-2 hover:bg-red-100 text-red-600 rounded-none transition-colors"
              >
                <BsTrash3 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              <div className="p-5 bg-gray-50 rounded-none border border-gray-100">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-white rounded-none flex items-center justify-center shadow-sm">
                    <BsPerson className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <Link
                      to={`/admin/users?nickname=${getUserNickname(selectedInquiry)}`}
                      className="text-sm font-bold text-gray-900 hover:text-[#FF5A5A] hover:underline transition-colors block text-left"
                    >
                      작성자: {getUserNickname(selectedInquiry)}
                    </Link>
                    <p className="text-[10px] font-medium text-gray-500">{formatDate(selectedInquiry.createdAt)}</p>
                  </div>
                </div>
                <h4 className="text-base font-bold text-gray-900 mb-1">{selectedInquiry.title}</h4>
                <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{selectedInquiry.content}</p>
                {selectedInquiry.imageUrls && selectedInquiry.imageUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedInquiry.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`첨부 이미지 ${idx + 1}`}
                        className="h-24 w-24 object-cover rounded-none border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                        onClick={() => { setLightboxUrls(selectedInquiry.imageUrls!); setLightboxIndex(idx); }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {selectedInquiry.status === 1 && (
                <div className="p-5 bg-[#FF5A5A]/5 rounded-none border border-[#FF5A5A]/10">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-[#FF5A5A] rounded-none flex items-center justify-center shadow-lg shadow-red-900/10">
                      <BsCheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        관리자 답변 {selectedInquiry.adminNickname && `(${selectedInquiry.adminNickname})`}
                      </p>
                      <p className="text-[10px] font-medium text-gray-500">{formatDate(selectedInquiry.answeredAt || '')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{selectedInquiry.answer}</p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-3">답변 작성</h3>
              <textarea
                rows={4}
                placeholder="답변 내용을 입력하세요"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium resize-none mb-4 text-sm"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button
                onClick={handleSaveAnswer}
                disabled={!answer.trim()}
                className="w-full py-3 rounded-none font-bold text-white bg-[#FF5A5A] hover:bg-[#E04848] transition-all flex items-center justify-center shadow-lg shadow-red-500/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-sm"
              >
                <BsSend className="w-4 h-4 mr-2" /> 확인
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-none flex items-center justify-center mb-4">
              <BsChatLeft className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">문의를 선택해주세요</h3>
            <p className="text-gray-400 text-sm font-medium">왼쪽 목록에서 답변할 문의사항을 선택하세요.</p>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {lightboxUrls.length > 0 && (
        <ImageLightbox
          urls={lightboxUrls}
          index={lightboxIndex}
          onClose={() => setLightboxUrls([])}
          onNav={setLightboxIndex}
        />
      )}

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
              삭제된 문의사항은 복구할 수 없습니다.<br />신중하게 결정해주세요.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-none font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-none font-bold text-white bg-[#FF5A5A] hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20 text-sm"
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
