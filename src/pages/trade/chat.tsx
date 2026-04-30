import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BsSend, BsImage, BsGeoAltFill, BsBoxSeam, BsArrowRepeat, BsThreeDotsVertical, BsChat, BsArrowLeft, BsPersonCircle, BsPlusLg, BsExclamationCircle, BsLayoutTextSidebar, BsCalendarPlus, BsChevronLeft, BsChevronRight, BsCrosshair, BsBoxArrowRight, BsExclamationTriangle } from 'react-icons/bs';
import { ChatRoom, ChatMessage, MessageStatus } from '@/types';
import { format, subMonths, addMonths, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';
import api from '@/services/api';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { showToast } from '@/components/toastService';
import { formatMessagePreview, formatRelativeTime } from '@/utils/chatUtils';
import { ImageLightbox } from '@/components/ImageLightbox';

// ──── 상수 ────
const PAGE_SIZE = 20;
const MAX_CONTENT_LENGTH = 4000;
const RECONNECT_DELAY = 5000;
const SEND_TIMEOUT = 5000;

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchChats } = useAppContext();
  const memberNo = user ? getMemberNo(user) : null;

  // 채팅방 목록
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [filter, setFilter] = useState<'all' | 'seller' | 'buyer'>('all');

  // 메시지
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 라이트박스 (이미지 뷰어)
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // STOMP
  const stompClientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // UI refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  // 위치 공유 모달 상태
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [locationAddrRoad, setLocationAddrRoad] = useState('');
  const [locationAddrDetail, setLocationAddrDetail] = useState('');

  // 채팅방 나가기 모달 상태
  const [showLeaveRoomModal, setShowLeaveRoomModal] = useState(false);

  // 약속 잡기 모달 상태
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [apptSelectedDate, setApptSelectedDate] = useState<Date | null>(null);
  const [apptCalMonth, setApptCalMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [apptPeriod, setApptPeriod] = useState<'AM' | 'PM'>('PM');
  const [apptHour, setApptHour] = useState<number>(2);
  const [apptMinute, setApptMinute] = useState<number>(0);
  const [apptAddrRoad, setApptAddrRoad] = useState('');
  const [apptAddrDetail, setApptAddrDetail] = useState('');

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 중복 방지용 Set
  const receivedUuids = useRef(new Set<string>());
  // 전송 타임아웃 관리
  const sendTimeouts = useRef(new Map<string, NodeJS.Timeout>());
  // 이미지 input ref
  const imageInputRef = useRef<HTMLInputElement>(null);
  // 새 메시지 수신 후 DOM 반영 완료 시점에 스크롤하기 위한 플래그
  const shouldScrollToBottomRef = useRef(false);

  // ──── UUID 생성 (HTTPS 환경 여부 무관) ────
  const getUuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // ──── JWT 토큰 가져오기 ────
  const getToken = () => sessionStorage.getItem('java_token') || '';

  // ══════════════════════════════════════════════════
  // 1. 채팅방 목록 로드
  // ══════════════════════════════════════════════════
  const loadChatRooms = useCallback(async () => {
    if (!memberNo) return;
    try {
      const res = await api.get('/chat/rooms');
      const rooms: ChatRoom[] = (res.data || []).map((r: any) => ({
        id: `room_${r.roomNo}`,
        roomNo: r.roomNo,
        productId: String(r.productNo),
        productTitle: r.productTitle || '',
        productImage: r.productImage || '',
        tradeType: r.tradeType || '',
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
        productPrice: r.productPrice || r.currentPrice || 0,
        appointmentStatus: r.appointmentStatus ?? 0,
        appointmentAt: r.appointmentAt || null,
      }));
      const sortedRooms = rooms.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
      setChatRooms(sortedRooms);
    } catch (err) {
      console.error('[Chat] 채팅방 목록 로딩 실패', err);
    } finally {
      setIsRoomsLoading(false);
    }
  }, [memberNo]);

  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  // URL 쿼리 파라미터로 방 선택
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomNo = params.get('roomNo');
    if (roomNo && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.roomNo === Number(roomNo));
      if (room) setSelectedRoom(room);
    }
  }, [location.search, chatRooms]);

  // ══════════════════════════════════════════════════
  // 2. 메시지 로드 (커서 페이징)
  // ══════════════════════════════════════════════════
  const loadMessages = useCallback(async (roomNo: number, lastMsgNo?: number) => {
    try {
      const params: any = { size: PAGE_SIZE };
      if (lastMsgNo) params.lastMsgNo = lastMsgNo;
      const res = await api.get(`/chat/rooms/${roomNo}/messages`, { params });
      const msgs: ChatMessage[] = (res.data || []).map((m: any) => ({
        id: `msg_${m.msgNo}`,
        msgNo: m.msgNo,
        senderId: `user_${m.senderNo}`,
        senderNo: m.senderNo,
        content: m.content,
        createdAt: m.sentAt,
        isRead: m.isRead,
        status: 'SENT' as MessageStatus,
        msgType: m.msgType || 'TEXT',
        imageUrls: m.imageUrls || [],
        addrRoad: m.addrRoad,
        addrDetail: m.addrDetail,
        latitude: m.latitude,
        longitude: m.longitude,
      }));
      return msgs;
    } catch (err) {
      console.error('[Chat] 메시지 로딩 실패', err);
      return [];
    }
  }, []);

  // 방 선택 시 초기 메시지 로드 + 읽음 처리
  useEffect(() => {
    if (!selectedRoom) return;
    setMessages([]);
    setHasMore(true);
    receivedUuids.current.clear();
    // 채팅방 전환 시 입력창 초기화
    setNewMessage('');
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="메시지를 입력하세요..."]');
    if (ta) ta.style.height = 'auto';

    (async () => {
      const msgs = await loadMessages(selectedRoom.roomNo);
      setMessages(msgs);
      setHasMore(msgs.length >= PAGE_SIZE);
      scrollToBottom();
      // 읽음 처리
      try { await api.patch(`/chat/rooms/${selectedRoom.roomNo}/read`); }
      catch (e) { /* 무시 */ }
      // 목록에서 unreadCount 초기화
      setChatRooms(prev =>
        prev.map(r => r.roomNo === selectedRoom.roomNo ? { ...r, unreadCount: 0 } : r)
      );
    })();
  }, [selectedRoom?.roomNo, loadMessages]);

  // 무한 스크롤 — 맨 위 도달 시
  const handleScrollTop = useCallback(async () => {
    if (!selectedRoom || isLoadingMore || !hasMore || messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 50) return;

    setIsLoadingMore(true);
    const oldestMsgNo = messages[0]?.msgNo;
    if (!oldestMsgNo) { setIsLoadingMore(false); return; }

    const prevScrollHeight = container.scrollHeight;
    const olderMsgs = await loadMessages(selectedRoom.roomNo, oldestMsgNo);
    if (olderMsgs.length < PAGE_SIZE) setHasMore(false);

    setMessages(prev => [...olderMsgs, ...prev]);
    // 스크롤 위치 보존
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    });
    setIsLoadingMore(false);
  }, [selectedRoom, isLoadingMore, hasMore, messages, loadMessages]);

  // ══════════════════════════════════════════════════
  // 3. WebSocket STOMP 연결
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (!memberNo) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws-stomp'),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      reconnectDelay: RECONNECT_DELAY,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[STOMP] 연결 성공');
        setIsConnected(true);
      },
      onDisconnect: () => {
        console.log('[STOMP] 연결 해제');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        const msg = frame.headers['message'] || '';
        console.error('[STOMP] 에러', msg);
        // 인증 오류(토큰 만료 등)는 재연결해도 동일하게 실패 → 루프 방지
        if (msg.includes('JWT') || msg.includes('인증') || msg.includes('Authorization')) {
          client.deactivate();
        }
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [memberNo]);

  // 선택된 방 구독
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client || !client.connected || !selectedRoom) return;

    // 메시지 구독
    const msgSub = client.subscribe(
      `/sub/chat/room/${selectedRoom.roomNo}`,
      (msg: IMessage) => {
        const data = JSON.parse(msg.body);
        const clientUuid = data.clientUuid;

        // 내가 보낸 메시지의 서버 응답 — 낙관적 UI 업데이트
        if (clientUuid && receivedUuids.current.has(clientUuid)) {
          // 이미 처리된 uuid → 무시 (중복 수신 방지)
          return;
        }

        if (clientUuid) receivedUuids.current.add(clientUuid);

        // 서버에서 ERROR 응답이 오면 즉시 FAILED 처리
        if (data.msgType === 'ERROR') {
          console.error('[Chat] 서버 메시지 처리 오류:', data.content);
          const timeout = sendTimeouts.current.get(clientUuid!);
          if (timeout) { clearTimeout(timeout); sendTimeouts.current.delete(clientUuid!); }
          setMessages(prev => prev.map(m =>
            m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m
          ));
          showToast('메시지 전송에 실패했습니다. 잠시 후 재시도해주세요.', 'error');
          return;
        }

        setMessages(prev => {
          // clientUuid로 낙관적 메시지 찾기
          const optimisticIdx = prev.findIndex(
            m => m.clientUuid === clientUuid
          );

          if (optimisticIdx >= 0) {
            // 낙관적 메시지를 서버 확정 데이터로 교체
            const updated = [...prev];
            updated[optimisticIdx] = {
              ...updated[optimisticIdx],
              id: `msg_${data.msgNo}`,
              msgNo: data.msgNo,
              createdAt: data.sentAt,
              status: 'SENT',
            };
            // 타임아웃 정리
            const timeout = sendTimeouts.current.get(clientUuid!);
            if (timeout) {
              clearTimeout(timeout);
              sendTimeouts.current.delete(clientUuid!);
            }
            return updated;
          }

          // 상대방이 보낸 새 메시지
          const newMsg: ChatMessage = {
            id: `msg_${data.msgNo}`,
            msgNo: data.msgNo,
            senderId: `user_${data.senderNo}`,
            senderNo: data.senderNo,
            content: data.content,
            createdAt: data.sentAt,
            isRead: data.isRead,
            status: 'SENT',
            msgType: data.msgType || 'TEXT',
            imageUrls: data.imageUrls || [],
            addrRoad: data.addrRoad,
            addrDetail: data.addrDetail,
            latitude: data.latitude,
            longitude: data.longitude,
          };
          shouldScrollToBottomRef.current = true;
          return [...prev, newMsg];
        });

        // 상대방 APPOINTMENT 수신 시 방의 약속 상태 즉시 업데이트
        if (data.msgType === 'APPOINTMENT' && data.senderNo !== memberNo) {
          const newApptAt = data.apptAt ?? null;
          setChatRooms(prev =>
            prev.map(r => r.roomNo === selectedRoom.roomNo
              ? { ...r, appointmentStatus: 1, appointmentAt: newApptAt }
              : r)
          );
          setSelectedRoom(prev => prev ? { ...prev, appointmentStatus: 1, appointmentAt: newApptAt } : null);
        }

        // 상대방 메시지면 읽음 처리
        if (data.senderNo !== memberNo) {
          api.patch(`/chat/rooms/${selectedRoom.roomNo}/read`).catch(() => { });
        }
      }
    );

    // 읽음 이벤트 구독
    const readSub = client.subscribe(
      `/sub/chat/room/${selectedRoom.roomNo}/read`,
      (msg: IMessage) => {
        const data = JSON.parse(msg.body);
        if (data.readerNo !== memberNo) {
          // 상대방이 읽음 → 내 메시지들 isRead 업데이트
          setMessages(prev =>
            prev.map(m =>
              m.senderNo === memberNo && m.isRead === 0
                ? { ...m, isRead: 1 }
                : m
            )
          );
        }
      }
    );

    return () => {
      msgSub.unsubscribe();
      readSub.unsubscribe();
    };
  }, [selectedRoom?.roomNo, isConnected, memberNo]);

  // 재연결 시 누락 메시지 복구
  useEffect(() => {
    if (!isConnected || !selectedRoom || messages.length === 0) return;

    const maxMsgNo = Math.max(...messages.filter(m => m.msgNo).map(m => m.msgNo!), 0);
    if (maxMsgNo === 0) return;

    api.get(`/chat/rooms/${selectedRoom.roomNo}/messages/after`, {
      params: { afterMsgNo: maxMsgNo }
    }).then(res => {
      const missed: ChatMessage[] = (res.data || []).map((m: any) => ({
        id: `msg_${m.msgNo}`,
        msgNo: m.msgNo,
        senderId: `user_${m.senderNo}`,
        senderNo: m.senderNo,
        content: m.content,
        createdAt: m.sentAt,
        isRead: m.isRead,
        status: 'SENT' as MessageStatus,
        msgType: m.msgType || 'TEXT',
        imageUrls: m.imageUrls || [],
        addrRoad: m.addrRoad,
        addrDetail: m.addrDetail,
        latitude: m.latitude,
        longitude: m.longitude,
      }));
      if (missed.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.msgNo));
          const newOnes = missed.filter(m => !existingIds.has(m.msgNo));
          return [...prev, ...newOnes];
        });
        scrollToBottom();
      }
    }).catch(() => { });
  }, [isConnected]);

  // ══════════════════════════════════════════════════
  // 4. 이미지 업로드
  // ══════════════════════════════════════════════════
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedRoom) return;

    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (files.length > 4) {
      showToast('최대 4장까지 선택할 수 있습니다.', 'error');
      return;
    }

    let imageUrls: string[] = [];
    let clientUuid = '';

    try {
      // 1. REST로 여러 파일 일괄 업로드
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await api.post(
        `/chat/rooms/${selectedRoom.roomNo}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      imageUrls = res.data.urls;
    } catch (err) {
      console.error('이미지 업로드 실패', err);
      showToast('이미지 업로드에 실패했습니다.', 'error');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    clientUuid = getUuid();

    // 낙관적 UI — 이미지 메시지 즉시 표시
    const optimisticMsg: ChatMessage = {
      id: `temp_${clientUuid}`,
      senderId: `user_${memberNo}`,
      senderNo: memberNo!,
      content: '',
      createdAt: new Date().toISOString(),
      isRead: 0,
      clientUuid,
      status: 'SENDING',
      msgType: 'IMAGE',
      imageUrls,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    // 2. STOMP 연결 확인 후 전송
    const client = stompClientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({
          roomNo: selectedRoom.roomNo,
          senderNo: memberNo,
          content: imageUrls.length > 1 ? '사진들' : '사진',
          msgType: 'IMAGE',
          imageUrls,
          clientUuid,
        }),
      });

      const timeout = setTimeout(() => {
        setMessages(prev =>
          prev.map(m =>
            m.clientUuid === clientUuid && m.status === 'SENDING'
              ? { ...m, status: 'FAILED' }
              : m
          )
        );
        sendTimeouts.current.delete(clientUuid);
      }, SEND_TIMEOUT);
      sendTimeouts.current.set(clientUuid, timeout);

      setChatRooms(prev =>
        prev.map(r =>
          r.roomNo === selectedRoom.roomNo
            ? { ...r, lastMessage: imageUrls.length > 1 ? '사진들' : '사진', lastMessageAt: new Date().toISOString() }
            : r
        )
      );
    } else {
      showToast('채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.', 'error');
      setMessages(prev =>
        prev.map(m =>
          m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m
        )
      );
    }

    // input 초기화 (같은 파일 재선택 허용)
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ══════════════════════════════════════════════════
  // 4-1. 위치(배송지) 보내기 — 낙찰 결과에서 주소 불러와 ADDRESS 타입으로 전송
  // ══════════════════════════════════════════════════
  const handleSendAddress = async () => {
    setIsAttachmentMenuOpen(false);
    if (!selectedRoom || !memberNo) return;

    try {
      const res = await api.get(`/auction-results/product/${selectedRoom.productId}`);
      const addrRoad: string | null = res.data?.deliveryAddrRoad ?? null;
      const addrDetail: string | null = res.data?.deliveryAddrDetail ?? null;

      if (!addrRoad && !addrDetail) {
        showToast('낙찰 상세 페이지에서 배송지를 먼저 입력해주세요.', 'error');
        return;
      }

      const clientUuid = getUuid();
      const optimisticMsg: ChatMessage = {
        id: `temp_${clientUuid}`,
        senderId: `user_${memberNo}`,
        senderNo: memberNo,
        content: addrRoad || addrDetail || '',
        createdAt: new Date().toISOString(),
        isRead: 0,
        clientUuid,
        status: 'SENDING',
        msgType: 'ADDRESS',
        addrRoad: addrRoad ?? undefined,
        addrDetail: addrDetail ?? undefined,
      };
      setMessages(prev => [...prev, optimisticMsg]);
      scrollToBottom();

      const client = stompClientRef.current;
      if (client && client.connected) {
        client.publish({
          destination: '/pub/chat/message',
          body: JSON.stringify({
            roomNo: selectedRoom.roomNo,
            senderNo: memberNo,
            content: addrRoad || '',
            msgType: 'ADDRESS',
            addrRoad,
            addrDetail,
            clientUuid,
          }),
        });

        const timeout = setTimeout(() => {
          setMessages(prev =>
            prev.map(m =>
              m.clientUuid === clientUuid && m.status === 'SENDING'
                ? { ...m, status: 'FAILED' } : m
            )
          );
          sendTimeouts.current.delete(clientUuid);
        }, SEND_TIMEOUT);
        sendTimeouts.current.set(clientUuid, timeout);

        setChatRooms(prev =>
          prev.map(r =>
            r.roomNo === selectedRoom.roomNo
              ? { ...r, lastMessage: '배송지 공유', lastMessageAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        showToast('채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.', 'error');
        setMessages(prev =>
          prev.map(m =>
            m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m
          )
        );
      }
    } catch {
      showToast('배송지 정보를 불러올 수 없습니다.', 'error');
    }
  };

  // ══════════════════════════════════════════════════
  // 4-2. 판매자가 ADDRESS 카드의 [확인] 버튼 클릭 — 배송지 저장
  // ══════════════════════════════════════════════════
  const handleConfirmAddress = async (msg: ChatMessage) => {
    if (!selectedRoom || !memberNo) return;
    try {
      await api.patch(`/auction-results/seller/product/${selectedRoom.productId}/delivery-address`, {
        addrRoad: msg.addrRoad ?? null,
        addrDetail: msg.addrDetail ?? null,
      });
      showToast('배송지가 낙찰 관리 페이지에 저장되었습니다.', 'success');
    } catch {
      showToast('배송지 저장에 실패했습니다.', 'error');
    }
  };

  const handleApptPasteMyAddress = async () => {
    try {
      const res = await api.get('/members/me');
      if (res.data?.addrRoad) {
        setApptAddrRoad(res.data.addrRoad);
        showToast('내 주소를 불러왔습니다.', 'success');
      } else {
        showToast('등록된 주소가 없습니다. 프로필을 확인해주세요.', 'warning');
      }
    } catch {
      showToast('주소 정보를 불러오지 못했습니다.', 'error');
    }
  };

  // ══════════════════════════════════════════════════
  // 5. 메시지 전송 (낙관적 UI)
  // ══════════════════════════════════════════════════
  const handleBsSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !memberNo) return;
    if (newMessage.length > MAX_CONTENT_LENGTH) return;

    const clientUuid = getUuid();
    const content = newMessage.trim();
    setNewMessage('');
    // textarea 높이 초기화
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="메시지를 입력하세요..."]');
    if (ta) { ta.style.height = 'auto'; }

    // A) 낙관적 UI — 로컬에 즉시 표시
    const optimisticMsg: ChatMessage = {
      id: `temp_${clientUuid}`,
      senderId: `user_${memberNo}`,
      senderNo: memberNo,
      content,
      createdAt: new Date().toISOString(),
      isRead: 0,
      clientUuid,
      status: 'SENDING',
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    // B) STOMP 전송
    const client = stompClientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({
          roomNo: selectedRoom.roomNo,
          senderNo: memberNo,
          content,
          msgType: 'TEXT',
          clientUuid,
        }),
      });

      // C) 타임아웃 — 5초 내 서버 응답 없으면 FAILED
      const timeout = setTimeout(() => {
        setMessages(prev =>
          prev.map(m =>
            m.clientUuid === clientUuid && m.status === 'SENDING'
              ? { ...m, status: 'FAILED' }
              : m
          )
        );
        sendTimeouts.current.delete(clientUuid);
      }, SEND_TIMEOUT);
      sendTimeouts.current.set(clientUuid, timeout);

    } else {
      // WebSocket 미연결 → 즉시 FAILED
      showToast('채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.', 'error');
      setMessages(prev =>
        prev.map(m =>
          m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m
        )
      );
    }

    // 목록에서 최근 메시지 갱신
    setChatRooms(prev =>
      prev.map(r =>
        r.roomNo === selectedRoom.roomNo
          ? { ...r, lastMessage: content, lastMessageAt: new Date().toISOString() }
          : r
      )
    );
  };

  // 위치 공유 버튼 클릭 핸들러 (낙찰 페이지 주소 조회)
  const handleLocationClick = async () => {
    if (!selectedRoom) return;
    setIsAttachmentMenuOpen(false);
    setShowLocationModal(true);
    setIsAddressLoading(true);

    try {
      // 낙찰 결과(배송지 정보) 조회
      const res = await api.get(`/auction-results/product/${selectedRoom.productId}`);
      const data = res.data;
      if (data?.deliveryAddrRoad) {
        // 신규 분리 저장 포맷
        setLocationAddrRoad(data.deliveryAddrRoad);
        setLocationAddrDetail(data.deliveryAddrDetail || '');
        setLocationAddress(data.deliveryAddrRoad);
      } else if (data?.deliveryAddrDetail) {
        // 레거시: 통합 저장 포맷
        setLocationAddrRoad(data.deliveryAddrDetail);
        setLocationAddrDetail('');
        setLocationAddress(data.deliveryAddrDetail);
      } else {
        // 배송지 미등록 → 회원 기본 주소 사용
        try {
          const memberRes = await api.get('/members/me');
          setLocationAddrRoad(memberRes.data?.addrRoad || '');
          setLocationAddrDetail(memberRes.data?.addrDetail || '');
          setLocationAddress(memberRes.data?.addrRoad || '');
        } catch {
          setLocationAddrRoad('');
          setLocationAddrDetail('');
          setLocationAddress('');
        }
      }
    } catch (err) {
      console.error('[Chat] Failed to fetch winning address:', err);
      setLocationAddrRoad('');
      setLocationAddrDetail('');
      setLocationAddress('');
    } finally {
      setIsAddressLoading(false);
    }
  };

  // 위치 전송 실행
  const handleSendLocation = () => {
    if (!selectedRoom || !memberNo || !locationAddrRoad) {
      showToast('전송할 주소 정보가 없습니다.', 'error');
      return;
    }

    const clientUuid = getUuid();
    const content = `${locationAddrRoad} ${locationAddrDetail}`.trim();

    // 1. 낙관적 UI — ADDRESS 타입으로 카드 형태 표시
    const optimisticMsg: ChatMessage = {
      id: `temp_${clientUuid}`,
      senderId: `user_${memberNo}`,
      senderNo: memberNo!,
      content,
      createdAt: new Date().toISOString(),
      isRead: 0,
      clientUuid,
      status: 'SENDING',
      msgType: 'ADDRESS',
      addrRoad: locationAddrRoad,
      addrDetail: locationAddrDetail || undefined,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    // 2. STOMP 전송
    const client = stompClientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({
          roomNo: selectedRoom.roomNo,
          senderNo: memberNo,
          content,
          msgType: 'ADDRESS',
          addrRoad: locationAddrRoad,
          addrDetail: locationAddrDetail || null,
          clientUuid,
        }),
      });

      const timeout = setTimeout(() => {
        setMessages(prev =>
          prev.map(m =>
            m.clientUuid === clientUuid && m.status === 'SENDING'
              ? { ...m, status: 'FAILED' } : m
          )
        );
        sendTimeouts.current.delete(clientUuid);
      }, SEND_TIMEOUT);
      sendTimeouts.current.set(clientUuid, timeout);

      setChatRooms(prev =>
        prev.map(r =>
          r.roomNo === selectedRoom.roomNo
            ? { ...r, lastMessage: '배송지 공유', lastMessageAt: new Date().toISOString() }
            : r
        )
      );
    } else {
      showToast('채팅 서버와 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.', 'error');
      setMessages(prev =>
        prev.map(m =>
          m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m
        )
      );
    }

    setShowLocationModal(false);
  };

  // ══════════════════════════════════════════════════
  // 4-3. 약속 잡기
  // ══════════════════════════════════════════════════
  const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

  const openApptPostcode = () => {
    const daum = (window as any).daum;
    if (!daum?.Postcode) { showToast('주소 검색 서비스를 불러오는 중입니다.', 'error'); return; }
    new daum.Postcode({
      oncomplete: (data: any) => {
        setApptAddrRoad(data.roadAddress || data.jibunAddress || '');
      },
    }).open();
  };

  const handleSendAppointment = () => {
    if (!apptSelectedDate) { showToast('날짜를 선택해주세요.', 'error'); return; }
    if (!apptAddrRoad) { showToast('장소를 입력해주세요.', 'error'); return; }
    if (!selectedRoom || !memberNo) return;

    const combinedDate = new Date(apptSelectedDate);
    let hour = apptHour;
    if (apptPeriod === 'PM' && hour < 12) hour += 12;
    if (apptPeriod === 'AM' && hour === 12) hour = 0;
    combinedDate.setHours(hour, apptMinute, 0, 0);
    const apptAt = combinedDate.toISOString();

    const dateLabel = `${apptSelectedDate.getMonth() + 1}월 ${apptSelectedDate.getDate()}일 ${WEEKDAYS_KO[apptSelectedDate.getDay()]}요일`;
    const timeLabel = `${apptPeriod === 'AM' ? '오전' : '오후'} ${apptHour}:${String(apptMinute).padStart(2, '0')}`;
    const payload = { dateLabel, timeLabel, addrRoad: apptAddrRoad, addrDetail: apptAddrDetail };
    const content = JSON.stringify(payload);
    const clientUuid = getUuid();

    const optimisticMsg: ChatMessage = {
      id: `temp_${clientUuid}`,
      senderId: `user_${memberNo}`,
      senderNo: memberNo,
      content,
      createdAt: new Date().toISOString(),
      isRead: 0,
      clientUuid,
      status: 'SENDING',
      msgType: 'APPOINTMENT',
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    const client = stompClientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({ roomNo: selectedRoom.roomNo, senderNo: memberNo, content, msgType: 'APPOINTMENT', clientUuid, apptAt }),
      });
      const timeout = setTimeout(() => {
        setMessages(prev => prev.map(m => m.clientUuid === clientUuid && m.status === 'SENDING' ? { ...m, status: 'FAILED' } : m));
        sendTimeouts.current.delete(clientUuid);
      }, SEND_TIMEOUT);
      sendTimeouts.current.set(clientUuid, timeout);
      setChatRooms(prev =>
        prev.map(r => r.roomNo === selectedRoom.roomNo ? { ...r, lastMessage: `${dateLabel} ${timeLabel}`, lastMessageAt: new Date().toISOString(), appointmentStatus: 1, appointmentAt: apptAt } : r)
      );
      setSelectedRoom(prev => prev ? { ...prev, appointmentStatus: 1, appointmentAt: apptAt } : null);
    } else {
      showToast('채팅 서버와 연결이 끊어졌습니다.', 'error');
      setMessages(prev => prev.map(m => m.clientUuid === clientUuid ? { ...m, status: 'FAILED' } : m));
    }

    setShowAppointmentModal(false);
    // 모달 닫을 때 상태 초기화
    setApptSelectedDate(null);
    setApptAddrRoad('');
    setApptAddrDetail('');
  };

  // 전송 실패 메시지 삭제
  const handleDeleteFailed = (msg: ChatMessage) => {
    setMessages(prev => prev.filter(m => m.clientUuid !== msg.clientUuid));
  };

  // 재전송
  const handleRetry = (msg: ChatMessage) => {
    if (!msg.clientUuid || !selectedRoom || !memberNo) return;

    // FAILED → SENDING으로 변경
    setMessages(prev =>
      prev.map(m =>
        m.clientUuid === msg.clientUuid ? { ...m, status: 'SENDING' } : m
      )
    );

    const client = stompClientRef.current;
    if (client && client.connected) {
      client.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({
          roomNo: selectedRoom.roomNo,
          senderNo: memberNo,
          content: msg.content,
          msgType: msg.msgType || 'TEXT',
          clientUuid: msg.clientUuid,
        }),
      });

      const timeout = setTimeout(() => {
        setMessages(prev =>
          prev.map(m =>
            m.clientUuid === msg.clientUuid && m.status === 'SENDING'
              ? { ...m, status: 'FAILED' }
              : m
          )
        );
      }, SEND_TIMEOUT);
      sendTimeouts.current.set(msg.clientUuid, timeout);
    } else {
      setMessages(prev =>
        prev.map(m =>
          m.clientUuid === msg.clientUuid ? { ...m, status: 'FAILED' } : m
        )
      );
    }
  };

  // 채팅방 나가기
  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;
    try {
      await api.delete(`/chat/rooms/${selectedRoom.roomNo}`);
      setSelectedRoom(null);
      loadChatRooms();
      fetchChats(); // 전역 목록(헤더 알림 등) 동기화
      setShowLeaveRoomModal(false);
    } catch {
      showToast('채팅방 나가기에 실패했습니다.', 'error');
    }
  };

  // ══════════════════════════════════════════════════
  // 약속 만료 감지 — 약속 시간이 지나면 안내 메시지 + 토스트
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedRoom || selectedRoom.appointmentStatus !== 1 || !selectedRoom.appointmentAt) return;

    const apptTime = new Date(selectedRoom.appointmentAt).getTime();
    const msUntilExpiry = apptTime - Date.now();

    if (msUntilExpiry <= 0) return; // 이미 만료됨 (서버에서 0으로 내려왔을 것)

    const timer = setTimeout(() => {
      // 방 상태 로컬 업데이트
      setChatRooms(prev =>
        prev.map(r => r.roomNo === selectedRoom.roomNo ? { ...r, appointmentStatus: 0 } : r)
      );
      setSelectedRoom(prev => prev ? { ...prev, appointmentStatus: 0 } : null);

      // 채팅창 안내 메시지
      const sysMsg: ChatMessage = {
        id: `sys_appt_end_${Date.now()}`,
        senderId: 'system',
        senderNo: 0,
        content: '약속된 상품을 잘 받으셨나요?',
        createdAt: new Date().toISOString(),
        isRead: 1,
        status: 'SENT',
        msgType: 'SYSTEM',
      };
      setMessages(prev => [...prev, sysMsg]);
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      });

      // 토스트
      showToast('약속된 상품을 잘 받으셨나요?', 'info');
    }, msUntilExpiry);

    return () => clearTimeout(timer);
  }, [selectedRoom?.roomNo, selectedRoom?.appointmentAt, selectedRoom?.appointmentStatus]);

  // messages 상태가 DOM에 반영된 뒤 스크롤 (React가 커밋한 이후 실행)
  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    shouldScrollToBottomRef.current = false;
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // ──── 유틸 ────
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  const filteredRooms = chatRooms.filter(room => {
    if (filter === 'all') return true;
    return room.otherUser.role === filter;
  });



  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr), 'yyyy년 M월 d일', { locale: ko }); }
    catch { return ''; }
  };

  // 날짜 구분선 표시 여부
  const shouldShowDateDivider = (idx: number) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1].createdAt;
    const curr = messages[idx].createdAt;
    return formatDate(prev) !== formatDate(curr);
  };

  // ══════════════════════════════════════════════════
  // 렌더링
  // ══════════════════════════════════════════════════
  if (isRoomsLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-240px)] flex bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm my-4">
      {/* ──── Sidebar: 채팅방 목록 ──── */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-4">채팅</h2>
          {/* 필터 칩 */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { id: 'all', label: '전체' },
              { id: 'seller', label: '판매자' },
              { id: 'buyer', label: '구매자' }
            ] as const).map(chip => (
              <button key={chip.id} onClick={() => setFilter(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === chip.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>{chip.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <BsSend className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400">대화 내역이 없습니다.</p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <button key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  navigate(`/chat?roomNo=${room.roomNo}`, { replace: true });
                }}
                className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selectedRoom?.roomNo === room.roomNo ? 'bg-brand/10' : ''
                  }`}>
                <div className="relative flex-shrink-0">
                  {/* 메인: 상품 이미지 (rounded-xl 적용) */}
                  <img
                    src={room.productImage || '/images/default-product.png'}
                    alt={room.productTitle}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                  />

                  {/* 오버레이: 상대방 프로필 이미지 (오른쪽 하단 배치) */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
                    <img
                      src={room.otherUser.profileImage || '/images/default-profile.png'}
                      alt={room.otherUser.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>

                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900 truncate">
                      {room.otherUser.nickname}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                       {formatRelativeTime(room.lastMessageAt)}
                     </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate flex-1 ${room.unreadCount > 0 ? 'text-brand font-bold' : 'text-gray-500'}`}>
                      {formatMessagePreview(room.lastMessage)}
                    </p>
                    {room.appointmentStatus === 1 && (
                      <span className="flex-shrink-0 bg-brand text-white text-[10px] font-bold px-2 h-5 inline-flex items-center justify-center rounded-full">
                        약속중
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ──── 메시지 영역 ──── */}
      {selectedRoom ? (
        <>
          <div className="flex-1 flex flex-col min-w-0">
            {/* 헤더 */}
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
              <button onClick={() => setSelectedRoom(null)} className="md:hidden p-1 text-gray-600">
                <BsArrowLeft className="w-5 h-5" />
              </button>
              <img src={selectedRoom.productImage || '/images/default-product.png'}
                alt="" className="w-10 h-10 rounded-xl bg-gray-50 object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-gray-900 truncate">
                    {selectedRoom.productTitle}
                  </h4>
                  {selectedRoom.appointmentStatus === 1 && (
                    <span className="bg-brand text-white text-[10px] font-bold px-2 h-5 inline-flex items-center justify-center rounded-full whitespace-nowrap">
                      약속중
                    </span>
                  )}
                </div>
                <p className="text-xs text-black font-medium mt-0.5">
                  {(selectedRoom.productPrice || 0).toLocaleString()}원
                </p>
              </div>
              <div className="relative group" ref={menuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <BsThreeDotsVertical className="w-5 h-5" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                    <button
                      onClick={() => { navigate(`/seller/${selectedRoom.otherUser.no}`); setShowMoreMenu(false); }}
                      className="flex items-center justify-start px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors w-full text-left"
                    >
                      <BsPersonCircle className="w-4 h-4 mr-2.5" /> 프로필 보기
                    </button>
                    <button
                      onClick={() => { navigate(`/products/${selectedRoom.productId}`); setShowMoreMenu(false); }}
                      className="flex items-center justify-start px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors w-full text-left"
                    >
                      <BsBoxSeam className="w-4 h-4 mr-2.5" /> 상품 보기
                    </button>
                    <button
                      onClick={() => {
                        const targetUrl = selectedRoom.otherUser.role === 'seller'
                          ? `/won/${selectedRoom.productId}`
                          : `/seller-result/${selectedRoom.productId}`;
                        navigate(targetUrl);
                        setShowMoreMenu(false);
                      }}
                      className="flex items-center justify-start px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors w-full text-left"
                    >
                      <BsLayoutTextSidebar className="w-4 h-4 mr-2.5" /> 거래 정보 보기
                    </button>
                    <div className="border-t border-gray-50 mt-1 pt-1 flex justify-end px-4 pb-2">
                      <button
                        onClick={() => {
                          setShowLeaveRoomModal(true);
                          setShowMoreMenu(false);
                        }}
                        className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        채팅방 나가기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 메시지 목록 */}
            <div ref={messagesContainerRef} onScroll={handleScrollTop}
              className="flex-1 overflow-y-auto p-6 space-y-1 bg-gray-50/50">
              {/* 더 불러오기 로딩 */}
              {isLoadingMore && (
                <div className="flex justify-center py-2">
                  <div className="spinner-border w-5 h-5" />
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <div className="text-center text-xs text-gray-400 py-2">이전 메시지가 없습니다</div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.senderNo === memberNo;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

                // HH:mm 단위 시간 추출 (그룹화 기준)
                const getMsgMinute = (dateStr: string) => {
                  try { return format(new Date(dateStr), 'HH:mm'); }
                  catch { return ''; }
                };
                const currTime = getMsgMinute(msg.createdAt);

                // 그룹의 첫 번째 메시지인지 판단
                const isFirstInGroup = !prevMsg ||
                  prevMsg.senderNo !== msg.senderNo ||
                  getMsgMinute(prevMsg.createdAt) !== currTime ||
                  shouldShowDateDivider(idx) ||
                  prevMsg.msgType === 'SYSTEM';

                // 그룹의 마지막 메시지인지 판단
                const isLastInGroup = !nextMsg ||
                  nextMsg.senderNo !== msg.senderNo ||
                  getMsgMinute(nextMsg.createdAt) !== currTime ||
                  shouldShowDateDivider(idx + 1) ||
                  nextMsg.msgType === 'SYSTEM';

                return (
                  <React.Fragment key={msg.id}>
                    {/* 날짜 구분선 */}
                    {shouldShowDateDivider(idx) && (
                      <div className="flex items-center justify-center py-6">
                        <span className="inline-flex items-center justify-center bg-gray-100/80 backdrop-blur-sm text-gray-500 text-[10px] font-bold px-4 py-2 rounded-full border border-gray-100/50 shadow-sm leading-none">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* 시스템 메시지 (중앙 정렬) */}
                    {msg.msgType === 'SYSTEM' && (
                      <div className="flex justify-center w-full my-6 animate-in fade-in zoom-in duration-300">
                        <span className="inline-flex items-center justify-center bg-white/80 backdrop-blur-sm text-gray-500 text-[11px] font-bold px-5 py-2.5 rounded-full border border-gray-100 shadow-sm gap-2 leading-none">
                          <BsExclamationCircle className="w-3.5 h-3.5 text-blue-500" />
                          {msg.content}
                        </span>
                      </div>
                    )}

                    {msg.msgType !== 'SYSTEM' && (
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}>
                        {/* 상대방 프로필 표시 영역 */}
                        {!isMe && (
                          <div className="flex-shrink-0 w-8 mr-2 flex flex-col justify-start pt-1">
                            {isFirstInGroup && (
                              <img
                                src={selectedRoom.otherUser.profileImage || '/images/default-profile.png'}
                                alt=""
                                className="w-8 h-8 rounded-full border border-gray-100 object-cover shadow-sm bg-white"
                              />
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] min-w-0`}>
                          {/* 닉네임 표시 (상대방 첫 메시지인 경우) */}
                          {!isMe && isFirstInGroup && (
                            <span className="text-[11px] font-semibold text-gray-400 mb-1.5 ml-1">
                              {selectedRoom.otherUser.nickname}
                            </span>
                          )}

                          <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                              {/* ──── 메시지 콘텐츠 (msgType 분기) ──── */}
                              {msg.msgType === 'APPOINTMENT' ? (() => {
                                let appt: any = {};
                                try { appt = JSON.parse(msg.content); } catch { appt = { dateLabel: msg.content }; }
                                return (
                                  <div className={`rounded-3xl overflow-hidden border border-gray-200 shadow-sm w-[260px] bg-white ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                                    <div className="bg-[#FF5A5A] px-5 py-3.5 flex items-center justify-center gap-2">
                                      <span className="text-white text-xs font-semibold tracking-wide">약속 잡기</span>
                                    </div>
                                    <div className="p-5 space-y-4">
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">날짜</p>
                                        <p className="text-sm font-bold text-gray-900">{appt.dateLabel || '-'}</p>
                                      </div>
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">시간</p>
                                        <p className="text-sm font-bold text-gray-900">{appt.timeLabel || '-'}</p>
                                      </div>
                                      {appt.addrRoad && (
                                        <div className="pt-3 border-t border-gray-50 space-y-1.5">
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">장소</p>
                                          <div>
                                            <p className="text-sm font-bold text-gray-900 leading-snug">{appt.addrRoad}</p>
                                            {appt.addrDetail && <p className="text-sm text-gray-400 mt-1 font-medium">{appt.addrDetail}</p>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })() : msg.msgType === 'ADDRESS' ? (
                                <div className={`rounded-3xl overflow-hidden border border-gray-200 shadow-sm w-[260px] ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                                  <div className="p-5 bg-white">
                                    <div className="flex items-start gap-3 text-gray-800">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 mb-2">
                                          <BsGeoAltFill className="w-3 h-3 text-[#FF5A5A]" />
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">배송지</p>
                                        </div>
                                        <p className="text-sm font-bold leading-snug text-gray-900 break-words">
                                          {msg.addrRoad || msg.content || '주소 정보'}
                                        </p>
                                        {msg.addrDetail && (
                                          <p className="text-sm mt-1.5 break-words text-gray-500 font-medium">
                                            {msg.addrDetail}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {!isMe && selectedRoom.otherUser.role === 'buyer' && (
                                    <div className="border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmAddress(msg)}
                                        className="w-full py-3.5 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                                      >
                                        배송지 저장
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : msg.msgType === 'IMAGE' && msg.imageUrls && msg.imageUrls.length > 0 ? (
                                <div className={`grid gap-1 rounded-2xl overflow-hidden max-w-[240px] ${msg.status === 'SENDING' ? 'opacity-70' : ''} ${msg.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                  {msg.imageUrls.slice(0, 4).map((url, i) => (
                                    <div key={i} className="relative aspect-square">
                                      <img
                                        src={url}
                                        alt=""
                                        className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all"
                                        onClick={() => {
                                          setLightboxImages(msg.imageUrls!);
                                          setLightboxIndex(i);
                                          setIsLightboxOpen(true);
                                        }}
                                      />
                                      {i === 3 && msg.imageUrls!.length > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                                          +{msg.imageUrls!.length - 4}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : msg.msgType === 'LOCATION' ? (
                                <div className={`rounded-2xl overflow-hidden border shadow-sm max-w-[220px] ${isMe ? 'border-brand/40 shadow-brand/5' : 'border-gray-100'} ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                                  {msg.latitude && msg.longitude && (
                                    <a
                                      href={`https://map.kakao.com/link/map/${msg.addrRoad || '위치'},${msg.latitude},${msg.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${msg.latitude},${msg.longitude}&zoom=15&size=220x120&markers=color:red%7C${msg.latitude},${msg.longitude}&key=YOUR_KEY`}
                                        alt="지도"
                                        className="w-full h-24 object-cover bg-gray-100"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </a>
                                  )}
                                  <div className={`p-3 ${isMe ? 'bg-brand' : 'bg-white'}`}>
                                    <div className={`flex items-start gap-1.5 ${isMe ? 'text-white' : 'text-gray-800'}`}>
                                      <BsGeoAltFill className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs font-bold leading-snug">{msg.addrRoad || '위치 정보'}</p>
                                        {msg.addrDetail && (
                                          <p className={`text-[10px] mt-0.5 ${isMe ? 'text-white/60' : 'text-gray-500'}`}>{msg.addrDetail}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 px-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm break-words whitespace-pre-wrap min-w-0 ${isMe
                                  ? msg.status === 'FAILED' ? 'bg-red-50 text-red-800 rounded-tr-none border border-red-100' : 'bg-brand text-white rounded-tr-none'
                                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                  } ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                                  {msg.content}
                                </div>
                              )}
                            </div>

                            {/* 부가 정보 표시 (안읽음 + 전송상태 + 시간) */}
                            <div className={`flex flex-col items-center gap-1 mb-0.5 min-w-[24px] ${isMe ? 'items-end' : 'items-start'}`}>
                              {/* 안읽음 표시 (1) - 본인 메시지인 경우 상시 표시 */}
                              {isMe && msg.status === 'SENT' && msg.isRead === 0 && (
                                <span className="text-[9px] text-brand-light font-bold">1</span>
                              )}
                              
                              {/* 전송 중/실패 상태 */}
                              {isMe && msg.status === 'SENDING' && (
                                <div className="animate-spin w-2.5 h-2.5 border-2 border-gray-300 border-t-gray-500 rounded-full" />
                              )}
                              {isMe && msg.status === 'FAILED' && (
                                <span className="text-red-500">
                                  <BsExclamationCircle className="w-3 h-3" />
                                </span>
                              )}

                              {/* 시간 표시 (마지막 메시지인 경우에만) */}
                              {isLastInGroup && (
                                <span className="text-[8px] text-gray-400 font-normal whitespace-nowrap">
                                  {formatRelativeTime(msg.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* 전송 실패 재전송/삭제 버튼 */}
                          {isMe && msg.status === 'FAILED' && (
                            <div className="flex gap-1 mt-0.5">
                              <button
                                onClick={() => handleRetry(msg)}
                                className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-all"
                              >
                                재전송
                              </button>
                              <button
                                onClick={() => handleDeleteFailed(msg)}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-all"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleBsSendMessage} className="flex items-center gap-3">
                {/* 첨부 메뉴 버튼 */}
                <div className="relative" ref={attachmentMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={`p-3 rounded-2xl transition-all ${isConnected
                      ? 'text-gray-400 hover:text-brand hover:bg-brand/10'
                      : 'text-gray-200 cursor-not-allowed'
                      }`}
                  >
                    <BsPlusLg className={`w-5 h-5 transition-transform duration-200 ${isAttachmentMenuOpen ? 'rotate-45 text-orange-500' : ''}`} />
                  </button>

                  {isAttachmentMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-4 w-48 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            imageInputRef.current?.click();
                            setIsAttachmentMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-start gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-2xl transition-all group text-left"
                        >
                          <div className="p-2 bg-gray-100 rounded-xl text-gray-500 group-hover:bg-gray-200 transition-colors">
                            <BsImage className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold">사진 보내기</span>
                        </button>
                        {/* 위치 보내기 — 구매자이고 직거래 전용 상품이 아닐 때만 표시 */}
                        {selectedRoom.otherUser.role === 'seller' && selectedRoom.tradeType !== '직거래' && (
                          <button
                            type="button"
                            onClick={handleLocationClick}
                            className="w-full flex items-center justify-start gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-2xl transition-all group text-left"
                          >
                            <div className="p-2 bg-gray-100 rounded-xl text-gray-500 group-hover:bg-gray-200 transition-colors">
                              <BsGeoAltFill className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">위치 보내기</span>
                          </button>
                        )}
                        {/* 약속 잡기 */}
                        <button
                          type="button"
                          onClick={() => { setIsAttachmentMenuOpen(false); setShowAppointmentModal(true); }}
                          className="w-full flex items-center justify-start gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-2xl transition-all group text-left"
                        >
                          <div className="p-2 bg-gray-100 rounded-xl text-gray-500 group-hover:bg-gray-200 transition-colors">
                            <BsCalendarPlus className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold">약속 잡기</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                <div className="flex-1 relative">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent transition-all">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_CONTENT_LENGTH) setNewMessage(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 124)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim() && isConnected) {
                            handleBsSendMessage(e as any);
                          }
                        }
                      }}
                      placeholder="메시지를 입력하세요..."
                      maxLength={MAX_CONTENT_LENGTH}
                      rows={1}
                      className="w-full bg-transparent px-5 py-3 text-sm font-medium focus:outline-none resize-none overflow-y-auto leading-5 chat-input-scrollbar block"
                      style={{ maxHeight: '124px' }}
                    />
                  </div>
                  {newMessage.length > 3800 && (
                    <span className="absolute right-3 bottom-3 text-[10px] text-gray-400">
                      {newMessage.length}/{MAX_CONTENT_LENGTH}
                    </span>
                  )}
                </div>
                <button type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  className="p-3 bg-brand text-white rounded-2xl hover:bg-brand-dark transition-all disabled:opacity-50 disabled:hover:bg-brand shadow-lg shadow-brand/20">
                  <BsSend className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
            <BsChat className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">채팅을 시작해보세요</h3>
          <p className="text-sm text-gray-400 font-medium leading-relaxed">
            왼쪽 목록에서 대화 상대를 선택하거나<br />
            상품 상세 페이지에서 문의하기를 눌러보세요.
          </p>
        </div>
      )}

      {/* 위치 공유 확인 모달 */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLocationModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">이 주소가 확실하십니까?</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                입력된 배송지 정보가 정확한지 한 번 더 확인해 주세요.
              </p>
              
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 min-h-[100px] flex flex-col justify-center">
                {isAddressLoading ? (
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-2">
                        <BsGeoAltFill className="w-3 h-3 text-[#FF5A5A]" />
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">배송지</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 leading-snug break-words">
                        {locationAddrRoad || locationAddress || '등록된 주소가 없습니다.'}
                      </p>
                      {locationAddrDetail && (
                        <p className="text-sm text-gray-500 mt-1.5 break-words font-medium">{locationAddrDetail}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => navigate(`/won/${selectedRoom?.productId}`)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                >
                  변경하기
                </button>
                <button
                  onClick={handleSendLocation}
                  disabled={isAddressLoading || !locationAddrRoad}
                  className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-orange-100 text-sm disabled:opacity-50"
                >
                  보내기
                </button>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full mt-4 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 채팅방 나가기 확인 모달 */}
      {showLeaveRoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveRoomModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">채팅방을 나가시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                나가면 목록에서 삭제되지만 상대방은 계속 대화를 볼 수 있습니다.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLeaveRoomModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 약속 잡기 모달 */}
      {showAppointmentModal && (() => {
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">
              {/* 헤더 */}
              <div className="px-6 py-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900 text-left tracking-tight">약속 잡기</h3>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
                {/* ── 날짜 ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">날짜</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">

                    {/* 달력 헤더 (연/월 및 이동 버튼) */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {format(apptCalMonth, 'yyyy년 M월', { locale: ko })}
                      </h4>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setApptCalMonth(subMonths(apptCalMonth, 1))}
                          disabled={isSameMonth(apptCalMonth, new Date())}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <BsChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setApptCalMonth(addMonths(apptCalMonth, 1))}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100"
                        >
                          <BsChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* 요일 헤더 (일~토) */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                        <div key={day} className={`text-[12px] font-semibold text-center py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* 달력 날짜 그리드 */}
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const start = startOfWeek(startOfMonth(apptCalMonth));
                        const end = endOfWeek(endOfMonth(apptCalMonth));
                        const days = eachDayOfInterval({ start, end });

                        return days.map((day) => {
                          const isCurrentMonth = isSameMonth(day, apptCalMonth);
                          const isSelected = apptSelectedDate && isSameDay(day, apptSelectedDate);
                          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                          return (
                            <button
                              key={day.toString()}
                              type="button"
                              onClick={() => !isPast && setApptSelectedDate(day)}
                              disabled={isPast}
                              className={`
                                relative aspect-square flex items-center justify-center text-[11px] font-bold rounded-xl transition-all
                                ${!isCurrentMonth ? 'text-gray-200' : (isSelected ? 'text-white' : 'text-gray-700')}
                                ${isSelected ? 'bg-[#FF5A5A] shadow-lg shadow-red-100' : isCurrentMonth && !isPast ? 'hover:bg-white hover:shadow-sm' : ''}
                                ${isPast ? 'opacity-30 cursor-not-allowed' : ''}
                              `}
                            >
                              {format(day, 'd')}
                              {isToday(day) && !isSelected && (
                                <div className="absolute bottom-1 w-1 h-1 bg-[#FF5A5A] rounded-full" />
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  {apptSelectedDate && (
                    <p className="text-center text-xs font-bold text-[#FF5A5A] mt-3 animate-in fade-in slide-in-from-top-1">
                      {apptSelectedDate.getMonth() + 1}월 {apptSelectedDate.getDate()}일 {WEEKDAYS_KO[apptSelectedDate.getDay()]}요일 선택됨
                    </p>
                  )}
                </div>

                {/* ── 시간 ── */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">시간</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={apptHour}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1 && val <= 12) setApptHour(val);
                            else if (e.target.value === '') setApptHour(0);
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full h-[52px] bg-gray-50 border border-gray-100 rounded-2xl text-center text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#FF5A5A]/20 transition-all outline-none"
                        />
                      </div>
                      <span className="font-bold text-gray-300">:</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="10"
                          value={apptMinute}
                          onChange={e => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 59) setApptMinute(val);
                            else if (e.target.value === '') setApptMinute(0);
                          }}
                          onKeyDown={(e) => {
                            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full h-[52px] bg-gray-50 border border-gray-100 rounded-2xl text-center text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#FF5A5A]/20 transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-2xl shrink-0">
                      {(['AM', 'PM'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setApptPeriod(p)}
                          className={`px-4 h-[44px] rounded-xl text-xs font-semibold transition-all ${apptPeriod === p ? 'bg-white text-[#FF5A5A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {p === 'AM' ? '오전' : '오후'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-xs font-bold text-[#FF5A5A] pt-1">
                    {apptPeriod === 'AM' ? '오전' : '오후'} {apptHour}시 {String(apptMinute).padStart(2, '0')}분
                  </p>
                </div>

                {/* ── 장소 ── */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block px-1">장소</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={openApptPostcode}
                      className="flex-1 flex items-center justify-start gap-2 px-5 h-[56px] bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-white hover:ring-2 hover:ring-[#FF5A5A]/20 transition-all text-left overflow-hidden"
                    >
                      <BsGeoAltFill className="w-4 h-4 text-[#FF5A5A] flex-shrink-0" />
                      <span className="truncate">{apptAddrRoad || '주소 검색'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApptPasteMyAddress}
                      className="p-2.5 text-gray-400 hover:text-[#FF5A5A] transition-all flex items-center justify-center shrink-0"
                      title="내 주소 불러오기"
                    >
                      <BsCrosshair className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={apptAddrDetail}
                    onChange={e => setApptAddrDetail(e.target.value)}
                    placeholder="상세 주소 (동/호수 등)"
                    className="w-full px-5 h-[56px] bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="px-6 py-5 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAppointmentModal(false); setApptSelectedDate(null); setApptAddrRoad(''); setApptAddrDetail(''); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSendAppointment}
                  disabled={!apptSelectedDate || !apptAddrRoad}
                  className="flex-1 py-4 bg-[#FF5A5A] text-white rounded-2xl text-sm font-bold hover:bg-[#E54D4D] transition-all shadow-lg shadow-[#FF5A5A]/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* 라이트박스 */}
      {isLightboxOpen && (
        <ImageLightbox
          urls={lightboxImages}
          index={lightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
          onNav={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
};