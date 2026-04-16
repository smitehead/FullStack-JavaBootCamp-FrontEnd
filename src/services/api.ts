import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // 백엔드 URL을 상대경로로 변경!
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('java_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 401 응답 및 서버 오류 인터셉터
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 서버 오류 진단용 로그
    if (error.message === 'Network Error' || !error.response) {
      console.error('[API] 백엔드 연결 실패 (Network Error): 서버가 꺼져있을 가능성이 높습니다.');
      window.dispatchEvent(new CustomEvent('serverError'));
    } else if (error.response && [500, 502, 503, 504].includes(error.response.status)) {
      console.error(`[API] 서버 오류 발생: ${error.response.status}`);
      window.dispatchEvent(new CustomEvent('serverError'));
    }

    if (error.response?.status === 401) {
      // /auth/logout 요청 자체는 제외 (무한루프 방지)
      const url = error.config?.url ?? '';
      if (!url.includes('/auth/logout')) {
        console.warn('[API] 인증 만료 (401): 강제 로그아웃을 실행합니다.');
        window.dispatchEvent(new CustomEvent('forceLogout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
