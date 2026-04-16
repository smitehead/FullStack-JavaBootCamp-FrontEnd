import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { BsCheckCircle } from 'react-icons/bs';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';
import { showToast } from '@/components/toastService';

export const CardRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [isCheckLoading, setIsCheckLoading] = useState(true);

  // 이미 카드가 등록되어 있는지 확인
  React.useEffect(() => {
    const checkCard = async () => {
      try {
        const res = await api.get('/points/billing-key');
        if (res.data.registered) {
          showToast('이미 카드가 등록되어 있습니다. 삭제 후 다시 눌러주세요.', 'warning');
          navigate('/points/charge', { replace: true });
        }
      } catch (e) {
        // 미등록 상태면 그대로 진행
      } finally {
        setIsCheckLoading(false);
      }
    };
    checkCard();
  }, [navigate]);


  // 카드번호 4칸 분리 입력
  const [cardNumber1, setCardNumber1] = useState('');
  const [cardNumber2, setCardNumber2] = useState('');
  const [cardNumber3, setCardNumber3] = useState('');
  const [cardNumber4, setCardNumber4] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [pwd2digit, setPwd2digit] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // 자동 포커스 이동용 refs
  const card2Ref = useRef<HTMLInputElement>(null);
  const card3Ref = useRef<HTMLInputElement>(null);
  const card4Ref = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const handleCardNumberChange = (part: 1 | 2 | 3 | 4, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    if (part === 1) { setCardNumber1(clean); if (clean.length === 4) card2Ref.current?.focus(); }
    if (part === 2) { setCardNumber2(clean); if (clean.length === 4) card3Ref.current?.focus(); }
    if (part === 3) { setCardNumber3(clean); if (clean.length === 4) card4Ref.current?.focus(); }
    if (part === 4) { setCardNumber4(clean); if (clean.length === 4) monthRef.current?.focus(); }
  };

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (v.length === 2 && parseInt(v) > 12) return;
    setExpiryMonth(v);
    if (v.length === 2) yearRef.current?.focus();
  };

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setExpiryYear(v);
    if (v.length === 2) birthRef.current?.focus();
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setBirthDate(v);
    if (v.length === 6) passRef.current?.focus();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwd2digit(e.target.value.replace(/\D/g, '').slice(0, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullCard = cardNumber1 + cardNumber2 + cardNumber3 + cardNumber4;
    if (fullCard.length < 15) { showToast('올바른 카드번호를 입력해주세요.', 'error'); return; }
    if (expiryMonth.length < 2 || expiryYear.length < 2) { showToast('유효기간을 올바르게 입력해주세요.', 'error'); return; }
    if (birthDate.length < 6) { showToast('생년월일 6자리를 입력해주세요.', 'error'); return; }
    if (pwd2digit.length < 2) { showToast('비밀번호 앞 2자리를 입력해주세요.', 'error'); return; }

    setIsSubmitting(true);
    try {
      await api.post('/points/billing-key', {
        cardNumber: fullCard,
        expiry: `20${expiryYear}-${expiryMonth}`,
        birth: birthDate,
        pwd2digit,
      });
      setIsSuccess(true);
      setTimeout(() => navigate('/points/charge'), 2000);
    } catch (e: any) {
      const msg = e.response?.data?.error || '카드 등록에 실패했습니다. 카드 정보를 다시 확인해주세요.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 성공 화면
  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <BsCheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">카드 등록 완료</h2>
          <p className="text-gray-500 font-medium">결제 카드가 성공적으로 등록되었습니다.</p>
          <p className="text-gray-400 text-sm mt-3">잠시 후 충전 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  if (isCheckLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="spinner-border w-10 h-10 text-indigo-600" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pt-8 pb-12 px-4">
      <div className="max-w-md mx-auto">

        {/* 뒤로가기 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
        >
          <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* 헤더 */}
          <div className="p-8 border-b border-gray-50 text-left">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">카드 등록</h1>
            <p className="text-sm text-gray-400 font-medium mt-2">
              카드를 한 번 등록하면 간편하게 포인트를 충전할 수 있습니다.
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="p-8 space-y-7">

            {/* 카드번호 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                카드 번호
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: cardNumber1, onChange: (v: string) => handleCardNumberChange(1, v), ref: undefined, placeholder: '0000' },
                  { val: cardNumber2, onChange: (v: string) => handleCardNumberChange(2, v), ref: card2Ref, placeholder: '0000' },
                  { val: cardNumber3, onChange: (v: string) => handleCardNumberChange(3, v), ref: card3Ref, placeholder: '0000' },
                  { val: cardNumber4, onChange: (v: string) => handleCardNumberChange(4, v), ref: card4Ref, placeholder: '0000' },
                ].map((field, idx) => (
                  <input
                    key={idx}
                    ref={field.ref}
                    type="text"
                    inputMode="numeric"
                    value={field.val}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-2 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-center text-sm"
                    required
                  />
                ))}
              </div>
            </div>

            {/* 유효기간 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  유효기간 (월)
                </label>
                <input
                  type="text"
                  ref={monthRef}
                  inputMode="numeric"
                  value={expiryMonth}
                  onChange={handleExpiryMonthChange}
                  placeholder="MM"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-center text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  유효기간 (연)
                </label>
                <input
                  type="text"
                  ref={yearRef}
                  inputMode="numeric"
                  value={expiryYear}
                  onChange={handleExpiryYearChange}
                  placeholder="YY"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-center text-sm"
                  required
                />
              </div>
            </div>

            {/* 생년월일 / 비밀번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  생년월일 (6자리)
                </label>
                <input
                  type="text"
                  ref={birthRef}
                  inputMode="numeric"
                  value={birthDate}
                  onChange={handleBirthDateChange}
                  placeholder="YYMMDD"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-center text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  비밀번호 앞 2자리
                </label>
                <input
                  type="password"
                  ref={passRef}
                  inputMode="numeric"
                  value={pwd2digit}
                  onChange={handlePasswordChange}
                  placeholder="••"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none transition-all text-center text-sm"
                  required
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="pt-1 space-y-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <>
                    <div className="spinner-border w-5 h-5 mr-2" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    등록 중...</>
                  : '카드 등록하기'
                }
              </button>

              <p className="text-center text-[11px] text-gray-400 font-medium leading-relaxed">
                카드는 1개만 등록 가능하며,<br />설정에서 언제든지 변경할 수 있습니다.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
