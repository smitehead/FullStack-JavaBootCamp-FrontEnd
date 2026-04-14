import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // 백엔드 URL을 상대경로로 변경!
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('java_token');
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
    // 서버가 죽었거나(Network Error) 500, 502, 503, 504 에러일 때
    if (!error.response || [500, 502, 503, 504].includes(error.response.status)) {
      window.dispatchEvent(new CustomEvent('serverError'));
    }

    if (error.response?.status === 401) {
      // /auth/logout 요청 자체는 제외 (무한루프 방지)
      const url = error.config?.url ?? '';
      if (!url.includes('/auth/logout')) {
        // AppContext의 커스텀 이벤트 리스너로 모달 표시 위임
        window.dispatchEvent(new CustomEvent('forceLogout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
