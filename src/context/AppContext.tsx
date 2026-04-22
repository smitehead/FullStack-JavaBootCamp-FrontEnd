import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Category, Notification, ChatRoom, User, Product, Account, WithdrawnUser, NotificationType, Report, MannerHistory, ActivityLog } from '@/types';
import api from '@/services/api';
import { resolveImageUrl } from '@/utils/imageUtils';
import { getMemberNo } from '@/utils/memberUtils';
import { showToast } from '@/components/toastService';

// ── API 응답 → 프론트 타입 변환 헬퍼 ──

const extractMemberNo = (userId: string): number =>
  parseInt(userId.replace(/\D/g, ''), 10);

const mapMemberToUser = (m: any): User => ({
  id: `user_${m.memberNo}`,
  nickname: m.nickname,
  profileImage: resolveImageUrl(m.profileImgUrl) || '',
  points: m.points || 0,
  mannerTemp: m.mannerTemp || 36.5,
  joinedAt: m.joinedAt,
  email: m.email,
  phoneNum: m.phoneNum,
  isActive: m.isActive === 1,
  isAdmin: m.isAdmin === 1,
  isSuspended: m.isSuspended === 1,
  suspensionEndDate: m.suspendUntil,
  suspensionReason: m.suspendReason,
  isPermanentlySuspended: m.isPermanentSuspended === 1,
  postCount: m.postCount ?? 0,
});

const mapReportToFrontend = (r: any): Report => ({
  id: `rep_${r.reportNo}`,
  reporterId: `user_${r.reporterNo}`,
  targetId: r.targetMemberNo ? `user_${r.targetMemberNo}` : `prod_${r.targetProductNo}`,
  targetType: r.targetMemberNo ? 'user' as const : 'product' as const,
  reason: r.type,
  details: r.content || '',
  status: r.status === '접수' ? 'pending' as const : 'resolved' as const,
  createdAt: r.createdAt,
});

const mapMannerHistoryToFrontend = (h: any): MannerHistory => ({
  id: `mh_${h.historyNo}`,
  userId: `user_${h.memberNo}`,
  userNickname: h.memberNickname || '',
  previousTemp: h.previousTemp,
  newTemp: h.newTemp,
  reason: h.reason,
  adminId: h.adminNo ? `user_${h.adminNo}` : '',
  createdAt: h.createdAt,
});

const mapAdminProductToFrontend = (p: any): Product => ({
  id: `prod_${p.productNo}`,
  title: p.title,
  description: '',
  category: Category.ETC,
  seller: {
    id: `user_${p.sellerNo}`,
    nickname: p.sellerNickname,
    profileImage: '',
    points: 0,
    mannerTemp: 36.5,
    joinedAt: '',
    email: '',
    isActive: true,
  },
  startPrice: p.startPrice,
  currentPrice: p.currentPrice,
  minBidIncrement: 0,
  startTime: '',
  endTime: p.endTime,
  images: p.mainImageUrl ? [p.mainImageUrl] : [],
  participantCount: p.participantCount || 0,
  bids: [],
  status: p.status === 0 ? 'active' as const : p.status === 1 ? 'completed' as const : 'canceled' as const,
  location: '',
  transactionMethod: 'both' as const,
});

const mapActivityLogToFrontend = (log: any): ActivityLog => ({
  id: `log_${log.logNo}`,
  adminId: `user_${log.adminNo}`,
  adminNickname: log.adminNickname || '',
  action: log.action,
  targetId: log.targetId ? `user_${log.targetId}` : undefined,
  targetType: log.targetType as ActivityLog['targetType'],
  details: log.details,
  createdAt: log.createdAt,
});

interface AppContextType {
  isInitialized: boolean;
  isAdminLoading: boolean;
  user: User | null;
  users: User[];
  products: Product[];
  notifications: Notification[];
  chats: ChatRoom[];
  withdrawnUsers: WithdrawnUser[];
  reports: Report[];
  mannerHistory: MannerHistory[];
  activityLogs: ActivityLog[];
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
  forceLogoutModalOpen: boolean;
  closeForceLogoutModal: () => void;
  suspendUser: (userId: string, days: number, reason: string) => void;
  unsuspendUser: (userId: string) => void;
  addProduct: (newProduct: Product) => void;
  cancelAuction: (productId: string, reason: string) => void;
  resolveReport: (reportId: string, action: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  markChatAsRead: (id: string) => void;
  addNotification: (message: string, link: string, type?: NotificationType) => void;
  updateUserRole: (userId: string, isAdmin: boolean) => void;
  updateUserManner: (userId: string, mannerTemp: number, reason: string) => void;
  updateUserPoints: (userId: string, points: number) => void;
  updateCurrentUserPoints: (points: number) => void;
  updateCurrentUserProfileImage: (profileImageUrl: string) => void;
  updateCurrentUserAddress: (address: string) => void;
  registerAccount: (account: Account) => Promise<void>;
  sendAdminMessage: (userId: string, content: string) => void;
  toggleMaintenanceMode: (enabled: boolean, message?: string) => void;
  unreadNotificationsCount: number;
  unreadChatsCount: number;
  refreshActivityLogs: () => Promise<void>;
  fetchChats: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [mannerHistory, setMannerHistory] = useState<MannerHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [forceLogoutModalOpen, setForceLogoutModalOpen] = useState(false);
  const [withdrawnUsers, setWithdrawnUsers] = useState<WithdrawnUser[]>([
    {
      id: 'w1',
      nickname: '탈퇴회원1',
      email: 'user1@example.com',
      reason: '서비스 불만족',
      details: 'UI가 너무 복잡해요.',
      withdrawnAt: '2024-03-20T10:00:00Z'
    },
    {
      id: 'w2',
      nickname: '탈퇴왕',
      email: 'king@example.com',
      reason: '타 서비스 이용',
      details: '다른 경매 앱이 더 편해요.',
      withdrawnAt: '2024-03-21T15:30:00Z'
    }
  ]);

  // 채팅방 초기 렌더링 시 새 채팅 알람 방지용 ref
  const previousUnreadChatsCount = React.useRef(0);
  const isFirstChatFetch = React.useRef(true);

  // 채팅 목록 API 로드
  const fetchChats = useCallback(async () => {
    try {
      const res = await api.get('/chat/rooms');
      const mapped: ChatRoom[] = (res.data || []).map((r: any) => ({
        id: `room_${r.roomNo}`,
        roomNo: r.roomNo,
        productId: String(r.productNo),
        productTitle: r.productTitle || '',
        productImage: r.productImage || '',
        otherUser: {
          id: `user_${r.otherUserNo}`,
          no: r.otherUserNo,
          nickname: r.otherUserNickname || '상대방',
          profileImage: r.otherUserProfileImage || '',
          role: r.otherUserRole || 'seller',
        },
        lastMessage: r.lastMessage || '',
        lastMessageAt: r.lastMessageAt || '',
        unreadCount: r.unreadCount || 0,
      }));
      
      const currentUnread = mapped.reduce((sum, r) => sum + r.unreadCount, 0);
      
      if (!isFirstChatFetch.current && currentUnread > previousUnreadChatsCount.current) {
        showToast('새로운 채팅 메시지가 도착했습니다.', 'success');
      }
      
      previousUnreadChatsCount.current = currentUnread;
      isFirstChatFetch.current = false;
      
      setChats(mapped);
    } catch (err) {
      console.error('[Chat] 목록 로딩 실패:', err);
    }
  }, []);

  // 알림 목록 API 로드
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const mapped: Notification[] = (res.data || []).map((n: any) => ({
        id: String(n.notiNo),
        message: n.content,
        read: n.isRead === 1,
        link: n.linkUrl || '/',
        createdAt: n.createdAt,
        type: n.type as NotificationType,
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error('[알림] 목록 로딩 실패:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchChats();
    } else {
      setNotifications([]);
      setChats([]);
      isFirstChatFetch.current = true;
      previousUnreadChatsCount.current = 0;
    }
  }, [user?.id, fetchNotifications, fetchChats]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications();
      fetchChats();
    }, 10000); // Poll every 10 seconds for real-time feel
    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications, fetchChats]);

  // 전역 SSE 구독 - 로그인한 사용자의 포인트/알림 실시간 업데이트
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('java_token');
    if (!token) return;

    const memberNo = extractMemberNo(user.id);
    const eventSource = new EventSource(`/api/sse/subscribe?token=${encodeURIComponent(token)}`);

    // 최초 연결 및 재연결 감지 — 재연결 시 누락 이벤트를 보정하기 위해 window 이벤트 발행
    let isFirstConnect = true;
    eventSource.addEventListener('connect', () => {
      if (isFirstConnect) {
        isFirstConnect = false;
        return; // 최초 연결은 무시 (컴포넌트가 마운트 시 이미 fetch)
      }
      window.dispatchEvent(new CustomEvent('sse:reconnected'));
    });

    eventSource.addEventListener('pointUpdate', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data.points === 'number') {
          // [방어] 백엔드가 payload에 memberNo를 포함하는 경우 2차 검증
          // SSE 연결 자체가 memberNo 기반 1:1이므로 정상 케이스에서는 항상 일치하지만,
          // localStorage 공유 등 예외 상황의 크로스토크를 최종 차단한다.
          if (data.memberNo !== undefined && data.memberNo !== memberNo) {
            console.warn('[SSE] pointUpdate memberNo 불일치 — 무시함', { expected: memberNo, received: data.memberNo });
            return;
          }
          setUser(prev => {
            if (!prev) return prev;
            if (prev.points === data.points) return prev;
            const updated = { ...prev, points: data.points };
            localStorage.setItem('java_user', JSON.stringify(updated));
            return updated;
          });
          // ProductDetail 등 다른 컴포넌트에서 포인트 변동을 감지할 수 있도록 window event 발행
          window.dispatchEvent(new CustomEvent('sse:pointUpdate', { detail: data }));
        }
      } catch (e) {
        console.error('[SSE] pointUpdate 파싱 오류', e);
      }
    });

    // 입찰가 실시간 브로드캐스트 — ProductDetail에 전달하기 위해 window event 발행
    eventSource.addEventListener('priceUpdate', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sse:priceUpdate', { detail: data }));
      } catch (e) {
        console.error('[SSE] priceUpdate 파싱 오류', e);
      }
    });

    // 실시간 알림 수신
    eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.notiNo) {
          const newNoti: Notification = {
            id: String(data.notiNo),
            message: data.content,
            read: false,
            link: data.linkUrl || '/',
            createdAt: data.createdAt,
            type: data.type as NotificationType,
          };
          // 즉시 state 반영 → 빨간점 바로 활성화
          setNotifications(prev => {
            if (prev.some(n => n.id === newNoti.id)) return prev;
            return [newNoti, ...prev];
          });
          // 다른 컴포넌트(MyPage 등)에서 실시간 반응할 수 있도록 window event 발행
          window.dispatchEvent(new CustomEvent('sse:notification', { detail: newNoti }));
        }
      } catch (e) {
        console.error('[SSE] notification 파싱 오류', e);
      }
    });

    // 판매자 경매 취소 브로드캐스트 → ProductDetail에 전달
    eventSource.addEventListener('auctionCancelled', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sse:auctionCancelled', { detail: data }));
      } catch (e) {
        console.error('[SSE] auctionCancelled 파싱 오류', e);
      }
    });

    // 다른 기기에서 로그인 시 즉시 강제 로그아웃 처리
    eventSource.addEventListener('forceLogout', () => {
      eventSource.close();
      localStorage.removeItem('java_token');
      localStorage.removeItem('java_user');
      setUser(null);
      setForceLogoutModalOpen(true);
    });

    eventSource.onerror = (err) => {
      console.error(`[SSE] 연결 오류 (memberNo: ${memberNo})`, err);
      // close() 미호출 - EventSource 스펙상 오류 시 자동 재연결됨
    };

    return () => {
      eventSource.close();
    };
  }, [user?.id]); // 사용자 ID가 바뀔 때(로그인/로그아웃) 재연결

  // 앱 시작 시 localStorage에 저장된 로그인 정보 복원 (탭별 격리)
  useEffect(() => {
    const savedUser = localStorage.getItem('java_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      const memberNo = parseInt(parsedUser.id.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(memberNo)) {
        api.get(`/members/${memberNo}`).then(res => {
          if (res.data) {
            setUser(prev => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                points: res.data.points || 0,
                mannerTemp: res.data.mannerTemp || 36.5,
                profileImage: resolveImageUrl(res.data.profileImgUrl) || prev.profileImage,
              };
              localStorage.setItem('java_user', JSON.stringify(updated));
              return updated;
            });
          }
        }).catch(err => console.error("사용자 데이터 동기화 실패", err))
          .finally(() => setIsInitialized(true));
        return;
      }
    }
    setIsInitialized(true);
  }, []);

  const login = async (userId: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/login', { userId, password });
      const { token, memberNo, nickname, addrShort } = response.data;

      localStorage.setItem('java_token', token);

      let dbPoints = 0;
      let dbMannerTemp = 36.5;
      let dbIsAdmin = false;
      let dbProfileImage = '';
      let dbJoinedAt = new Date().toISOString();
      try {
        const memberRes = await api.get(`/members/${memberNo}`);
        dbPoints = memberRes.data.points || 0;
        dbMannerTemp = memberRes.data.mannerTemp || 36.5;
        dbIsAdmin = memberRes.data.isAdmin === 1;
        dbProfileImage = resolveImageUrl(memberRes.data.profileImgUrl) || '';
        if (memberRes.data.joinedAt) {
          dbJoinedAt = memberRes.data.joinedAt;
        }
      } catch (err) {
        console.error("로그인 중 회원 정보 조회 실패", err);
      }

      const loggedInUser: User = {
        id: `user_${memberNo}`,
        nickname: nickname || userId,
        profileImage: dbProfileImage,
        points: dbPoints,
        mannerTemp: dbMannerTemp,
        joinedAt: dbJoinedAt,
        isAdmin: dbIsAdmin,
        address: addrShort || '',
      };

      setUser(loggedInUser);
      localStorage.setItem('java_user', JSON.stringify(loggedInUser));
      return true;
    } catch (error) {
      console.error('로그인 실패', error);
      return false;
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(console.error);
    setUser(null);
    localStorage.removeItem('java_user');
    localStorage.removeItem('java_token');
  };

  const closeForceLogoutModal = () => setForceLogoutModalOpen(false);

  // api.ts의 401 인터셉터에서 발생시키는 커스텀 이벤트 처리 (SSE 미연결 상태 백업)
  useEffect(() => {
    const handleForceLogout = () => {
      localStorage.removeItem('java_token');
      localStorage.removeItem('java_user');
      setUser(null);
      setForceLogoutModalOpen(true);
    };
    window.addEventListener('forceLogout', handleForceLogout);
    return () => window.removeEventListener('forceLogout', handleForceLogout);
  }, []);

  // ── 관리자 데이터 API 로딩 ──

  const fetchAdminData = useCallback(async () => {
    setIsAdminLoading(true);
    try {
      const [membersRes, reportsRes, historyRes, logsRes, productsRes] = await Promise.all([
        api.get('/admin/members'),
        api.get('/admin/reports'),
        api.get('/admin/members/manner-history'),
        api.get('/admin/activity-logs'),
        api.get('/admin/products'),
      ]);
      setUsers(membersRes.data.map(mapMemberToUser));
      setReports(reportsRes.data.map(mapReportToFrontend));
      setMannerHistory(historyRes.data.map(mapMannerHistoryToFrontend));
      setActivityLogs(logsRes.data.map(mapActivityLogToFrontend));
      setProducts(productsRes.data.map(mapAdminProductToFrontend));
    } catch (err) {
      console.error('[Admin] 데이터 로딩 실패:', err);
    } finally {
      setIsAdminLoading(false);
    }
  }, []);

  // 관리자 로그인 시 실제 데이터 로딩
  useEffect(() => {
    if (user?.isAdmin) {
      fetchAdminData();
    }
  }, [user?.isAdmin, fetchAdminData]);

  const refreshActivityLogs = useCallback(async () => {
    try {
      const res = await api.get('/admin/activity-logs');
      setActivityLogs(res.data.map(mapActivityLogToFrontend));
    } catch (err) {
      console.error('[Admin] 활동 로그 새로고침 실패:', err);
    }
  }, []);

  const suspendUser = async (userId: string, days: number, reason: string) => {
    const memberNo = extractMemberNo(userId);
    try {
      await api.put(`/admin/members/${memberNo}/suspend`, {
        suspendDays: days,
        suspendReason: reason,
      });
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('정지 처리 실패:', err);
      showToast('정지 처리에 실패했습니다.', 'error');
    }
  };

  const unsuspendUser = async (userId: string) => {
    const memberNo = extractMemberNo(userId);
    try {
      await api.put(`/admin/members/${memberNo}/unsuspend`);
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('정지 해제 실패:', err);
      showToast('정지 해제에 실패했습니다.', 'error');
    }
  };

  const addProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const cancelAuction = async (productId: string, reason: string) => {
    const productNo = parseInt(productId.replace(/\D/g, ''), 10);
    try {
      await api.put(`/admin/products/${productNo}/cancel`);
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('경매 강제 종료 실패:', err);
      showToast('경매 강제 종료에 실패했습니다.', 'error');
    }
  };

  const resolveReport = async (reportId: string, action: string) => {
    const reportNo = parseInt(reportId.replace(/\D/g, ''), 10);
    try {
      await api.put(`/admin/reports/${reportNo}/resolve`, {
        status: '완료',
        penaltyMsg: action,
      });
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('신고 처리 실패:', err);
      showToast('신고 처리에 실패했습니다.', 'error');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(noti => noti.id === id ? { ...noti, read: true } : noti)
    );
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error('[알림] 읽음 처리 실패:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('[알림] 전체 읽음 처리 실패:', err);
    }
  };

  const markChatAsRead = (id: string) => {
    setChats(prev =>
      prev.map(chat => chat.id === id ? { ...chat, unreadCount: 0 } : chat)
    );
  };

  const addNotification = (message: string, link: string, type: NotificationType = 'activity') => {
    const newNoti: Notification = {
      id: `n_${Date.now()}`,
      message,
      link,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNoti, ...prev]);
  };

  const updateUserRole = async (userId: string, isAdmin: boolean) => {
    const memberNo = extractMemberNo(userId);
    try {
      await api.put(`/admin/members/${memberNo}/role`, { isAdmin: isAdmin ? 1 : 0 });
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('권한 변경 실패:', err);
      showToast('권한 변경에 실패했습니다.', 'error');
    }
  };

  const updateUserManner = async (userId: string, mannerTemp: number, reason: string) => {
    const memberNo = extractMemberNo(userId);
    try {
      await api.put(`/admin/members/${memberNo}/manner-temp`, {
        newTemp: mannerTemp,
        reason,
      });
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('매너온도 변경 실패:', err);
      showToast('매너온도 변경에 실패했습니다.', 'error');
    }
  };

  const updateUserPoints = async (userId: string, points: number) => {
    const memberNo = extractMemberNo(userId);
    try {
      await api.put(`/admin/members/${memberNo}/points`, { pointAmount: points });
      await fetchAdminData();
      await refreshActivityLogs();
    } catch (err) {
      console.error('포인트 변경 실패:', err);
      showToast('포인트 변경에 실패했습니다.', 'error');
    }
  };

  const sendAdminMessage = (_userId: string, _content: string) => {
    console.warn('[sendAdminMessage] 백엔드 미구현 기능');
  };

  const toggleMaintenanceMode = (_enabled: boolean, _message?: string) => {
    console.warn('[toggleMaintenanceMode] 백엔드 미구현 기능');
  };

  const updateCurrentUserPoints = (points: number) => {
    if (user) {
      const updated = { ...user, points };
      setUser(updated);
      localStorage.setItem('java_user', JSON.stringify(updated));
    }
  };

  const updateCurrentUserProfileImage = (profileImageUrl: string) => {
    if (user) {
      const updated = { ...user, profileImage: profileImageUrl };
      setUser(updated);
      localStorage.setItem('java_user', JSON.stringify(updated));
    }
  };

  const updateCurrentUserAddress = (address: string) => {
    if (user) {
      const updated = { ...user, address };
      setUser(updated);
      localStorage.setItem('java_user', JSON.stringify(updated));
    }
  };

  const registerAccount = async (account: Account) => {
    try {
      await api.post('/points/accounts', account);
      // 로컬 user 객체에도 최신 계좌 정보를 업데이트 (선택 사항이나 UI 편의상 추가)
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, account };
        localStorage.setItem('java_user', JSON.stringify(updated));
        return updated;
      });
      showToast('계좌가 성공적으로 등록되었습니다.', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || '계좌 등록에 실패했습니다.';
      showToast(msg, 'error');
      throw err;
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const unreadChatsCount = chats.filter(c => c.unreadCount > 0).length;

  return (
    <AppContext.Provider value={{
      isInitialized,
      isAdminLoading,
      user,
      users,
      products,
      notifications,
      chats,
      withdrawnUsers,
      reports,
      mannerHistory,
      activityLogs,
      login,
      logout,
      forceLogoutModalOpen,
      closeForceLogoutModal,
      suspendUser,
      unsuspendUser,
      addProduct,
      cancelAuction,
      resolveReport,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      markChatAsRead,
      addNotification,
      updateUserRole,
      updateUserManner,
      updateUserPoints,
      updateCurrentUserPoints,
      updateCurrentUserProfileImage,
      updateCurrentUserAddress,
      registerAccount,
      sendAdminMessage,
      toggleMaintenanceMode,
      unreadNotificationsCount,
      unreadChatsCount,
      refreshActivityLogs,
      fetchChats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext는 AppProvider 내에서 사용해야 합니다.');
  }
  return context;
};
