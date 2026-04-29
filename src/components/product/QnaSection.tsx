import React, { useState, useEffect } from 'react';
import { BsReply } from 'react-icons/bs';
import { ProductQna } from '@/types';
import { Pagination } from '@/components/Pagination';
import { showToast } from '@/components/toastService';
import api from '@/services/api';

interface QnaSectionProps {
  productId: string;
  isFinished: boolean;
  isSeller: boolean;
  currentMemberNo: number | null;
}

const QNA_PAGE_SIZE = 5;

export const QnaSection: React.FC<QnaSectionProps> = ({ productId, isFinished, isSeller, currentMemberNo }) => {
  const [qnaList, setQnaList] = useState<ProductQna[]>([]);
  const [qnaInput, setQnaInput] = useState('');
  const [answerInputs, setAnswerInputs] = useState<Record<number, string>>({});
  const [showAnswerInput, setShowAnswerInput] = useState<Record<number, boolean>>({});
  const [qnaCurrentPage, setQnaCurrentPage] = useState(1);
  const [showQnaDeleteModal, setShowQnaDeleteModal] = useState(false);
  const [showAnswerDeleteModal, setShowAnswerDeleteModal] = useState(false);
  const [targetQnaNo, setTargetQnaNo] = useState<number | null>(null);

  const fetchQnaList = async () => {
    try {
      const res = await api.get(`/products/${productId}/qna`);
      setQnaList(res.data);
    } catch {
      // 조용히 실패
    }
  };

  useEffect(() => {
    if (productId) {
      fetchQnaList();
      setQnaCurrentPage(1);
    }
  }, [productId]);

  const handleQnaSubmit = async () => {
    if (!qnaInput.trim()) return;
    try {
      await api.post(`/products/${productId}/qna`, { content: qnaInput.trim() });
      setQnaInput('');
      fetchQnaList();
    } catch {
      showToast('문의 등록에 실패했습니다.', 'error');
    }
  };

  const handleQnaDelete = (qnaNo: number) => {
    setTargetQnaNo(qnaNo);
    setShowQnaDeleteModal(true);
  };

  const executeQnaDelete = async () => {
    if (targetQnaNo === null) return;
    try {
      await api.delete(`/products/${productId}/qna/${targetQnaNo}`);
      fetchQnaList();
      setShowQnaDeleteModal(false);
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  const handleAnswerSubmit = async (qnaNo: number) => {
    const answer = answerInputs[qnaNo];
    if (!answer?.trim()) return;
    try {
      await api.post(`/products/${productId}/qna/${qnaNo}/answer`, { answer: answer.trim() });
      setAnswerInputs(prev => ({ ...prev, [qnaNo]: '' }));
      setShowAnswerInput(prev => ({ ...prev, [qnaNo]: false }));
      fetchQnaList();
    } catch {
      showToast('답변 등록에 실패했습니다.', 'error');
    }
  };

  const handleAnswerDelete = (qnaNo: number) => {
    setTargetQnaNo(qnaNo);
    setShowAnswerDeleteModal(true);
  };

  const executeAnswerDelete = async () => {
    if (targetQnaNo === null) return;
    try {
      await api.delete(`/products/${productId}/qna/${targetQnaNo}/answer`);
      fetchQnaList();
      setShowAnswerDeleteModal(false);
    } catch {
      showToast('답변 삭제에 실패했습니다.', 'error');
    }
  };

  return (
    <div id="qna" className="scroll-mt-[300px] space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">상품문의 ({qnaList.length})</h3>

      {!isFinished && !isSeller && (
        <div className="flex gap-3">
          <input
            type="text"
            value={qnaInput}
            onChange={e => setQnaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQnaSubmit()}
            placeholder="상품에 대해 궁금한 점을 남겨주세요."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
          />
          <button onClick={handleQnaSubmit} className="bg-gray-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-black transition-colors">등록</button>
        </div>
      )}

      <div className="space-y-6">
        {qnaList.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">아직 등록된 문의가 없습니다.</p>
        )}
        {qnaList.slice((qnaCurrentPage - 1) * QNA_PAGE_SIZE, qnaCurrentPage * QNA_PAGE_SIZE).map(qna => (
          <div key={qna.qnaNo} className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">{qna.memberNickname}</span>
                {currentMemberNo === qna.memberNo && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">작성자</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{new Date(qna.createdAt).toLocaleDateString('ko-KR')}</span>
                {currentMemberNo === qna.memberNo && (
                  <button onClick={() => handleQnaDelete(qna.qnaNo)} className="text-[10px] text-gray-400 hover:text-brand">삭제</button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{qna.content}</p>

            {qna.answer ? (
              <div className="bg-gray-50 p-4 rounded-xl ml-6 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-brand-dark">판매자 답변</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">{qna.answeredAt ? new Date(qna.answeredAt).toLocaleDateString('ko-KR') : ''}</span>
                    {isSeller && (
                      <button onClick={() => handleAnswerDelete(qna.qnaNo)} className="text-[10px] text-gray-400 hover:text-brand">삭제</button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{qna.answer}</p>
              </div>
            ) : (
              isSeller && !isFinished && (
                showAnswerInput[qna.qnaNo] ? (
                  <div className="ml-6 flex gap-2 mt-2">
                    <input
                      type="text"
                      value={answerInputs[qna.qnaNo] || ''}
                      onChange={e => setAnswerInputs(prev => ({ ...prev, [qna.qnaNo]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(qna.qnaNo)}
                      placeholder="답변을 입력하세요."
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
                    />
                    <button onClick={() => handleAnswerSubmit(qna.qnaNo)} className="bg-brand text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-brand-dark">등록</button>
                    <button onClick={() => setShowAnswerInput(prev => ({ ...prev, [qna.qnaNo]: false }))} className="text-sm text-gray-400 hover:text-gray-600 px-2">취소</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAnswerInput(prev => ({ ...prev, [qna.qnaNo]: true }))}
                    className="mt-2 ml-6 flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-brand"
                  >
                    <BsReply className="w-3 h-3" /> 답글 달기
                  </button>
                )
              )
            )}
          </div>
        ))}
      </div>

      <Pagination
        currentPage={qnaCurrentPage}
        totalPages={Math.ceil(qnaList.length / QNA_PAGE_SIZE)}
        onPageChange={setQnaCurrentPage}
      />

      {/* 문의 삭제 확인 모달 */}
      {showQnaDeleteModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQnaDeleteModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">문의를 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">삭제된 문의는 복구할 수 없습니다.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowQnaDeleteModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">취소</button>
                <button onClick={executeQnaDelete} className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm">삭제하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 답변 삭제 확인 모달 */}
      {showAnswerDeleteModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnswerDeleteModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">답변을 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">삭제된 답변은 복구할 수 없습니다.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowAnswerDeleteModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm">취소</button>
                <button onClick={executeAnswerDelete} className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm">삭제하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
