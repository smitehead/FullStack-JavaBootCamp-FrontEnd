import React, { useState } from 'react';
import { BsCheckCircle } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';

const BUYER_REVIEW_TAGS = [
  { id: 'tag_1', content: '응답이 빨라요' },
  { id: 'tag_2', content: '친절하고 매너가 좋아요' },
  { id: 'tag_3', content: '시간 약속을 잘 지켜요' },
  { id: 'tag_4', content: '상품 상태가 설명과 같아요' },
  { id: 'tag_5', content: '집 근처로 와주었어요' },
];

const SELLER_REVIEW_TAGS = [
  { id: 'tag_6', content: '응답이 빨라요' },
  { id: 'tag_7', content: '친절하고 매너가 좋아요' },
  { id: 'tag_8', content: '시간 약속을 잘 지켜요' },
  { id: 'tag_9', content: '쿨거래 감사합니다' },
  { id: 'tag_10', content: '연락이 잘 돼요' },
];

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultNo: number;
  sellerNickname: string;
  productTitle: string;
  productImage: string;
  role?: 'buyer' | 'seller'; // 역할에 따른 분기 (기본값: buyer)
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  resultNo,
  sellerNickname,
  productTitle,
  productImage,
  role = 'buyer',
  onSuccess
}) => {
  const REVIEW_TAGS = role === 'seller' ? SELLER_REVIEW_TAGS : BUYER_REVIEW_TAGS;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tagContent: string) => {
    setSelectedTags(prev =>
      prev.includes(tagContent)
        ? prev.filter(t => t !== tagContent)
        : [...prev, tagContent]
    );
  };

  const handleSubmit = async () => {
    if (selectedTags.length === 0 && !reviewContent.trim()) {
      showToast('태그 또는 후기 내용 중 하나 이상 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reviews', {
        resultNo,
        tags: selectedTags.length > 0 ? selectedTags : null,
        content: reviewContent.trim() || null,
        role,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast('이미 작성된 후기입니다.', 'error');
        onClose();
        return;
      }
      const msg = err.response?.data?.error || err.response?.data?.message || '리뷰 등록에 실패했습니다.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar relative">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-50">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
              <img src={productImage} alt={productTitle} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                <span className="text-indigo-600">{sellerNickname}</span>님과의 거래<br />
                어떤 점이 좋았나요?
              </h3>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">거래하며 느낀 점을 선택해주세요</p>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.content)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedTags.includes(tag.content)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {tag.content}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3 ml-1">상세 후기 남기기</h4>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder={`${role === 'seller' ? '구매자' : '판매자'}에게 따뜻한 후기를 남겨주세요.`}
                className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none font-medium text-gray-900"
              ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
              >
                나중에 하기
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? '등록 중...' : '후기 등록하기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[210] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] max-w-sm w-full p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-transparent rounded-[24px] flex items-center justify-center mx-auto mb-6">
              <BsCheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">후기 등록 완료!</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              소중한 후기가 등록되었습니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
