import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { SORRY_IMAGE_BASE64 } from '@/assets/images/sorry_base64';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { logout, forceLogoutModalOpen, closeForceLogoutModal } = useAppContext();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showErrorScreen, setShowErrorScreen] = useState(() => {
    return localStorage.getItem('server_error') === 'true';
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
      localStorage.removeItem('server_error');
      window.location.reload();
    } catch (error) {
      setTimeout(() => { setIsRefreshing(false); }, 500);
    }
  };

  // 5초마다 서버 복구 여부 폴링
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (showErrorScreen) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
          if (res.ok) {
            localStorage.removeItem('server_error');
            setShowErrorScreen(false);
            window.location.reload();
          }
        } catch {}
      }, 5000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [showErrorScreen]);

  useEffect(() => {
    const handleServerError = () => {
      setShowErrorScreen(true);
      localStorage.setItem('server_error', 'true');
    };
    window.addEventListener('serverError', handleServerError);
    return () => window.removeEventListener('serverError', handleServerError);
  }, []);

  const handleLogout = () => { setIsLogoutModalOpen(true); };

  const confirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Header onLogout={handleLogout} />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />

      {/* 강제 로그아웃 모달 */}
      {forceLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">다른 기기에서 로그인됨</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium leading-relaxed">
                동일한 계정으로 다른 기기에서 로그인되어<br />자동 로그아웃 처리되었습니다.
              </p>
              <button
                onClick={() => { closeForceLogoutModal(); navigate('/login'); }}
                className="w-full py-3.5 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10"
              >
                로그인 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그아웃 확인 모달 */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsLogoutModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">로그아웃 하시겠습니까?</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">다음에 또 만나요!</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">취소</button>
                <button onClick={confirmLogout} className="flex-1 py-3.5 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10">로그아웃</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 서버 점검 화면 */}
      <AnimatePresence>
        {showErrorScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-[600px] w-full flex flex-col items-center">
              <div className="relative w-full flex items-center justify-center min-h-[200px] mb-6">
                <img src={SORRY_IMAGE_BASE64} alt="Sorry" className="w-[280px] h-[280px] md:w-[360px] md:h-[360px] object-contain pointer-events-none" />
              </div>
              <div className="mb-8">
                <h2 className="text-[30px] font-bold text-[#111827] tracking-tight mb-4">서비스 점검 중</h2>
                <p className="text-[16px] text-[#6b7280] font-medium leading-relaxed">
                  보다 안정적인 서비스 제공을 위해 서버 점검 중입니다.<br />
                  점검이 완료되면 자동으로 페이지가 복구됩니다.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-[13px] font-bold text-[#9ca3af]">
                <motion.span
                  animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 bg-[#FF5A5A] rounded-full"
                />
                <span>페이지 로딩 중</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
