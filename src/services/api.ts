import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // 백엔드 URL을 상대경로로 변경!
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('java_token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
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
    } else if (error.response && [502, 503, 504].includes(error.response.status)) {
      // 게이트웨이/서버 다운 → 에러 페이지로 이동
      window.dispatchEvent(new CustomEvent('serverError'));
    } else if (error.response?.status === 500) {
      // 500이더라도 서버가 JSON 에러 바디를 보낸 경우(GlobalExceptionHandler 처리)는
      // 개별 catch 블록이 토스트를 띄우도록 페이지 이동 없이 통과
      const hasJsonBody = error.response.data && (error.response.data.error || error.response.data.message);
      if (!hasJsonBody) {
        window.dispatchEvent(new CustomEvent('serverError'));
      }
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
