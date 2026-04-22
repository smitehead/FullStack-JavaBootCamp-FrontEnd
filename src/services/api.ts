import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // 백엔드 URL을 상대경로로 변경!
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // sessionStorage 사용: 탭 간 격리 (localStorage는 같은 출처 모든 탭 공유)
    // 다계정 QA 시 A탭의 토큰이 B탭 로그인으로 덮어씌워지는 크로스토크 방지
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
    if (error.message === 'Network Error' || !error.response) {
      window.dispatchEvent(new CustomEvent('serverError'));
    } else if (error.response && [500, 502, 503, 504].includes(error.response.status)) {
      window.dispatchEvent(new CustomEvent('serverError'));
    }

    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const hadToken = !!sessionStorage.getItem('java_token');
      if (!url.includes('/auth/logout') && hadToken) {
        window.dispatchEvent(new CustomEvent('forceLogout'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
