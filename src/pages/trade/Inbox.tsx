import React, { useState, useEffect } from 'react';
import { BsBox2, BsChat, BsChevronRight, BsBell, BsThreeDotsVertical, BsTrash, BsBellSlash } from 'react-icons/bs';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { getProfileImageUrl } from '@/utils/imageUtils';
import { formatMessagePreview } from '@/utils/chatUtils';
import api from '@/services/api';

const stripTypePrefix = (message: string) => message.replace(/^\[.+?\]\s*/, '');

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
};

export const Inbox: React.FC = () => {
  const { user, notifications, chats, markNotificationAsRead, deleteNotification, markChatAsRead, fetchChats, deleteAllNotifications, hideChatRoom, hideAllChatRooms } = useAppContext();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'noti' | 'chat'>('noti');
  const [notiFilter, setNotiFilter] = useState<'all' | 'bid' | 'activity'>('all');
  const [chatFilter, setChatFilter] = useState<'all' | 'seller' | 'buyer'>('all');
  const [visibleNotisCount, setVisibleNotisCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNotiMenu, setActiveNotiMenu] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'noti' | 'chat' | null>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveNotiMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'noti' || tab === 'chat') {
      setActiveTab(tab as 'noti' | 'chat');
    }
  }, [location]);

  // Infinite Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100 &&
        !isLoading &&
        activeTab === 'noti'
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, activeTab]);

  const loadMore = () => {
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setVisibleNotisCount(prev => prev + 10);
      setIsLoading(false);
    }, 500);
  };

  const filteredNotis = notifications.filter(n => {
    if (notiFilter === 'all') return true;
    return n.type === notiFilter;
  }).slice(0, visibleNotisCount);

  const filteredChats = chats.filter(c => {
    // Filter out blocked users
    if ((user?.blockedUserIds ?? []).includes(c.otherUser.id)) return false;

    if (chatFilter === 'all') return true;
    return c.otherUser.role === chatFilter;
  });

  const handleDeleteAllNotis = async () => {
    if (notifications.length === 0) return;
    await deleteAllNotifications();
    setShowDeleteConfirm(null);
  };

  const handleDeleteAllChats = async () => {
    if (chats.length === 0) return;
    hideAllChatRooms();
    setShowDeleteConfirm(null);
  };

  const handleDeleteChat = async (roomNo: number) => {
    hideChatRoom(roomNo);
    setActiveNotiMenu(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">알림함</h2>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-100 mb-8">
        <button
          onClick={() => setActiveTab('noti')}
          className={`flex-1 py-4 text-lg font-semibold transition-all relative ${activeTab === 'noti' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          알림
          {activeTab === 'noti' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 text-lg font-semibold transition-all relative ${activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          대화
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-full"></div>
          )}
        </button>
      </div>

      {/* Sub Filters (Chips) */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {activeTab === 'noti' ? (
          <>
            <button
              onClick={() => setNotiFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${notiFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              전체
            </button>
            <button
              onClick={() => setNotiFilter('bid')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${notiFilter === 'bid' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              입찰소식
            </button>
            <button
              onClick={() => setNotiFilter('activity')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${notiFilter === 'activity' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              활동알림
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setChatFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${chatFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              전체
            </button>
            <button
              onClick={() => setChatFilter('seller')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${chatFilter === 'seller' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              판매자
            </button>
            <button
              onClick={() => setChatFilter('buyer')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${chatFilter === 'buyer' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
              구매자
            </button>
          </>
        )}
        
        {/* Delete All Button */}
        <div className="ml-auto">
          <button
            onClick={() => setShowDeleteConfirm(activeTab === 'noti' ? 'noti' : 'chat')}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-900 transition-all whitespace-nowrap"
          >
            모두 지우기
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="space-y-4">
        {activeTab === 'noti' ? (
          filteredNotis.length > 0 ? (
            filteredNotis.map(noti => (
              <div key={noti.id} className="relative group">
                <Link
                  to={noti.link}
                  onClick={() => markNotificationAsRead(noti.id)}
                  className={`block p-5 rounded-3xl border transition-all hover:shadow-md ${noti.read ? 'bg-white border-gray-100' : 'bg-brand/5 border-brand/20'
                    }`}
                >
                  <p className={`text-xs font-bold mb-1 ${
                    noti.type === 'bid' ? 'text-brand' :
                    noti.type === 'activity' ? 'text-indigo-600' :
                    noti.type === '제재' ? 'text-red-500' :
                    noti.type === 'QNA' || noti.type === 'QNA_ANSWER' ? 'text-violet-600' :
                    'text-gray-500'
                  }`}>
                    {({ bid: '낙찰', activity: '거래', '제재': '제재', QNA: '문의', QNA_ANSWER: '답변', '시스템': '시스템', '이벤트': '이벤트' } as Record<string, string>)[noti.type] ?? noti.type}
                  </p>
                  <p className="text-gray-900 font-bold leading-snug mb-2">{stripTypePrefix(formatMessagePreview(noti.message))}</p>
                  <p className="text-xs text-gray-400 font-medium">{formatDate(noti.createdAt)}</p>
                </Link>
                
                {/* Deletion Menu (Dropdown) */}
                <div className="absolute top-4 right-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveNotiMenu(activeNotiMenu === noti.id ? null : noti.id);
                      }}
                      className={`p-2 rounded-full transition-all ${activeNotiMenu === noti.id ? 'bg-gray-100 text-gray-900' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'}`}
                    >
                      <BsThreeDotsVertical className="w-5 h-5" />
                    </button>
                    
                    {activeNotiMenu === noti.id && (
                      <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNotification(noti.id);
                            setActiveNotiMenu(null);
                          }}
                          className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <BsBellSlash className="w-4 h-4 mr-2.5" />
                          알림 지우기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
              <BsBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">알림이 없습니다.</p>
            </div>
          )
        ) : (
          filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <Link
                key={chat.id}
                to={`/chat?id=${chat.id}`}
                onClick={() => markChatAsRead(chat.id)}
                className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-gray-100 transition-all hover:shadow-md"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.productImage || '/images/default-product.png'}
                    alt={chat.productTitle}
                    className="w-14 h-14 rounded-2xl object-cover border border-gray-100"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
                    <img
                      src={getProfileImageUrl(chat.otherUser.profileImage)}
                      alt={chat.otherUser.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 truncate">{chat.otherUser.nickname}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${chat.otherUser.role === 'seller' ? 'bg-indigo-100 text-indigo-600' : 'bg-brand/10 text-brand'
                      }`}>
                      {chat.otherUser.role === 'seller' ? '판매자' : '구매자'}
                    </span>
                    {chat.lastMessageAt && (
                      <>
                        <span className="text-gray-300 mx-1">•</span>
                        <span className="text-xs text-gray-400 font-medium">{formatDate(chat.lastMessageAt)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BsBox2 className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 font-bold truncate">{chat.productTitle}</span>
                  </div>
                  <p className="text-sm text-gray-900 truncate font-semibold">{formatMessagePreview(chat.lastMessage) || '첫 대화를 남겨보세요'}</p>
                </div>
                {/* Deletion Menu (Dropdown) for Chats */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveNotiMenu(activeNotiMenu === chat.id ? null : chat.id);
                    }}
                    className={`p-2 rounded-full transition-all ${activeNotiMenu === chat.id ? 'bg-gray-100 text-gray-900' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    <BsThreeDotsVertical className="w-5 h-5" />
                  </button>
                  
                  {activeNotiMenu === chat.id && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transform origin-top-right">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteChat(chat.roomNo);
                        }}
                        className="w-full flex items-center justify-start px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <BsBellSlash className="w-4 h-4 mr-2.5" />
                        알림 지우기
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
              <BsChat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">대화 내역이 없습니다.</p>
            </div>
          )
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
        </div>
      )}

      {/* Delete All Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {showDeleteConfirm === 'noti' ? '알림을 모두 지우시겠습니까?' : '대화 내역을 모두 지우시겠습니까?'}
              </h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                {showDeleteConfirm === 'noti' 
                  ? '모든 알림을 삭제하면 다시 되돌릴 수 없습니다.' 
                  : '모든 대화 내역을 삭제하면 다시 되돌릴 수 없습니다.'}
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                >
                  취소
                </button>
                <button 
                  onClick={showDeleteConfirm === 'noti' ? handleDeleteAllNotis : handleDeleteAllChats}
                  className="flex-1 py-3.5 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/10 text-sm"
                >
                  전체 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
