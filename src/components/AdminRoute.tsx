import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { showToast } from '@/components/toastService';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * 관리자 전용 라우트 가드.
 *
 * isAdmin은 AppContext 초기화 시 JWT 페이로드에서 직접 파싱하므로
 * sessionStorage(java_user) 조작으로는 우회 불가.
 *
 * - 초기화 중: 스피너 표시 (깜빡임 방지)
 * - 비로그인 / 일반유저: 즉시 <Navigate> 리다이렉트 (렌더링 없음)
 * - 관리자: children 정상 렌더링
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isInitialized, user } = useAppContext();

  const isDenied = isInitialized && (!user || !user.isAdmin);

  useEffect(() => {
    if (isDenied) {
      showToast('관리자만 접근할 수 있습니다.', 'error');
    }
  }, [isDenied]);

  // JWT 파싱 및 유저 복원이 완료될 때까지 대기
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
