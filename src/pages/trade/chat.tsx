import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Image as ImageIcon, MoreVertical, ArrowLeft, ShoppingBag, ChevronRight, User, MessageSquare, ExternalLink, UserCircle } from 'lucide-react';
import { MOCK_CHAT_ROOMS, CURRENT_USER } from '@/services/mockData';
import { ChatRoom, ChatMessage } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getProfileImageUrl } from '@/utils/imageUtils';

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(MOCK_CHAT_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'seller' | 'buyer'>('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if redirected from product detail with a specific room
    const queryParams = new URLSearchParams(location.search);
    const roomId = queryParams.get('id');
    if (roomId) {
      const room = chatRooms.find(r => r.id === roomId);
      if (room) setSelectedRoom(room);
    }
  }, [location.search, chatRooms]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedRoom?.messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    const message: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: CURRENT_USER.id,
      content: newMessage,
      createdAt: new Date().toISOString(),
    };

    const updatedRoom = {
      ...selectedRoom,
      messages: [...selectedRoom.messages, message],
      lastMessage: newMessage,
      lastMessageAt: message.createdAt,
    };

    setSelectedRoom(updatedRoom);
    setChatRooms(prev => prev.map(r => r.id === selectedRoom.id ? updatedRoom : r));
    setNewMessage('');
  };

  const filteredRooms = chatRooms.filter(room => {
    if (filter === 'all') return true;
    return room.otherUser.role === filter;
  });

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-240px)] flex bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm my-4">
      {/* Sidebar: Chat Rooms */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">채팅</h2>
          
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: '전체' },
              { id: 'seller', label: '판매자' },
              { id: 'buyer', label: '구매자' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  filter === chip.id 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
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
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selectedRoom?.id === room.id ? 'bg-orange-50/50' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <img src={getProfileImageUrl(room.otherUser.profileImage)} alt={room.otherUser.nickname} className="w-12 h-12 rounded-2xl object-cover" />
                  {room.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-gray-900 truncate">{room.otherUser.nickname}</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {format(new Date(room.lastMessageAt), 'HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate font-medium">{room.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: Chat Messages */}
      <div className={`flex-1 flex flex-col bg-gray-50/30 ${!selectedRoom ? 'hidden md:flex' : 'flex'}`}>
        {selectedRoom ? (
          <>
            {/* Chat Header - Updated to show Product Info */}
            <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => setSelectedRoom(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={selectedRoom.productImage} alt={selectedRoom.productTitle} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-gray-900 truncate">{selectedRoom.productTitle}</h3>
                    <p className="text-xs font-black text-orange-500">{selectedRoom.productPrice.toLocaleString()}원</p>
                  </div>
                </div>
              </div>
              
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          navigate(`/products/${selectedRoom.productId}`);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-orange-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mr-2.5" /> 상품페이지로 가기
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/seller/${selectedRoom.otherUser.id}`);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-orange-500 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 mr-2.5" /> 프로필로 가기
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedRoom.messages.map((msg, idx) => {
                const isMe = msg.senderId === CURRENT_USER.id;
                const showDate = idx === 0 || format(new Date(selectedRoom.messages[idx-1].createdAt), 'yyyy-MM-dd') !== format(new Date(msg.createdAt), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-8">
                        <span className="px-4 py-1 bg-gray-200/50 text-gray-500 text-[10px] font-bold rounded-full">
                          {format(new Date(msg.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <img src={getProfileImageUrl(selectedRoom.otherUser.profileImage)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 px-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                            isMe ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 font-medium">
                            {format(new Date(msg.createdAt), 'HH:mm', { locale: ko })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:hover:bg-orange-500 shadow-lg shadow-orange-500/10"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
              <MessageSquare className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">채팅을 시작해보세요</h3>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              왼쪽 목록에서 대화 상대를 선택하거나<br/>
              상품 상세 페이지에서 문의하기를 눌러보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
