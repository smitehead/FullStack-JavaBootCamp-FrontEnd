import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { BsExclamationCircle, BsInfoCircle, BsCamera, BsX } from 'react-icons/bs';
import { InquiryType, BugType } from '@/types';
import { showToast } from '@/components/toastService';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';


export const InquiryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user, isInitialized } = useAppContext();
  
  React.useEffect(() => {
    if (isInitialized && !user) {
      showToast('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.', 'info');
      navigate('/login');
    }
  }, [isInitialized, user, navigate]);
  const [type, setType] = useState<InquiryType | ''>('');
  const [bugType, setBugType] = useState<BugType | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const categories: InquiryType[] = ['버그 신고', '포인트 문의', '계정 문의', '기타'];
  const bugTypes: BugType[] = ['기능 작동 오류', '화면/UI 오류', '데이터/정보 오류', '로그인/계정 문제', '속도/접속 저하', '기타'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const combined = [...imageFiles, ...newFiles].slice(0, 5);
    setImageFiles(combined);
    setImagePreviews(combined.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !title || !content) {
      showToast('문의 유형, 제목, 내용을 모두 입력해주세요.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = { type, bugType: bugType || null, title, content };
      const formData = new FormData();
      formData.append('data', new Blob([JSON.stringify(body)], { type: 'application/json' }));
      imageFiles.forEach(file => formData.append('images', file));

      await api.post('/inquiries', formData);
      showToast('문의가 접수되었습니다. 최대한 빨리 답변해 드리겠습니다.', 'success');
      navigate('/inquiry');
    } catch (e: any) {
      showToast(e.response?.data?.message || '문의 접수 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
      >
        <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        뒤로가기
      </button>

      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">새 문의 작성</h1>
        <p className="text-gray-500 font-medium">불편하신 사항을 상세히 남겨주시면 신속히 확인하겠습니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* type Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">문의 유형</label>
          <div className="flex flex-wrap gap-2.5">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setType(cat);
                  if (cat !== '버그 신고') setBugType('');
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${type === cat
                  ? 'bg-brand border-brand text-white shadow-md shadow-brand/10 active:scale-95'
                  : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bug Type Selection (Conditional) */}
        {type === '버그 신고' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">버그 유형</label>
            <div className="flex flex-wrap gap-2.5">
              {bugTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBugType(type)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${bugType === type
                    ? 'bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200 active:scale-95'
                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title and Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">제목</label>
            <input
              type="text"
              placeholder="문의 제목을 입력해주세요"
              className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">내용</label>
            <textarea
              placeholder="문의 내용을 상세히 입력해주세요. (예: 발생 일시, 발생 경로, 오류 메시지 등)"
              className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none font-medium min-h-[200px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* Image Attachment */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-900 uppercase tracking-wider">사진 첨부 ({imageFiles.length}/5)</label>
          <div className="flex flex-wrap gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                <img src={preview} alt={`upload-${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}

            {imageFiles.length < 5 && (
              <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-gray-500 transition-all text-gray-400 hover:text-gray-900 group">
                <BsCamera className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-wider">사진 추가</span>
                <input
                  type="file"
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              </label>
            )}
          </div>

          <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
            <BsInfoCircle className="w-3.5 h-3.5" />
            JPG, PNG 형식의 이미지만 업로드 가능합니다.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            type="submit"
            className="w-full h-[56px] rounded-2xl font-bold text-base shadow-lg shadow-brand/10 transition-all flex items-center justify-center gap-3 bg-brand text-white hover:bg-brand-dark active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="spinner-border w-5 h-5 !border-white/30 !border-t-white" />
                접수 중...
              </>
            ) : (
              '문의 접수하기'
            )}
          </button>
        </div>
      </form>

      {/* Guide Box */}
      <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-gray-900">
          <BsExclamationCircle className="w-5 h-5" />
          <span className="font-bold">문의 전 확인해주세요</span>
        </div>
        <ul className="space-y-3 text-sm text-gray-500 font-medium">

          <li className="flex gap-2">
            <span className="text-brand">•</span>
            버그 신고 시 오류가 발생한 화면의 스크린샷을 첨부해 주시면 원인 파악에 큰 도움이 됩니다.
          </li>
          <li className="flex gap-2">
            <span className="text-brand">•</span>
            문의 답변은 영업일 기준 최대 48시간 이내에 완료됩니다.
          </li>
        </ul>
      </div>
    </div>
  );
};
