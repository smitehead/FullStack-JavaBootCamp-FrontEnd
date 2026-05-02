import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsBank } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';
import { useConfirm } from '@/components/ConfirmModal';

interface BankAccount {
  accountNo: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault: number;
}

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const { showConfirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    setIsAccountLoading(true);
    api.get('/points/accounts')
      .then(res => setAccounts(res.data))
      .catch(() => {})
      .finally(() => setIsAccountLoading(false));
  }, []);

  const handleDeleteAccount = async (accountNo: number) => {
    showConfirm('이 계좌를 삭제하시겠습니까?', async () => {
      try {
        await api.delete(`/points/accounts/${accountNo}`);
        setAccounts(prev => prev.filter(a => a.accountNo !== accountNo));
        showToast('계좌가 삭제되었습니다.', 'success');
      } catch {
        showToast('계좌 삭제에 실패했습니다.', 'error');
      }
    }, { variant: 'danger', confirmText: '삭제' });
  };

  return (
    <>
    {ConfirmDialog}
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900">계좌 관리</h3>
          <p className="text-xs text-gray-400 mt-1">최대 3개까지 등록 가능합니다.</p>
        </div>
        {accounts.length < 3 && (
          <button
            onClick={() => navigate('/settings/account-register')}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
          >
            계좌 추가
          </button>
        )}
      </div>

      {isAccountLoading ? (
        <div className="py-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-10 text-center text-gray-400">
          <BsBank className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium">등록된 계좌가 없습니다.</p>
          <p className="text-xs text-gray-300 mt-1">출금 시 사용할 계좌를 등록하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.accountNo} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <BsBank className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{acc.bankName}</p>
                  <p className="text-sm text-gray-400">{acc.accountNumber} · {acc.accountHolder}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAccount(acc.accountNo)}
                className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-2xl hover:bg-red-100 transition-all"
              >
                삭제
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center pt-2">
            {accounts.length}/3 계좌 등록됨
          </p>
        </div>
      )}
    </section>
    </>
  );
};
