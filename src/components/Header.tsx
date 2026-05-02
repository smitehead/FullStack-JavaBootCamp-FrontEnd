import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BsPersonCircle, BsGear, BsBell, BsClock, BsList, BsChat, BsSearch, BsX } from 'react-icons/bs';
import { useAppContext } from '@/context/AppContext';
import { Category } from '@/types';
import { CATEGORY_DATA } from '@/constants';
import { getProfileImageUrl } from '@/utils/imageUtils';
import { formatMessagePreview, formatRelativeTime } from '@/utils/chatUtils';
import mainLogo from '@/assets/images/main_logo.png';
import { showToast } from '@/components/toastService';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { user, isInitialized, notifications, chats, markNotificationAsRead, markAllNotificationsAsRead, unreadNotificationsCount, unreadChatsCount } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notiTab, setNotiTab] = useState<'noti' | 'chat'>('noti');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(CATEGORY_DATA[0].id);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        // showTopBar 상태는 현재 UI에서 미사용 (향후 확장용)
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveRecentSearch = (term: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== term);
      const updated = [term, ...filtered].slice(0, 6);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (idx: number) => {
    setRecentSearches(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (location.pathname !== '/search') {
      setSearchTerm('');
    } else {
      const q = new URLSearchParams(location.search).get('q') || '';
      if (q !== searchTerm) {
        setSearchTerm(q);
      }
    }
  }, [location.pathname, location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsSearchFocused(false);
    }
  };

  const handleCategoryClick = (cat: Category) => {
    navigate(`/search?category=${encodeURIComponent(cat)}`);
    setIsCategoryOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-1 shrink-0 group">
            <div className="group-hover:scale-110 transition-transform">
              <img src={mainLogo} alt="JAVAJAVA Logo" className="w-12 h-12 object-contain" />
            </div>
            <span className="text-2xl font-bold text-gray-800 tracking-tighter italic">JAVAJAVA</span>
          </Link>

          <div className="flex-1 max-w-2xl mx-12 hidden md:block relative">
            <form onSubmit={handleSearch} className="relative group flex items-center">
              <input
                type="text"
                placeholder="찾으시는 상품이 있나요?"
                className="w-full pl-6 pr-12 py-3.5 bg-[#F8F9FA] border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-100 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={100}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
              <button type="submit" className="absolute right-4 h-full flex items-center justify-center text-gray-400 group-focus-within:text-gray-600 transition-colors">
                <BsSearch className="w-5 h-5" />
              </button>
            </form>

            {isSearchFocused && searchTerm.trim() === '' && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 py-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-6 flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">최근 검색어</p>
                  <button onClick={clearRecentSearches} className="text-[10px] font-bold text-gray-300 hover:text-gray-500">전체 삭제</button>
                </div>
                <div className="space-y-1">
                  {recentSearches.length > 0 ? (
                    recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSearchTerm(term); saveRecentSearch(term); navigate(`/search?q=${encodeURIComponent(term)}`); setIsSearchFocused(false); }}
                        className="w-full text-left px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-between group overflow-hidden"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BsClock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <span className="truncate">{term}</span>
                        </div>
                        <BsX
                          className="w-4 h-4 shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                          onClick={(e) => { e.stopPropagation(); removeRecentSearch(idx); }}
                        />
                      </button>
                    ))
                  ) : (
                    <p className="px-6 py-4 text-xs text-gray-400 text-center italic">최근 검색어가 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            <Link to="/notice" className="hidden lg:flex text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">고객센터</Link>

            {!isInitialized ? (
              <>
                <div className="w-32 h-9 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="hidden lg:block w-24 h-9 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="w-11 h-9 bg-gray-100 rounded-xl animate-pulse" />
                <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
              </>
            ) : user ? (
              <>
                <div className="flex flex-col items-end">
                  <Link to="/points" className="bg-[#F8F9FA] px-4 py-2.5 rounded-2xl flex items-center space-x-2 border border-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-brand font-bold text-sm">P</span>
                    <span className="text-sm font-bold text-gray-700">{user.points.toLocaleString()}</span>
                  </Link>
                </div>

                <Link
                  to="/register"
                  className="hidden lg:flex items-center space-x-1.5 bg-brand text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-95"
                >
                  <span>경매 등록</span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => { setIsNotiOpen(prev => { if (prev) markAllNotificationsAsRead(); return !prev; }); }}
                    className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative"
                  >
                    <BsBell className="w-6 h-6" />
                    {(unreadNotificationsCount > 0 || unreadChatsCount > 0) && (
                      <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-brand rounded-full border-2 border-white"></span>
                    )}
                  </button>
                  {isNotiOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setIsNotiOpen(false); markAllNotificationsAsRead(); }} />
                      <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50">
                        <div className="flex border-b border-gray-50">
                          <button onClick={() => setNotiTab('noti')} className={`flex-1 px-5 py-3 text-sm transition-all ${notiTab === 'noti' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'font-bold text-gray-400 hover:text-gray-600'}`}>알림</button>
                          <button onClick={() => setNotiTab('chat')} className={`flex-1 px-5 py-3 text-sm transition-all ${notiTab === 'chat' ? 'font-bold text-gray-900 border-b-2 border-gray-900' : 'font-bold text-gray-400 hover:text-gray-600'}`}>대화</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notiTab === 'noti' ? (
                            notifications.length > 0 ? notifications.slice(0, 10).map(noti => (
                              <Link
                                key={noti.id}
                                to={noti.link || '/inbox?tab=noti'}
                                className={`block px-5 py-4 text-sm transition-colors hover:bg-gray-50 relative ${!noti.read ? 'bg-brand/10' : 'bg-white'}`}
                                onClick={() => { markNotificationAsRead(noti.id); setIsNotiOpen(false); }}
                              >
                                {!noti.read && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand" />}
                                <p className="text-[10px] font-bold text-[#FF5A5A] mb-0.5">{({ bid: '낙찰', auctionEnd: '경매종료', newBid: '새입찰', activity: '거래', '제재': '제재', '제재해제': '제재해제', QNA: '문의', QNA_ANSWER: '답변', '시스템': '시스템', '이벤트': '이벤트', marketing: '이벤트', system: '시스템' } as Record<string, string>)[noti.type] ?? noti.type}</p>
                                <p className={`leading-snug line-clamp-2 ${!noti.read ? 'font-semibold text-gray-800' : 'font-normal text-gray-400'}`}>{formatMessagePreview(noti.message).replace(/^\[.+?\]\s*/, '')}</p>
                                <span className="text-[10px] text-gray-300 mt-1 block">{new Date(noti.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                              </Link>
                            )) : (
                              <div className="py-10 text-center text-sm text-gray-400 font-medium">알림이 없습니다.</div>
                            )
                          ) : (
                            chats && chats.length > 0 ? chats.map(chat => (
                              <Link
                                key={chat.id}
                                to={`/chat?roomNo=${chat.roomNo}`}
                                className={`block px-5 py-4 text-sm transition-colors hover:bg-gray-50 relative ${chat.unreadCount > 0 ? 'bg-brand/10' : 'bg-white'}`}
                                onClick={() => { setIsNotiOpen(false); }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-shrink-0">
                                    <img src={chat.productImage || '/images/default-product.png'} alt={chat.productTitle} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
                                      <img src={getProfileImageUrl(chat.otherUser.profileImage)} alt={chat.otherUser.nickname} className="w-full h-full object-cover" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-gray-900 truncate">{chat.otherUser.nickname}</span>
                                      {chat.lastMessageAt && <span className="text-[10px] text-gray-400">{formatRelativeTime(chat.lastMessageAt)}</span>}
                                    </div>
                                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-brand font-bold' : 'text-gray-400'}`}>{formatMessagePreview(chat.lastMessage) || '첫 대화를 남겨보세요'}</p>
                                  </div>
                                </div>
                              </Link>
                            )) : (
                              <div className="py-10 text-center text-sm text-gray-400 font-medium">대화 내역이 없습니다.</div>
                            )
                          )}
                        </div>
                        <Link to={`/inbox?tab=${notiTab}`} className="block text-center py-3 text-xs font-bold text-gray-400 hover:text-gray-600 border-t border-gray-50" onClick={() => setIsNotiOpen(false)}>전체보기</Link>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative group">
                  <button className="flex items-center gap-2 shrink-0">
                    <img src={getProfileImageUrl(user.profileImage)} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow-md hover:ring-2 hover:ring-gray-200 transition-all object-cover" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100">
                    <Link to="/mypage" className="w-full flex items-center justify-start text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"><BsPersonCircle className="w-4 h-4 mr-2.5" /> 프로필 보기</Link>
                    <Link to="/chat" className="w-full flex items-center justify-start text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"><BsChat className="w-4 h-4 mr-2.5" /> 채팅방 가기</Link>
                    <Link to="/settings" className="w-full flex items-center justify-start text-left px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"><BsGear className="w-4 h-4 mr-2.5" /> 계정 설정</Link>
                    <div className="border-t border-gray-50 mt-1 pt-1 flex justify-end px-4 pb-2">
                      <button onClick={onLogout} className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors">로그아웃</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all border border-gray-100">로그인</Link>
                <Link to="/signup" className="px-5 py-2.5 text-sm font-bold text-white bg-[#FF5A5A] hover:bg-[#FF4545] rounded-xl transition-all shadow-lg shadow-red-100 active:scale-95">회원가입</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sub Header Row */}
        <div className="flex items-center justify-between h-12 pb-2">
          <div className="relative group">
            <button
              className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            >
              <BsList className="w-5 h-5 mr-2.5 opacity-70" />
              카테고리
            </button>

            {isCategoryOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsCategoryOpen(false)} />
                <div className="absolute top-full left-0 w-[min(900px,calc(100vw-3rem))] h-[min(600px,calc(100vh-160px))] bg-white border border-gray-100 rounded-2xl shadow-2xl mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 flex overflow-hidden">
                  <div className="w-56 bg-gray-50 border-r border-gray-100 overflow-y-auto custom-scrollbar">
                    {CATEGORY_DATA.map((cat) => (
                      <button
                        key={cat.id}
                        onMouseEnter={() => setActiveCategory(cat.id)}
                        onClick={() => { navigate(`/search?large=${cat.id}`); setIsCategoryOpen(false); }}
                        className={`w-full text-left px-6 py-4 text-sm font-bold transition-all flex items-center justify-between group ${activeCategory === cat.id ? 'bg-white text-[#FF5A5A]' : 'text-gray-600 hover:bg-white hover:text-[#FF5A5A]'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white">
                    {activeCategory && (
                      <div className="grid grid-cols-3 gap-x-10 gap-y-10">
                        {CATEGORY_DATA.find(c => c.id === activeCategory)?.subCategories?.map((sub) => (
                          <div key={sub.id} className="space-y-4">
                            <button
                              onClick={() => { navigate(`/search?large=${activeCategory}&medium=${sub.id}`); setIsCategoryOpen(false); }}
                              className="text-base font-semibold text-gray-900 hover:text-[#FF5A5A] transition-colors border-b-2 border-transparent hover:border-[#FF5A5A] pb-1 inline-block text-left"
                            >
                              {sub.name}
                            </button>
                            {sub.subCategories && (
                              <div className="flex flex-col space-y-2">
                                {sub.subCategories.map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => { navigate(`/search?large=${activeCategory}&medium=${sub.id}&small=${item.id}`); setIsCategoryOpen(false); }}
                                    className="text-sm font-semibold text-gray-400 hover:text-[#FF5A5A] transition-colors text-left w-full flex items-center justify-start"
                                  >
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {user?.isAdmin && (
              <Link to="/admin" className="flex items-center text-xs font-semibold text-white bg-black px-4 py-1.5 rounded-full shadow-lg shadow-gray-900/10 hover:bg-gray-800 transition-all active:scale-95">관리자모드</Link>
            )}
            <button
              onClick={() => { if (user) { navigate('/settings?tab=profile'); } else { showToast('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.', 'error'); navigate('/login'); } }}
              className="flex items-center text-xs font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm hover:border-[#FF5A5A] hover:text-[#FF5A5A] transition-all group overflow-hidden"
            >
              <span className="whitespace-nowrap">{user?.address || '위치를 확인할 수 없습니다.'}</span>
              <span className="text-[10px] max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap ml-0 group-hover:ml-2 border-l border-transparent group-hover:border-gray-200 pl-0 group-hover:pl-2">위치 변경하기</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
