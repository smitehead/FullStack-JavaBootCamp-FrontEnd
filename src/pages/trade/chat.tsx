import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BsSend, BsImage, BsCartCheck, BsArrowRepeat, BsThreeDotsVertical, BsChat, BsArrowLeft, BsGeoAlt, BsPersonSquare, BsDoorOpen } from 'react-icons/bs';
import { BsExclamationCircle } from 'react-icons/bs';
import { ChatRoom, ChatMessage, MessageStatus } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';
import api from '@/services/api';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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

  // STOMP
  const stompClientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // UI refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 중복 방지용 Set
  const receivedUuids = useRef(new Set<string>());
  // 전송 타임아웃 관리
  const sendTimeouts = useRef(new Map<string, NodeJS.Timeout>());
  // 이미지 input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

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
  const getToken = () => localStorage.getItem('java_token') || '';

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
      setChatRooms(rooms);
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
        console.error('[STOMP] 에러', frame.headers.message);
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
          return [...prev, newMsg];
        });

        scrollToBottom();

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
    if (files.length > 10) {
      alert('최대 10장까지 선택할 수 있습니다.');
      return;
    }

    try {
      // 1. REST로 여러 파일 일괄 업로드
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await api.post(
        `/chat/rooms/${selectedRoom.roomNo}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const imageUrls: string[] = res.data.urls;

      const clientUuid = getUuid();

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

      // 2. STOMP로 묶어서 전송 (메시지 1건)
      stompClientRef.current?.publish({
        destination: '/pub/chat/message',
        body: JSON.stringify({
          roomId: selectedRoom.roomNo,
          senderId: memberNo,
          content: '',
          msgType: 'IMAGE',
          imageUrls,
          clientUuid,
        }),
      });

      // 타임아웃
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
            ? { ...r, lastMessage: '📷 사진', lastMessageAt: new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      console.error('이미지 전송 실패', err);
      alert('이미지 업로드에 실패했습니다.');
    }

    // input 초기화 (같은 파일 재선택 허용)
    if (imageInputRef.current) imageInputRef.current.value = '';
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
          roomId: selectedRoom.roomNo,
          senderId: memberNo,
          content,
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
          roomId: selectedRoom.roomNo,
          senderId: memberNo,
          content: msg.content,
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

  // ──── 유틸 ────
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      // requestAnimationFrame을 사용하여 돔 렌더링 후 스크롤이 적용되도록 함
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  const filteredRooms = chatRooms.filter(room => {
    if (filter === 'all') return true;
    return room.otherUser.role === filter;
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr), 'HH:mm', { locale: ko }); }
    catch { return ''; }
  };

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
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">채팅</h2>
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
              <button key={room.id} onClick={() => setSelectedRoom(room)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selectedRoom?.roomNo === room.roomNo ? 'bg-orange-50' : ''
                  }`}>
                <img src={room.otherUser.profileImage || '/default-profile.png'}
                  alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900 truncate">
                      {room.otherUser.nickname}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(room.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>
                    {room.unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{room.productTitle}</p>
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
              <img src={selectedRoom.otherUser.profileImage || '/images/default-profile.png'}
                alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/seller/${selectedRoom.otherUser.no}`)}
                  className="font-bold text-sm text-gray-900 truncate hover:text-[#FF5A5A] transition-colors block text-left"
                >
                  {selectedRoom.otherUser.nickname}
                </button>
                <p className="text-[11px] text-gray-400 truncate">{selectedRoom.productTitle}</p>
              </div>
              <div className="relative group" ref={menuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <BsThreeDotsVertical className="w-5 h-5" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 opacity-100 visible transition-all duration-200 transform origin-top-right">
                    <button
                      onClick={() => { navigate(`/seller/${selectedRoom.otherUser.no}`); setShowMoreMenu(false); }}
                      className="flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#FF5A5A] transition-colors w-full text-left"
                    >
                      <BsPersonSquare className="w-4 h-4 mr-2.5" /> 프로필 보기
                    </button>
                    <button
                      onClick={() => { navigate(`/products/${selectedRoom.productId}`); setShowMoreMenu(false); }}
                      className="flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#FF5A5A] transition-colors w-full text-left"
                    >
                      <BsCartCheck className="w-4 h-4 mr-2.5" /> 상품 보기
                    </button>
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={async () => {
                          if (window.confirm('이 채팅방을 나가시겠습니까?\n나가면 목록에서 삭제되지만 상대방은 계속 대화를 볼 수 있습니다.')) {
                            try {
                              await api.delete(`/chat/rooms/${selectedRoom.roomNo}`);
                              setSelectedRoom(null);
                              loadChatRooms();
                              fetchChats(); // 전역 목록(헤더 알림 등) 동기화
                            } catch { alert('삭제에 실패했습니다.'); }
                          }
                          setShowMoreMenu(false);
                        }}
                        className="flex items-center px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        <BsDoorOpen className="w-4 h-4 mr-2.5" /> 채팅방 나가기
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
                  <div className="spinner-border w-5 h-5 text-gray-400" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <div className="text-center text-xs text-gray-400 py-2">이전 메시지가 없습니다</div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.senderNo === memberNo;
                return (
                  <React.Fragment key={msg.id}>
                    {/* 날짜 구분선 */}
                    {shouldShowDateDivider(idx) && (
                      <div className="flex items-center justify-center py-3">
                        <span className="bg-gray-200/80 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <img src={selectedRoom.otherUser.profileImage || '/default-profile.png'}
                            alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-100" />
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* ──── 메시지 콘텐츠 (msgType 분기) ──── */}
                          {msg.msgType === 'IMAGE' && msg.imageUrls && msg.imageUrls.length > 0 ? (
                            <div
                              className={`grid gap-1 rounded-2xl overflow-hidden max-w-[240px] ${
                                msg.status === 'SENDING' ? 'opacity-70' : ''
                              } ${
                                msg.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                              }`}
                            >
                              {msg.imageUrls.slice(0, 4).map((url, i) => (
                                <div key={i} className="relative aspect-square">
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover cursor-pointer hover:brightness-90 transition-all"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                  {/* 4장 초과 시 마지막 칸에 +N 오버레이 */}
                                  {i === 3 && msg.imageUrls!.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                                      +{msg.imageUrls!.length - 4}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : msg.msgType === 'LOCATION' ? (
                            <div
                              className={`rounded-2xl overflow-hidden border shadow-sm max-w-[220px] ${
                                isMe ? 'border-orange-200 rounded-tr-none' : 'border-gray-100 rounded-tl-none'
                              } ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}
                            >
                              {/* 위치 지도 미리보기 (Static Map 또는 플레이스홀더) */}
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
                              <div className={`p-3 ${ isMe ? 'bg-orange-500' : 'bg-white' }`}>
                                <div className={`flex items-start gap-1.5 ${ isMe ? 'text-white' : 'text-gray-800' }`}>
                                  <BsGeoAlt className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold leading-snug">{msg.addrRoad || '위치 정보'}</p>
                                    {msg.addrDetail && (
                                      <p className={`text-[10px] mt-0.5 ${ isMe ? 'text-orange-200' : 'text-gray-500' }`}>{msg.addrDetail}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-3 px-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                              isMe
                                ? msg.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800 rounded-tr-none'
                                  : 'bg-orange-500 text-white rounded-tr-none'
                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                              } ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                              {msg.content}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            {/* 전송 상태 표시 */}
                            {isMe && msg.status === 'SENDING' && (
                              <div className="spinner-border w-3 h-3 text-gray-400" role="status">
                                <span className="sr-only">Loading...</span>
                              </div>
                            )}
                            {isMe && msg.status === 'FAILED' && (
                              <button onClick={() => handleRetry(msg)}
                                className="flex items-center gap-0.5 text-red-500 text-[10px] font-bold hover:underline">
                                <BsExclamationCircle className="w-3 h-3" />
                                <BsArrowRepeat className="w-3 h-3" />
                                재전송
                              </button>
                            )}
                            {/* 읽음 표시 */}
                            {isMe && msg.status === 'SENT' && msg.isRead === 0 && (
                              <span className="text-[9px] text-orange-400 font-bold">1</span>
                            )}
                            <span className="text-[9px] text-gray-400 font-medium">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleBsSendMessage} className="flex items-center gap-3">
                {/* 이미지 업로드 버튼 */}
                <label
                  className={`p-3 rounded-2xl cursor-pointer transition-all ${
                    isConnected
                      ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                      : 'text-gray-200 cursor-not-allowed'
                  }`}
                  title="사진 보내기 (최대 10장)"
                >
                  <BsImage className="w-5 h-5" />
                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    disabled={!isConnected}
                    onChange={handleImageUpload}
                  />
                </label>
                <div className="flex-1 relative">
                  <input type="text" value={newMessage}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CONTENT_LENGTH) setNewMessage(e.target.value);
                    }}
                    placeholder="메시지를 입력하세요..."
                    maxLength={MAX_CONTENT_LENGTH}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" />
                  {newMessage.length > 3800 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      {newMessage.length}/{MAX_CONTENT_LENGTH}
                    </span>
                  )}
                </div>
                <button type="submit"
                  disabled={!newMessage.trim() || !isConnected}
                  className="p-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:hover:bg-orange-500 shadow-lg shadow-orange-100">
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
          <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">채팅을 시작해보세요</h3>
          <p className="text-sm text-gray-400 font-medium leading-relaxed">
            왼쪽 목록에서 대화 상대를 선택하거나<br />
            상품 상세 페이지에서 문의하기를 눌러보세요.
          </p>
        </div>
      )}
    </div>
  );
};