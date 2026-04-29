import React, { useState, useEffect } from 'react';
import { BsToggle2On, BsToggle2Off } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';
import { useAppContext } from '@/context/AppContext';

export const NotificationSettings: React.FC = () => {
  const { updateNotifyChat, updateNotifyBadge } = useAppContext();
  const [settings, setSettings] = useState({
    auctionEnd: true,
    newBid: true,
    marketing: false,
    chat: true,
  });

  useEffect(() => {
    api.get('/members/me').then(res => {
      setSettings({
        auctionEnd: res.data.notifyAuctionEnd === 1,
        newBid: res.data.notifyNewBid === 1,
        chat: res.data.notifyChat === 1,
        marketing: res.data.marketingAgree === 1,
      });
    }).catch(() => {});
  }, []);

  const toggleSetting = async (key: keyof typeof settings) => {
    const newVal = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newVal }));

    if (key === 'chat') updateNotifyChat(newVal);
    if (key === 'auctionEnd' || key === 'newBid' || key === 'marketing') updateNotifyBadge(key, newVal);

    try {
      await api.put('/members/me/notification', {
        [key === 'auctionEnd' ? 'auctionEnd' :
          key === 'newBid' ? 'newBid' :
          key === 'chat' ? 'chat' : 'marketing']: newVal,
      });
    } catch {
      setSettings(prev => ({ ...prev, [key]: !newVal }));
      if (key === 'chat') updateNotifyChat(!newVal);
      if (key === 'auctionEnd' || key === 'newBid' || key === 'marketing') updateNotifyBadge(key, !newVal);
      showToast('설정 변경에 실패했습니다.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900">알림 설정</h3>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-bold text-gray-900">경매 종료 알림</p>
            <p className="text-sm text-gray-500">관심 등록하거나 입찰한 경매가 종료될 때 알림을 받습니다.</p>
          </div>
          <button
            onClick={() => toggleSetting('auctionEnd')}
            className={`text-3xl transition-all ${settings.auctionEnd ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
          >
            {settings.auctionEnd ? <BsToggle2On /> : <BsToggle2Off />}
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-bold text-gray-900">새로운 입찰 알림</p>
            <p className="text-sm text-gray-500">내가 올린 상품에 새로운 입찰이 발생하면 알림을 받습니다.</p>
          </div>
          <button
            onClick={() => toggleSetting('newBid')}
            className={`text-3xl transition-all ${settings.newBid ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
          >
            {settings.newBid ? <BsToggle2On /> : <BsToggle2Off />}
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-bold text-gray-900">채팅 알림</p>
            <p className="text-sm text-gray-500">새로운 채팅 메시지가 도착하면 알림을 받습니다.</p>
          </div>
          <button
            onClick={() => toggleSetting('chat')}
            className={`text-3xl transition-all ${settings.chat ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
          >
            {settings.chat ? <BsToggle2On /> : <BsToggle2Off />}
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-gray-50 pt-6">
          <div>
            <p className="font-bold text-gray-900">마케팅 정보 수신</p>
            <p className="text-sm text-gray-500">이벤트, 혜택 등 다양한 마케팅 소식을 받습니다.</p>
          </div>
          <button
            onClick={() => toggleSetting('marketing')}
            className={`text-3xl transition-all ${settings.marketing ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
          >
            {settings.marketing ? <BsToggle2On /> : <BsToggle2Off />}
          </button>
        </div>
      </div>
    </section>
  );
};
