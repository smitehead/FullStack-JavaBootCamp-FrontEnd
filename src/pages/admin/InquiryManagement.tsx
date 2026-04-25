import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BsTrash3, BsSend, BsCheckCircle, BsPerson, BsChatLeftDots, BsSearch, BsFunnel } from 'react-icons/bs';
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
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(true);
    try {
      const res = await api.get('/admin/inquiries', {
        params: { status: statusParam, page: 1, size: 50 }
      });
      setInquiries(res.data.content || []);
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] space-x-4">
      {/* Inquiry List */}
      <div className="w-1/2 flex flex-col space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">문의사항 관리</h1>
            <p className="text-gray-500 mt-0.5 text-xs font-medium">사용자들의 문의에 답변을 작성합니다.</p>
          </div>
        </header>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center h-10 flex-1 min-w-[160px]">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <BsSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="문의 제목 또는 내용 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-none px-4 py-2.5 shadow-sm">
            <BsFunnel className="w-3.5 h-3.5 text-gray-400" />
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={activeTab}
              onChange={(e) => { setActiveTab(e.target.value as typeof activeTab); setSelectedType('전체'); }}
            >
              <option value="전체">전체 상태</option>
              <option value="답변 대기중">답변 대기중</option>
              <option value="답변 완료">답변 완료</option>
            </select>
            <div className="w-px h-3 bg-gray-200 mx-1" />
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="전체">전체 유형</option>
              <option value="버그 신고">버그 신고</option>
              <option value="계정 문의">계정 문의</option>
              <option value="포인트 문의">포인트 문의</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredInquiries.map((inquiry) => (
            <div
              key={inquiry.inquiryNo}
              onClick={() => handleSelectInquiry(inquiry)}
              className={`cursor-pointer w-full text-left p-3 rounded-none border-2 transition-all ${selectedInquiry?.inquiryNo === inquiry.inquiryNo
                ? 'bg-white border-[#FF5A5A] shadow-lg shadow-red-900/5'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                }`}
            >
              <div className="mb-2">
                <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold ${inquiry.status === 1 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                  {inquiry.status === 1 ? '답변 완료' : '답변 대기중'}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1 truncate">{inquiry.title}</p>
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
                {inquiry.type === '버그 신고' && inquiry.bugType && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">{inquiry.bugType}</span>
                  </>
                )}
                <span className="text-gray-300">|</span>
                <span className="text-[10px] font-medium text-gray-400">{formatDate(inquiry.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inquiry Detail & Answer */}
      <div className="w-1/2 bg-white rounded-none shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {selectedInquiry ? (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">문의 상세 내용</h2>
              <button
                onClick={() => handleDelete(selectedInquiry.inquiryNo)}
                className="p-2 hover:bg-red-100 text-red-600 rounded-none transition-colors"
              >
                <BsTrash3 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-none border border-gray-100">
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{selectedInquiry.type}</span>
                  {selectedInquiry.type === '버그 신고' && selectedInquiry.bugType && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">{selectedInquiry.bugType}</span>
                  )}
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
                <div className="p-4 bg-[#FF5A5A]/5 rounded-none border border-[#FF5A5A]/10">
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

            <div className="mt-auto pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-2">답변 작성</h3>
              <textarea
                rows={4}
                placeholder="답변 내용을 입력하세요"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium resize-none mb-3 text-sm"
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-base font-bold text-gray-900 mb-1">문의를 선택해주세요</h3>
            <p className="text-gray-400 text-xs font-medium">왼쪽 목록에서 답변할 문의사항을 선택하세요.</p>
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
