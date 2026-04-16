import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, CheckCircle2 } from 'lucide-react';
import { BiPlus, BiX } from 'react-icons/bi';
import { BiArrowBack } from 'react-icons/bi';
import { motion } from 'motion/react';
import { useAppContext } from '@/context/AppContext';
import api from '@/services/api';
import { showToast } from '@/components/toastService';

// import 없이 깔끔하게 문자열 경로만 사용합니다.
const BANKS = [
  { name: 'KB국민은행', logo: '/images/KB국민은행.png' },
  { name: '신한은행', logo: '/images/신한은행.png' },
  { name: '우리은행', logo: '/images/우리은행.jpg' },
  { name: '하나은행', logo: '/images/하나은행.png' },
  { name: 'NH농협은행', logo: '/images/NH농협은행.jpg' },
  { name: 'IBK기업은행', logo: '/images/ibk기업은행.png' },
  { name: '카카오뱅크', logo: '/images/카카오뱅크.png' },
  { name: '토스뱅크', logo: '/images/토스은행.png' },
  { name: '케이뱅크', logo: '/images/케이뱅크.png' },
  { name: 'SC제일은행', logo: '/images/제일은행.png' },
  { name: '씨티은행', logo: '/images/씨티은행.png' },
  { name: '수협은행', logo: '/images/수협은행.png' },
  { name: '우체국', logo: '/images/우체국.png' },
  { name: '새마을금고', logo: '/images/새마을금고.jpg' },
  { name: '신협', logo: '/images/신협.png' },
  { name: '경남은행', logo: '/images/경남은행.png' },
];

export const PointWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();

  // State
  const [amount, setAmount] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [withdrawType, setWithdrawType] = useState<'my' | 'new'>('my');
  const [newBank, setNewBank] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);

  // 현재 선택된 "새로운 은행"의 상세 정보 찾기 (로고 표시용)
  const selectedNewBankInfo = BANKS.find(bank => bank.name === newBank);

  // Fetch accounts
  useEffect(() => {
    setIsLoading(true);
    api.get('/points/accounts')
      .then(res => {
        setAccounts(res.data);
        if (res.data.length > 0) {
          setSelectedMethodId(res.data[0].accountNo);
        }
      })
      .catch(() => showToast('계좌 정보를 불러오는데 실패했습니다.', 'error'))
      .finally(() => setIsLoading(false));
  }, []);

  const selectedMethod = accounts.find(a => a.accountNo === selectedMethodId);

  const handleWithdraw = async () => {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) return;

    try {
      const payload: any = { amount: numAmount };
      if (withdrawType === 'my') {
        if (!selectedMethodId) {
          showToast('출금할 계좌를 선택해주세요.', 'warning');
          return;
        }
        payload.accountNo = selectedMethodId;
      } else {
        if (!newBank || !newAccount || !newAccountHolder) {
          showToast('계좌 정보를 모두 입력해주세요.', 'warning');
          return;
        }
        payload.bankName = newBank;
        payload.accountNumber = newAccount;
        payload.accountHolder = newAccountHolder;
      }

      const res = await api.post('/points/withdraw', payload);
      if (res.data.success) {
        setResult({ type: 'success', message: res.data.message });
        setIsSuccess(true);
      } else {
        showToast(res.data.message || '출금 신청에 실패했습니다.', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || '출금 신청 중 오류가 발생했습니다.', 'error');
    }
  };

  if (isSuccess && result?.type === 'success') {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">출금 신청 완료!</h2>
        <p className="text-gray-500 font-medium mb-6">{result.message}</p>

        {/* 안내 박스 */}
        <div className="bg-amber-50 rounded-2xl p-5 mb-8 text-left border border-amber-100">
          <p className="text-sm font-bold text-amber-800 mb-2">출금 처리 안내</p>
          <ul className="text-xs text-amber-700 space-y-1.5 font-medium">
            <li>• 출금 신청은 관리자 확인 후 처리됩니다.</li>
            <li>• 포인트는 관리자 완료 처리 시 차감됩니다.</li>
            <li>• 처리까지 영업일 기준 1~2일이 소요될 수 있습니다.</li>
            <li>• 문의사항은 고객센터로 연락해주세요.</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/points')}
          className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <BiArrowBack className="w-6 h-6 text-gray-900" />
        </button>
        <h2 className="text-3xl font-bold text-gray-900 tracking-normal">포인트 출금</h2>
      </div>

      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        {/* Withdrawal Options */}
        <div className="flex gap-4">
          <button
            onClick={() => setWithdrawType('my')}
            className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left outline-none ${withdrawType === 'my' ? 'border-indigo-600 bg-indigo-50/50 shadow-none' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${withdrawType === 'my' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Landmark className="w-5 h-5" />
            </div>
            <p className={`font-bold ${withdrawType === 'my' ? 'text-indigo-900' : 'text-gray-900'}`}>내 계좌로</p>
            <p className="text-xs text-gray-400 font-medium mt-1">등록된 계좌로 출금</p>
          </button>
          <button
            onClick={() => setWithdrawType('new')}
            className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left outline-none ${withdrawType === 'new' ? 'border-indigo-600 bg-indigo-50/50 shadow-none' : 'border-gray-100 bg-white hover:border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${withdrawType === 'new' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              <BiPlus className="w-5 h-5 mr-1" /> 계좌 추가하기
            </div>
            <p className={`font-bold ${withdrawType === 'new' ? 'text-indigo-900' : 'text-gray-900'}`}>새로운 계좌로</p>
            <p className="text-xs text-gray-400 font-medium mt-1">직접 입력하여 출금</p>
          </button>
        </div>

        {/* Destination Account Info */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          {withdrawType === 'my' ? (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">출금 계좌 정보</p>
              {selectedMethod ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 내 계좌 등록된 은행 로고 표시 부분 */}
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden">
                      {(() => {
                        const bankInfo = BANKS.find(b => b.name === selectedMethod.bankName);
                        return bankInfo?.logo ? (
                          <img src={bankInfo.logo} alt={selectedMethod.bankName} className="w-full h-full object-cover p-1" />
                        ) : (
                          <Landmark className="w-6 h-6 text-indigo-600" />
                        );
                      })()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedMethod.bankName}</p>
                      <p className="text-sm text-gray-400 font-medium">{selectedMethod.accountNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMethodModalOpen(true)}
                    className="px-4 py-2 bg-gray-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-all"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">등록된 계좌가 없습니다.</p>
                  <button
                    onClick={() => navigate('/settings/account-register')}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    계좌 등록하러 가기
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* "새로운 계좌로" 선택 시 나타나는 섹션 */
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-900 mb-2">어디로 보낼까요?</h4>

              {!newBank ? (
                /* 1단계: 은행 선택 그리드 */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">은행 선택</label>
                  <div className="flex flex-wrap justify-between gap-y-3">
                    {BANKS.map((bank) => (
                      <button
                        key={bank.name}
                        type="button"
                        onClick={() => setNewBank(bank.name)}
                        className="w-[calc(25%-8px)] sm:w-[88px] aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-all shadow-sm hover:bg-gray-100"
                      >
                        <div className={`w-8 h-8 rounded-full mb-1 flex items-center justify-center overflow-hidden ${bank.logo ? 'bg-white border border-gray-100' : 'bg-gray-200'}`}>
                          {bank.logo ? (
                            <img src={bank.logo} alt={bank.name} className="w-full h-full object-cover p-1" />
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">{bank.name.substring(0, 1)}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight text-gray-500">
                          {bank.name}
                        </span>
                      </button>
                    ))}
                    {/* 그리드 정렬을 위한 빈 공간 채우기 */}
                    <div className="w-[calc(25%-8px)] sm:w-[88px] h-0"></div>
                    <div className="w-[calc(25%-8px)] sm:w-[88px] h-0"></div>
                    <div className="w-[calc(25%-8px)] sm:w-[88px] h-0"></div>
                  </div>
                </motion.div>
              ) : (
                /* 2단계: 계좌 정보 입력 폼 */
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* 선택된 은행 표시 및 변경 버튼 */}
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${selectedNewBankInfo?.logo ? 'bg-white border border-gray-100' : 'bg-gray-200'}`}>
                        {selectedNewBankInfo?.logo ? (
                          <img src={selectedNewBankInfo.logo} alt={newBank} className="w-full h-full object-cover p-1" />
                        ) : (
                          <span className="text-[11px] text-gray-400 font-bold">{newBank.substring(0, 1)}</span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">{newBank}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewBank('')}
                      className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border border-gray-200 rounded-lg hover:bg-white transition-all hover:text-gray-900"
                    >
                      변경
                    </button>
                  </div>

                  {/* 예금주 및 계좌번호 입력란 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">예금주</label>
                      <input
                        type="text"
                        value={newAccountHolder}
                        onChange={(e) => setNewAccountHolder(e.target.value)}
                        placeholder="예금주명 입력"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-indigo-600 outline-none transition-all font-bold focus:bg-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">계좌번호</label>
                      <input
                        type="text"
                        value={newAccount}
                        onChange={(e) => setNewAccount(e.target.value.replace(/\D/g, ''))}
                        placeholder="계좌번호 입력 (- 제외)"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-indigo-600 outline-none transition-all font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-center">
          <h4 className="text-xl font-bold text-gray-900 mb-8">얼마를 출금할까요?</h4>

          <div className="flex flex-col items-center mb-10">
            <div className="relative w-full max-w-[240px]">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                className="w-full text-4xl font-bold py-4 border-b-4 border-gray-100 focus:border-indigo-600 outline-none transition-all placeholder:text-gray-200 text-center pr-8"
              />
              <span className="absolute right-0 bottom-5 text-2xl font-bold text-gray-300">P</span>
            </div>

            {/* Available Points Display - Centered below input */}
            <p className="mt-4 text-sm font-bold text-gray-400">
              출금 가능 포인트{' '}
              <span className="text-indigo-600">{(user?.points || 0).toLocaleString()}P</span>
            </p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={!amount || Number(amount) <= 0 || Number(amount) > (user?.points || 0) || (withdrawType === 'new' && (!newBank || !newAccount))}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
          >
            출금 신청하기
          </button>
          <p className="text-[10px] text-gray-400 mt-4 font-medium text-center">
            출금 신청 후 영업일 기준 1~3일 이내에 입금됩니다.
          </p>
        </div>
      </div>

      {/* Account Management Modal */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMethodModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">출금 계좌 관리</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/settings/account-register')}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all"
                >
                  추가/수정
                </button>
                <button onClick={() => setIsMethodModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <BiX className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <p className="text-sm font-medium">등록된 계좌가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map(method => {
                    const bankInfo = BANKS.find(b => b.name === method.bankName);
                    return (
                      <div
                        key={method.accountNo}
                        onClick={() => {
                          setSelectedMethodId(method.accountNo);
                          setIsMethodModalOpen(false);
                        }}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${selectedMethodId === method.accountNo ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          {/* 모달 내부의 내 계좌 목록 로고 이미지 */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${selectedMethodId === method.accountNo ? 'bg-indigo-600' : 'bg-white border border-gray-100'}`}>
                            {bankInfo?.logo ? (
                              <img src={bankInfo.logo} alt={method.bankName} className={`w-full h-full object-cover p-1 ${selectedMethodId === method.accountNo ? 'brightness-0 invert' : ''}`} />
                            ) : (
                              <Landmark className={`w-5 h-5 ${selectedMethodId === method.accountNo ? 'text-white' : 'text-gray-400'}`} />
                            )}
                          </div>
                          <div>
                            <p className={`font-bold ${selectedMethodId === method.accountNo ? 'text-indigo-900' : 'text-gray-900'}`}>{method.bankName}</p>
                            <p className={`text-xs font-medium ${selectedMethodId === method.accountNo ? 'text-indigo-700' : 'text-gray-400'}`}>{method.accountNumber} · {method.accountHolder}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};