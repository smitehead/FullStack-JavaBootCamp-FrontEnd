import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../../context/AppContext';
import { showToast } from '@/components/toastService';

const BANKS = [
  { name: 'KB국민은행' },
  { name: '신한은행' },
  { name: '우리은행' },
  { name: '하나은행' },
  { name: 'NH농협은행' },
  { name: 'IBK기업은행' },
  { name: '카카오뱅크' },
  { name: '토스뱅크' },
  { name: '케이뱅크' },
  { name: 'SC제일은행' },
  { name: '씨티은행' },
  { name: '수협은행' },
  { name: '우체국' },
  { name: '새마을금고' },
  { name: '신협' },
  { name: '저축은행' },
];

export const AccountRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { registerAccount } = useAppContext();
  
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBank) {
      showToast('은행을 선택해주세요.', 'error');
      return;
    }
    if (accountNumber.length < 10) {
      showToast('올바른 계좌번호를 입력해주세요.', 'error');
      return;
    }
    if (accountHolder.length < 2) {
      showToast('예금주명을 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await registerAccount({
        bankName: selectedBank,
        accountNumber,
        accountHolder
      });
      setIsSubmitting(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/settings?tab=account');
      }, 2000);
    } catch (error) {
      setIsSubmitting(false);
      // AppContext's registerAccount will handle the error toast
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-2xl shadow-2xl text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">계좌 등록 완료</h2>
          <p className="text-gray-500 font-medium">출금 계좌가 성공적으로 등록되었습니다.</p>
          <p className="text-gray-400 text-sm mt-4">잠시 후 설정 페이지로 이동합니다...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pt-8 pb-12 px-4">
      <div className="max-w-md mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
        >
          <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">계좌 등록</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">출금을 위한 본인 명의의 계좌를 등록해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {!selectedBank ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  은행 선택
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BANKS.map((bank) => (
                    <button
                      key={bank.name}
                      type="button"
                      onClick={() => setSelectedBank(bank.name)}
                      className="aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-all hover:bg-gray-100 active:scale-95"
                    >
                      <div className="w-8 h-8 rounded-full mb-2 bg-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-black">
                        {bank.name.substring(0, 1)}
                      </div>
                      <span className="text-[10px] font-bold text-center leading-tight text-gray-500">
                        {bank.name}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Selected Bank Display */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[11px] text-gray-400 font-black">
                      {selectedBank.substring(0, 1)}
                    </div>
                    <p className="text-lg font-black text-gray-900">{selectedBank}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedBank(null)}
                    className="px-3 py-1.5 text-[10px] font-black text-gray-400 border border-gray-200 rounded-lg hover:bg-white transition-all hover:text-gray-900"
                  >
                    변경
                  </button>
                </div>

                {/* Account Info */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      계좌번호
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="계좌번호를 입력하세요 (- 제외)"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all focus:bg-white"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      예금주
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="예금주명을 입력하세요"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        등록 중...
                      </>
                    ) : '계좌 등록하기'}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
