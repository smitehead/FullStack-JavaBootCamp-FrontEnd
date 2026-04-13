import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Send, Image as ImageIcon, MoreVertical, ArrowLeft,
  ShoppingBag, ChevronRight, MessageSquare, RefreshCw,
  AlertCircle, Loader2, Wifi, WifiOff
} from 'lucide-react';
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
  const { user } = useAppContext();
  const memberNo = user ? getMemberNo(user) : null;

  // 채팅방 목록
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
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
            m => m.clientUuid === clientUuid && m.status === 'SENDING'
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
  // 4. 메시지 전송 (낙관적 UI)
  // ══════════════════════════════════════════════════
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !memberNo) return;
    if (newMessage.length > MAX_CONTENT_LENGTH) return;

    // crypto.randomUUID()는 HTTPS 환경에서만 작동하므로 호환성을 위해 직접 생성
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
    receivedUuids.current.add(clientUuid);
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
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-240px)] flex bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm my-4">
      {/* ──── Sidebar: 채팅방 목록 ──── */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">채팅</h2>
            {/* 연결 상태 표시 */}
            <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? '연결됨' : '연결 중...'}
            </div>
          </div>
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
                <Send className="w-8 h-8 text-gray-300" />
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
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img src={selectedRoom.otherUser.profileImage || '/default-profile.png'}
                alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">{selectedRoom.otherUser.nickname}</h3>
                <p className="text-[11px] text-gray-400 truncate">{selectedRoom.productTitle}</p>
              </div>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 top-10 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                    <button onClick={() => navigate(`/products/${selectedRoom.productId}`)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" /> 상품 보기
                    </button>
                    <button onClick={async () => {
                      if (window.confirm('이 채팅방을 나가시겠습니까?')) {
                        try {
                          await api.delete(`/chat/rooms/${selectedRoom.roomNo}`);
                          setSelectedRoom(null);
                          loadChatRooms();
                        } catch { alert('삭제에 실패했습니다.'); }
                      }
                      setShowMoreMenu(false);
                    }}
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50">
                      채팅방 나가기
                    </button>
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
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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
                          <div className={`p-3 px-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe
                              ? msg.status === 'FAILED'
                                ? 'bg-red-100 text-red-800 rounded-tr-none'
                                : 'bg-orange-500 text-white rounded-tr-none'
                              : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                            } ${msg.status === 'SENDING' ? 'opacity-70' : ''}`}>
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {/* 전송 상태 표시 */}
                            {isMe && msg.status === 'SENDING' && (
                              <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                            )}
                            {isMe && msg.status === 'FAILED' && (
                              <button onClick={() => handleRetry(msg)}
                                className="flex items-center gap-0.5 text-red-500 text-[10px] font-bold hover:underline">
                                <AlertCircle className="w-3 h-3" />
                                <RefreshCw className="w-3 h-3" />
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
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
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
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
            <MessageSquare className="w-10 h-10 text-gray-200" />
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