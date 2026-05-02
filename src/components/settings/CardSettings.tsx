import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsCreditCard } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';
import { useConfirm } from '@/components/ConfirmModal';

export const CardSettings: React.FC = () => {
  const navigate = useNavigate();
  const [registeredCard, setRegisteredCard] = useState<{
    cardName: string;
    cardNo: string;
    createdAt?: string;
  } | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(true);
  const { showConfirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    api.get('/points/billing-key')
      .then(res => {
        if (res.data.registered) {
          setRegisteredCard({
            cardName: res.data.cardName,
            cardNo: res.data.cardNo,
            createdAt: res.data.createdAt,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsCardLoading(false));
  }, []);

  const handleDeleteRegisteredCard = () => {
    showConfirm(
      '등록된 카드를 삭제하시겠습니까?',
      async () => {
        try {
          await api.delete('/points/billing-key');
          setRegisteredCard(null);
          showToast('카드가 성공적으로 삭제되었습니다.', 'success');
        } catch {
          showToast('카드 삭제 중 오류가 발생했습니다.', 'error');
        }
      },
      { variant: 'danger', confirmText: '삭제', subMessage: '카드 삭제 후에는 간편 충전을 사용할 수 없습니다.' }
    );
  };

  return (
    <>
    {ConfirmDialog}
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-gray-900">결제 카드 관리</h3>
        <button
          onClick={() => {
            if (registeredCard) {
              showToast('이미 카드가 등록되어 있습니다. 삭제 후 다시 눌러주세요.', 'warning');
            } else {
              navigate('/points/card-register');
            }
          }}
          className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
        >
          카드 등록
        </button>
      </div>

      {isCardLoading ? (
        <div className="py-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : registeredCard ? (
        <div className="flex items-center justify-between p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <BsCreditCard className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{registeredCard.cardName || '등록된 카드'}</p>
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  기본
                </span>
              </div>
              <p className="text-sm text-gray-400">{registeredCard.cardNo || '카드번호 정보 없음'}</p>
            </div>
          </div>
          <button
            onClick={handleDeleteRegisteredCard}
            className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-2xl hover:bg-red-100 transition-all"
          >
            삭제
          </button>
        </div>
      ) : (
        <div className="py-10 text-center text-gray-400">
          <BsCreditCard className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium">등록된 카드가 없습니다.</p>
          <p className="text-xs text-gray-300 mt-1">카드를 등록하면 포인트를 간편하게 충전할 수 있습니다.</p>
        </div>
      )}
    </section>
    </>
  );
};
