// src/pages/mypage/PointCharge.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAppContext } from '@/context/AppContext';
import { showToast } from '@/components/toastService';

export const PointCharge: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateCurrentUserPoints } = useAppContext();

  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 카드 등록 상태
  const [registeredCard, setRegisteredCard] = useState<{
    cardName: string;
    cardNo: string;
  } | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(true);

  // 카드 입력 상태 추가
  const [cardForm, setCardForm] = useState({
    cardNumber: '',   // 16자리
    expiryMonth: '',  // MM
    expiryYear: '',   // YY
    birth: '',        // 생년월일 6자리
    pwd2digit: '',    // 비밀번호 앞 2자리
  });
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);

  // 카드번호 입력 시 자동 하이픈 포맷팅
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 16);
    return numbers.replace(/(\d{4})(?=\d)/g, '$1-');
  };

  // 결과 상태
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    newBalance?: number;
  } | null>(null);

  // 마운트 시 등록된 카드 조회
  useEffect(() => {
    fetchRegisteredCard();
  }, []);

  const fetchRegisteredCard = async () => {
    try {
      const res = await api.get('/points/billing-key');
      if (res.data.registered) {
        setRegisteredCard({
          cardName: res.data.cardName,
          cardNo: res.data.cardNo,
        });
      }
    } catch (e) {
      // 카드 미등록 상태 — 정상 케이스
    } finally {
      setIsCardLoading(false);
    }
  };

  // 카드 등록 버튼 클릭
  const handleRegisterCard = async () => {
    const { cardNumber, expiryMonth, expiryYear, birth, pwd2digit } = cardForm;

    // 유효성 검사
    const rawCard = cardNumber.replace(/-/g, '');
    if (rawCard.length !== 16) {
      showToast('카드번호 16자리를 입력해주세요.', 'warning'); return;
    }
    if (!expiryMonth || !expiryYear) {
      showToast('유효기간을 입력해주세요.', 'warning'); return;
    }
    if (birth.length !== 6) {
      showToast('생년월일 6자리를 입력해주세요.', 'warning'); return;
    }
    if (pwd2digit.length !== 2) {
      showToast('비밀번호 앞 2자리를 입력해주세요.', 'warning'); return;
    }

    setIsLoading(true);
    try {
      // expiry 형식: YYYY-MM
      const expiry = `20${expiryYear}-${expiryMonth}`;

      await api.post('/points/billing-key', {
        cardNumber: rawCard,
        expiry,
        birth,
        pwd2digit,
      });

      await fetchRegisteredCard(); // 등록 후 카드 정보 새로고침
      setIsCardFormOpen(false);
      setCardForm({ cardNumber: '', expiryMonth: '', expiryYear: '', birth: '', pwd2digit: '' });
      showToast('카드가 성공적으로 등록되었습니다.', 'success');
    } catch (e: any) {
      const msg = e.response?.data?.error || '카드 등록에 실패했습니다. 카드 정보를 확인해주세요.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 카드 삭제
  const handleDeleteCard = async () => {
    if (!confirm('등록된 카드를 삭제하시겠습니까?')) return;
    try {
      await api.delete('/points/billing-key');
      setRegisteredCard(null);
      showToast('카드가 삭제되었습니다.', 'success');
    } catch (e) {
      showToast('카드 삭제에 실패했습니다.', 'error');
    }
  };

  // 충전 버튼 클릭 — 핵심 로직
  const handleCharge = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('충전 금액을 입력해주세요.', 'warning');
      return;
    }
    if (numAmount < 1000) {
      showToast('최소 충전 금액은 1,000원입니다.', 'warning');
      return;
    }
    if (!registeredCard) {
      showToast('먼저 카드를 등록해주세요.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // 백엔드가 PortOne 서버에 직접 결제 요청 + 검증까지 처리
      const res = await api.post('/points/charge', { amount: numAmount });
      const { newBalance, message } = res.data;

      // AppContext user.points 업데이트 → 헤더 포인트 즉시 반영
      updateCurrentUserPoints(newBalance);

      setResult({ type: 'success', message, newBalance });
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || '충전 중 오류가 발생했습니다.';
      setResult({ type: 'error', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // 결과 화면 (성공)
  if (result?.type === 'success') {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">충전 완료!</h2>
        <p className="text-gray-500 font-medium mb-10">{result.message}</p>
        <div className="bg-gray-50 rounded-3xl p-6 mb-10">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400 font-bold">충전 후 잔액</span>
            <span className="text-xl font-black text-gray-900">
              {result.newBalance?.toLocaleString()}P
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/points')}
          className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl"
        >
          확인
        </button>
      </div>
    );
  }

  // 결과 화면 (실패)
  if (result?.type === 'error') {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">충전 실패</h2>
        <p className="text-gray-500 font-medium mb-10">{result.message}</p>
        <button
          onClick={() => setResult(null)}
          className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h2 className="text-3xl font-black text-gray-900 tracking-normal">포인트 충전</h2>
      </div>

      <div className="space-y-8">
        {/* 결제 수단 카드 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">결제 수단</p>

          {isCardLoading ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              <span className="text-sm text-gray-400">카드 정보를 불러오는 중...</span>
            </div>
          ) : registeredCard ? (
            /* 카드 등록된 상태 */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-black text-gray-900">{registeredCard.cardName || '등록된 카드'}</p>
                  <p className="text-sm text-gray-400 font-medium">{registeredCard.cardNo || '카드번호 정보 없음'}</p>
                </div>
              </div>
              <button
                onClick={handleDeleteCard}
                className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-xl hover:bg-red-100 transition-all"
              >
                삭제
              </button>
            </div>
          ) : (
            <div>
              {!isCardFormOpen ? (
                /* 카드 미등록 — 등록 버튼만 표시 */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-black text-gray-500">등록된 카드 없음</p>
                      <p className="text-sm text-gray-400">카드를 등록하면 간편하게 충전할 수 있습니다</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCardFormOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    카드 등록
                  </button>
                </div>
              ) : (
                /* 카드 입력 폼 */
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* 카드번호 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">카드번호</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000-0000-0000-0000"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm(prev => ({
                        ...prev,
                        cardNumber: formatCardNumber(e.target.value)
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>

                  {/* 유효기간 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">유효기간 (월)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        maxLength={2}
                        value={cardForm.expiryMonth}
                        onChange={(e) => setCardForm(prev => ({
                          ...prev,
                          expiryMonth: e.target.value.replace(/\D/g, '')
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">유효기간 (년)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="YY"
                        maxLength={2}
                        value={cardForm.expiryYear}
                        onChange={(e) => setCardForm(prev => ({
                          ...prev,
                          expiryYear: e.target.value.replace(/\D/g, '')
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 생년월일 / 비밀번호 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">생년월일 6자리</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="YYMMDD"
                        maxLength={6}
                        value={cardForm.birth}
                        onChange={(e) => setCardForm(prev => ({
                          ...prev,
                          birth: e.target.value.replace(/\D/g, '')
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">비밀번호 앞 2자리</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="••"
                        maxLength={2}
                        value={cardForm.pwd2digit}
                        onChange={(e) => setCardForm(prev => ({
                          ...prev,
                          pwd2digit: e.target.value.replace(/\D/g, '')
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 보안 안내 */}
                  <p className="text-xs text-gray-400 text-center">
                    🔒 카드 정보는 PortOne 서버에 직접 전송되며 당사 서버에 저장되지 않습니다
                  </p>

                  {/* 버튼 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsCardFormOpen(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleRegisterCard}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '카드 등록'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 금액 입력 */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-center">
          <h4 className="text-xl font-black text-gray-900 mb-8">얼마를 충전할까요?</h4>

          <div className="flex flex-col items-center mb-6">
            <div className="relative w-full max-w-[240px]">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                className="w-full text-4xl font-black py-4 border-b-4 border-gray-100 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-200 text-center pr-8"
              />
              <span className="absolute right-0 bottom-5 text-2xl font-black text-gray-300">원</span>
            </div>
            {amount && Number(amount) > 0 && (
              <p className="mt-4 text-sm font-bold text-gray-400">
                충전 후 잔액{' '}
                <span className="text-indigo-600">
                  {((user?.points || 0) + Number(amount)).toLocaleString()}P
                </span>
              </p>
            )}
          </div>

          {/* 금액 빠른 선택 버튼 */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {['10000', '30000', '50000', '100000'].map((val) => (
              <button
                key={val}
                onClick={() => setAmount((prev) => (Number(prev) + Number(val)).toString())}
                className="py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition-all"
              >
                +{Number(val).toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={handleCharge}
            disabled={isLoading || !amount || Number(amount) <= 0 || !registeredCard}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                결제 중...
              </>
            ) : (
              '충전하기'
            )}
          </button>

          {!registeredCard && (
            <p className="mt-3 text-xs text-gray-400">카드를 먼저 등록해야 충전할 수 있습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};