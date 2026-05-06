import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BsCheckCircle, BsChevronLeft } from 'react-icons/bs';
import { showToast } from '@/components/toastService';
import api from '@/services/api';

const NEGATIVE_TAG_NAMES = new Set([
  '응답이 느렸어요', '불친절했어요', '약속을 지키지 않았어요',
  '상품 상태가 설명과 달랐어요', '결제가 늦었어요', '연락이 되지 않았어요',
]);

interface TagDef {
  tagId: number;
  tagName: string;
  applicableRole: string;
}

export const ReviewCreate: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const resultNo = queryParams.get('resultNo') || orderId;

  const [role, setRole] = useState<'BUYER' | 'SELLER' | null>(null);
  const [availableTags, setAvailableTags] = useState<TagDef[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'positive' | 'negative' | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 이미 작성된 후기인지 확인 + 역할 조회
  useEffect(() => {
    if (!resultNo) return;

    api.get(`/reviews/exists/${resultNo}`)
      .then(res => {
        if (res.data?.exists) {
          showToast('이미 작성된 후기입니다.', 'error');
          navigate(-1);
        }
      })
      .catch(() => {});

    api.get(`/reviews/role`, { params: { resultNo } })
      .then(res => setRole(res.data?.role ?? null))
      .catch(() => {
        showToast('역할 정보를 불러오는 데 실패했습니다.', 'error');
        navigate(-1);
      });
  }, [resultNo, navigate]);

  // 역할이 확정되면 해당 역할의 태그 목록 조회
  useEffect(() => {
    if (!role) return;
    api.get(`/reviews/tags`, { params: { role } })
      .then(res => setAvailableTags(res.data ?? []))
      .catch(() => showToast('태그 목록을 불러오는 데 실패했습니다.', 'error'));
  }, [role]);

  const toggleTag = (tagId: number, isNegative: boolean) => {
    const group = isNegative ? 'negative' : 'positive';
    if (selectedGroup !== null && selectedGroup !== group) return;
    setSelectedTagIds(prev => {
      const next = prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId];
      setSelectedGroup(next.length === 0 ? null : group);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedTagIds.length === 0 && !content.trim()) {
      showToast('태그 또는 후기 내용 중 하나 이상 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        resultNo: Number(resultNo),
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : null,
        content: content.trim() || null,
      });
      setShowSuccess(true);
      setTimeout(() => navigate('/mypage'), 2000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast('이미 작성된 후기입니다.', 'error');
        navigate(-1);
        return;
      }
      const msg = err.response?.data?.error || err.response?.data?.message || '리뷰 등록에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = role === 'BUYER' ? '구매자' : role === 'SELLER' ? '판매자' : '';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <BsChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
            뒤로가기
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">거래 후기 작성</h2>
            {roleLabel && (
              <p className="text-sm text-gray-400 font-medium mt-1">{roleLabel}로서 남기는 후기입니다.</p>
            )}
          </div>
        </div>

        <section className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-10 space-y-10">
          {/* 태그 */}
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
              거래하며 느낀 점을 태그로 선택해주세요. (중복 선택 가능)
            </p>
            {availableTags.length === 0 && role !== null ? (
              <p className="text-xs text-gray-400">태그를 불러오는 중...</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-indigo-400 mb-3">좋았어요</p>
                  <div className="flex flex-wrap gap-2.5">
                    {availableTags.filter(t => !NEGATIVE_TAG_NAMES.has(t.tagName)).map(tag => {
                      const disabled = selectedGroup === 'negative';
                      return (
                        <button
                          key={tag.tagId}
                          onClick={() => toggleTag(tag.tagId, false)}
                          disabled={disabled}
                          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                            selectedTagIds.includes(tag.tagId)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                              : disabled
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {tag.tagName}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand mb-3">아쉬웠어요</p>
                  <div className="flex flex-wrap gap-2.5">
                    {availableTags.filter(t => NEGATIVE_TAG_NAMES.has(t.tagName)).map(tag => {
                      const disabled = selectedGroup === 'positive';
                      return (
                        <button
                          key={tag.tagId}
                          onClick={() => toggleTag(tag.tagId, true)}
                          disabled={disabled}
                          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                            selectedTagIds.includes(tag.tagId)
                              ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20'
                              : disabled
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {tag.tagName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 텍스트 후기 */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">직접 후기 남기기</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="따뜻한 후기를 남겨주세요."
              className="w-full h-40 p-6 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || role === null}
            className="w-full h-[56px] flex items-center justify-center bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? '등록 중...' : '후기 등록하기'}
          </button>
        </section>
      </div>

      {/* 성공 모달 */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BsCheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">후기 등록 완료!</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              소중한 후기가 등록되었습니다.<br />
              마이페이지로 이동합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
