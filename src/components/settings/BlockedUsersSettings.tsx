import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { showToast } from '@/components/toastService';
import { getProfileImageUrl } from '@/utils/imageUtils';

export const BlockedUsersSettings: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/members/me/blocked')
      .then(res => setBlockedUsers(res.data))
      .catch(() => {});
  }, []);

  const unblockUser = async (memberNo: number) => {
    try {
      await api.delete(`/members/me/blocked/${memberNo}`);
      setBlockedUsers(prev => prev.filter(u => u.memberNo !== memberNo));
      showToast('차단이 해제되었습니다.', 'success');
    } catch {
      showToast('차단 해제에 실패했습니다.', 'error');
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900">차단 사용자 관리</h3>
      </div>

      {blockedUsers.length > 0 ? (
        <div className="space-y-4">
          {blockedUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <img src={getProfileImageUrl(user.profileImage)} alt={user.nickname} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-gray-900">{user.nickname}</p>
                  <p className="text-xs text-gray-400">매너온도 {Number(user.mannerTemp).toFixed(1)}℃</p>
                </div>
              </div>
              <button
                onClick={() => unblockUser(user.memberNo)}
                className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-2xl hover:bg-red-100 transition-all"
              >
                차단 해제
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-gray-400">
          <p className="text-sm font-medium">차단한 사용자가 없습니다.</p>
        </div>
      )}
    </section>
  );
};
