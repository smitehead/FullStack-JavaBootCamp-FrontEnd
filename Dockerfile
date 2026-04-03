# 1. 가볍고 빠른 Nginx 이미지 사용
FROM nginx:alpine

# 2. 기존에 Nginx가 가지고 있던 기본 파일들 싹 지우기
RUN rm -rf /usr/share/nginx/html/*

# 3. 깃허브 액션이 배달해 줄 React 빌드 결과물(dist 폴더)을 Nginx 안으로 복사
COPY dist /usr/share/nginx/html

# 4. 방금 1단계에서 만든 Nginx 설정 파일 덮어쓰기
COPY default.conf /etc/nginx/conf.d/default.conf

# 5. 80번 포트 개방
EXPOSE 80

# 6. Nginx 실행
CMD ["nginx", "-g", "daemon off;"]