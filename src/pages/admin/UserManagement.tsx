import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BsSearch, BsThermometerHalf, BsCoin, BsArrowDownUp, BsFunnel } from 'react-icons/bs';

import { BsPersonX, BsPersonCheck, BsShield } from 'react-icons/bs';
import { BsPerson } from 'react-icons/bs';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { User } from '@/types';
import { showToast } from '@/components/toastService';
import { getProfileImageUrl } from '@/utils/imageUtils';

type UserStatus = '정상' | '정지' | '영구정지' | '탈퇴';
type SortField = 'mannerTemp' | 'points' | 'joinedAt' | 'role' | 'status' | 'postCount';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 15;

export const UserManagement: React.FC = () => {
  const { users, suspendUser, unsuspendUser, updateUserRole, updateUserManner, updateUserPoints, mannerHistory } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('nickname') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'manner' | 'suspend' | 'points' | null>(null);

  // Filter & Sort States
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal Input States
  const [mannerValue, setMannerValue] = useState(36.5);
  const [mannerReason, setMannerReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState('');
  const [pointAmount, setPointAmount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nickname = searchParams.get('nickname');
    if (nickname) {
      setSearchTerm(nickname);
    }
  }, [searchParams]);

  // Only active users for this page
  const allUsers = useMemo(() => {
    return users.map(u => ({
      ...u,
      status: (u.isPermanentlySuspended ? '영구정지' : u.isSuspended ? '정지' : '정상') as UserStatus,
      isWithdrawn: false
    }));
  }, [users]);

  const filteredAndSortedUsers = useMemo(() => {
    return allUsers
      .filter(u => {
        const matchesSearch = u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || (filterRole === 'admin' ? u.isAdmin : !u.isAdmin);
        const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'mannerTemp') comparison = a.mannerTemp - b.mannerTemp;
        else if (sortField === 'points') comparison = a.points - b.points;
        else if (sortField === 'joinedAt') comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        else if (sortField === 'role') comparison = (a.isAdmin ? 1 : 0) - (b.isAdmin ? 1 : 0);
        else if (sortField === 'status') comparison = a.status.localeCompare(b.status);
        else if (sortField === 'postCount') comparison = (a.postCount || 0) - (b.postCount || 0);

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [allUsers, searchTerm, filterRole, filterStatus, sortField, sortOrder]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, filterRole, filterStatus]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && visibleCount < filteredAndSortedUsers.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredAndSortedUsers.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleOpenModal = (user: User, type: 'manner' | 'suspend' | 'points') => {
    setSelectedUser(user);
    setModalType(type);
    setIsModalOpen(true);
    if (type === 'manner') {
      setMannerValue(user.mannerTemp);
      setMannerReason('');
    }
    if (type === 'points') setPointAmount(0);
    if (type === 'suspend') {
      setSuspendDays(7);
      setSuspendReason('');
    }
  };

  const handleAction = () => {
    if (!selectedUser) return;

    if (modalType === 'suspend') {
      if (!suspendReason.trim()) {
        showToast('정지 사유를 입력해주세요.', 'error');
        return;
      }
      suspendUser(selectedUser.id, suspendDays, suspendReason);
    } else if (modalType === 'manner') {
      if (!mannerReason.trim()) {
        showToast('변경 사유를 입력해주세요.', 'error');
        return;
      }
      updateUserManner(selectedUser.id, mannerValue, mannerReason);
    } else if (modalType === 'points') {
      if (isNaN(pointAmount) || !Number.isFinite(pointAmount)) {
        showToast('올바른 포인트 금액을 입력해주세요.', 'error');
        return;
      }
      updateUserPoints(selectedUser.id, pointAmount);
    }

    setIsModalOpen(false);
    setSelectedUser(null);
    setModalType(null);
    setPointAmount(0);
    setSuspendReason('');
    setMannerReason('');
  };

  const toggleSuspension = (user: User) => {
    if (user.isSuspended) {
      if (window.confirm('정지를 해제하시겠습니까?')) {
        unsuspendUser(user.id);
      }
    } else {
      handleOpenModal(user, 'suspend');
    }
  };

  const handleRoleChange = (user: User, newIsAdmin: boolean) => {
    if (user.isAdmin === newIsAdmin) {
      showToast(`이미 ${newIsAdmin ? '관리자' : '일반'} 권한입니다.`, 'error');
      return;
    }

    if (window.confirm(`정말로 ${newIsAdmin ? '관리자' : '일반'} 권한으로 변경하시겠습니까?`)) {
      updateUserRole(user.id, newIsAdmin);
      showToast('권한이 변경되었습니다.', 'success');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleUserClick = (nickname: string) => {
    setSearchTerm(nickname);
    setSearchParams({ nickname });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">사용자 관리</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-gray-500 text-xs font-medium">회원 정보 조회 및 제재 조치를 관리합니다.</p>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <p className="text-[#FF5A5A] text-xs font-bold">총 {allUsers.length}명</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative w-64 flex items-center h-10">
            <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
              <BsSearch className="text-gray-400 w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="닉네임 또는 이메일 검색"
              className="w-full pl-10 pr-4 h-full bg-white border border-gray-200 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] focus:border-transparent font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-none px-4 py-2.5 shadow-sm">
            <BsFunnel className="w-3.5 h-3.5 text-gray-400" />
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
            >
              <option value="all">모든 권한</option>
              <option value="user">일반</option>
              <option value="admin">관리자</option>
            </select>
            <div className="w-px h-3 bg-gray-200 mx-1"></div>
            <select
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">모든 상태</option>
              <option value="정상">정상</option>
              <option value="정지">정지</option>
              <option value="영구정지">영구정지</option>
              <option value="탈퇴">탈퇴</option>
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BsPerson className="w-4 h-4 text-gray-400" /> 사용자 목록
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {(['role', 'mannerTemp', 'points', 'postCount', 'status', 'joinedAt'] as SortField[]).map((field) => {
                const labels: Record<SortField, string> = { role: '권한', mannerTemp: '매너온도', points: '포인트', postCount: '경매수', status: '상태', joinedAt: '가입일' };
                return (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-none text-[10px] font-bold transition-colors ${sortField === field ? 'bg-[#FF5A5A] text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                  >
                    {labels[field]}
                    <BsArrowDownUp className="w-2.5 h-2.5" />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-gray-400">{filteredAndSortedUsers.length}명</span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredAndSortedUsers.slice(0, visibleCount).map((user) => (
            <div key={user.id} className={`px-5 py-2.5 hover:bg-gray-50 transition-colors group ${user.isWithdrawn ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center min-w-0 flex-1">
                  <img src={getProfileImageUrl(user.profileImage)} alt={user.nickname} className="w-8 h-8 rounded-none object-cover bg-gray-100 shrink-0 mr-3" />
                  {/* 닉네임 */}
                  <button
                    onClick={() => handleUserClick(user.nickname)}
                    title={user.nickname}
                    className="w-[110px] shrink-0 text-[13px] font-bold text-gray-900 hover:text-[#FF5A5A] transition-colors truncate text-left"
                  >
                    {user.nickname}
                  </button>
                  {/* 권한 뱃지 */}
                  <div className="w-[62px] shrink-0">
                    {!user.isWithdrawn && (
                      <div className="relative inline-flex group/role">
                        <span className={`inline-flex items-center h-[18px] px-1.5 rounded-none text-[11px] font-bold cursor-pointer ${user.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.isAdmin ? <BsShield className="w-2.5 h-2.5 mr-1" /> : <BsPerson className="w-2.5 h-2.5 mr-1" />}
                          {user.isAdmin ? '관리자' : '일반'}
                        </span>
                        <div className="absolute left-0 top-full mt-1 w-24 bg-white border border-gray-100 rounded-none shadow-xl py-1 z-10 opacity-0 invisible group-hover/role:opacity-100 group-hover/role:visible transition-all">
                          <button onClick={() => handleRoleChange(user as any, false)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-blue-600">일반</button>
                          <button onClick={() => handleRoleChange(user as any, true)} className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-purple-600">관리자</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 상태 뱃지 */}
                  <div className="w-[56px] shrink-0">
                    <span className={`inline-flex items-center h-[18px] px-1.5 rounded-none text-[11px] font-bold ${user.status === '영구정지' ? 'bg-black text-white' : user.status === '정지' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.status}
                    </span>
                  </div>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  {/* 이메일 */}
                  <span title={user.email || '이메일 없음'} className="w-[150px] shrink-0 text-xs text-gray-400 truncate">{user.email || '이메일 없음'}</span>
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  {/* 전화번호 */}
                  <span title={(user as any).phoneNum || '-'} className="w-[110px] shrink-0 text-xs text-gray-400 truncate">{(user as any).phoneNum || '-'}</span>
                  {!user.isWithdrawn && (
                    <>
                      <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                      {/* 매너온도 */}
                      <span className="w-[72px] shrink-0 inline-flex items-center gap-1 text-xs font-bold text-gray-600">
                        <BsThermometerHalf className={`w-3.5 h-3.5 shrink-0 ${user.mannerTemp >= 36.5 ? 'text-orange-500' : 'text-blue-500'}`} />
                        {Number(user.mannerTemp).toFixed(1)}°C
                      </span>
                      <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                      {/* 포인트 */}
                      <span title={`${user.points.toLocaleString()}P`} className="w-[96px] shrink-0 text-xs font-bold text-gray-600 truncate">
                        <BsCoin className="w-3.5 h-3.5 inline mr-0.5 text-yellow-500" />{user.points.toLocaleString()}P
                      </span>
                      <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                      {/* 경매수 */}
                      <span className="w-[56px] shrink-0 text-xs text-gray-500">경매 {user.postCount || 0}건</span>
                    </>
                  )}
                  <span className="text-gray-200 shrink-0 w-[20px] text-center text-sm">|</span>
                  {/* 가입일 */}
                  <span className="w-[96px] shrink-0 text-xs text-gray-400">가입 {user.joinedAt.split('T')[0]}</span>
                </div>
                {!user.isWithdrawn && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleOpenModal(user as any, 'manner')} className="p-1.5 hover:bg-orange-100 text-orange-600 rounded-none transition-colors" title="온도 조절">
                      <BsThermometerHalf className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleOpenModal(user as any, 'points')} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-none transition-colors" title="포인트 지급">
                      <BsCoin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => user.isSuspended ? toggleSuspension(user as any) : handleOpenModal(user as any, 'suspend')}
                      className={`p-1.5 rounded-none transition-colors ${user.isSuspended ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'}`}
                      title={user.isSuspended ? "정지 해제" : "계정 정지"}
                    >
                      {user.isSuspended ? <BsPersonCheck className="w-3.5 h-3.5" /> : <BsPersonX className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredAndSortedUsers.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="text-gray-400 font-bold text-sm">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredAndSortedUsers.length && (
          <div ref={loaderRef} className="py-6 text-center text-gray-400 text-xs font-bold">
            불러오는 중...
          </div>
        )}
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
              {modalType === 'manner' && '매너온도 조절'}
              {modalType === 'suspend' && '계정 정지 처리'}
              {modalType === 'points' && '포인트 증감/차감'}
            </h2>
            <p className="text-gray-500 text-sm font-medium mb-6">
              <span className="text-[#FF5A5A] font-bold">{selectedUser.nickname}</span> 회원님 처리
            </p>

            <div className="space-y-4 mb-6">
              {modalType === 'manner' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">새 매너온도 (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-lg"
                        value={mannerValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setMannerValue(val);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">변경 사유</label>
                      <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium text-sm resize-none h-24"
                        placeholder="온도 조절 사유를 입력하세요"
                        value={mannerReason}
                        onChange={(e) => setMannerReason(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Manner History Section */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BsThermometerHalf className="w-3 h-3 text-orange-500" />
                      매너온도 히스토리
                    </h3>
                    <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {mannerHistory.filter(h => h.userId === selectedUser.id).length > 0 ? (
                        mannerHistory
                          .filter(h => h.userId === selectedUser.id)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((history) => (
                            <div key={history.id} className="p-3 bg-gray-50 border border-gray-100 rounded-none space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400">{history.createdAt.split('T')[0]}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-gray-500">{history.previousTemp}°C</span>
                                  <span className="text-[10px] text-gray-300">→</span>
                                  <span className="text-[10px] font-bold text-[#FF5A5A]">{history.newTemp}°C</span>
                                </div>
                              </div>
                              <p className="text-[11px] font-medium text-gray-600 leading-relaxed">{history.reason}</p>
                            </div>
                          ))
                      ) : (
                        <div className="py-8 text-center bg-gray-50 border border-dashed border-gray-200">
                          <p className="text-[10px] font-bold text-gray-400">변경 이력이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {modalType === 'suspend' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">정지 기간 (일)</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-lg appearance-none"
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(parseInt(e.target.value))}
                    >
                      <option value={3}>3일</option>
                      <option value={7}>7일</option>
                      <option value={15}>15일</option>
                      <option value={30}>30일</option>
                      <option value={999}>영구 정지</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">정지 사유</label>
                    <textarea
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-medium text-sm resize-none h-24"
                      placeholder="정지 사유를 입력하세요"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {modalType === 'points' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">증감/차감 금액 (P)</label>
                  <input
                    type="number"
                    placeholder="예: 10000 또는 -5000"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-[#FF5A5A] font-bold text-lg"
                    value={pointAmount}
                    onChange={(e) => setPointAmount(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-none font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleAction}
                className="flex-1 py-3 rounded-none font-bold text-white bg-[#FF5A5A] hover:bg-[#E04848] transition-all shadow-lg shadow-red-500/20"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
