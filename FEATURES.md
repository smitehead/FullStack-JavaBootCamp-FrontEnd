# LiveBid 프론트엔드 기능 전체 정리

> 최종 업데이트: 2026-04-10  
> 백엔드 포트: 8080 / 프론트 포트: 3000

---

## 페이지 목록 및 연동 상태

### 범례
- ✅ API 연동 완료
- ⚠️ 부분 구현 (Mock 혼용)
- ❌ 미구현 (Mock 또는 하드코딩)

---

## 인증

| 페이지 | 경로 | 상태 | 연동 API |
|--------|------|------|---------|
| Login.tsx | `/login` | ✅ | `POST /api/auth/login` |
| Signup.tsx | `/signup` | ✅ | `POST /api/members`, 이메일 인증 |
| FindAccount.tsx | `/find-id`, `/find-pw` | ✅ | 이메일 인증번호 발송/검증 |

---

## 상품

| 페이지 | 경로 | 상태 | 연동 API |
|--------|------|------|---------|
| Home.tsx | `/` | ✅ | `GET /api/products`, `GET /api/banners` |
| ProductList.tsx | `/search` | ✅ | `GET /api/products` (필터/페이징) |
| ProductDetail.tsx | `/products/:id` | ✅ | 상품 상세, 입찰, 자동입찰, 위시리스트 |
| ProductRegister.tsx | `/register` | ✅ | `POST /api/products`, 이미지 업로드 |
| AboutUs.tsx | `/about` | ✅ | 정적 소개 페이지 |

---

## 낙찰 / 거래

| 페이지 | 경로 | 상태 | 연동 API |
|--------|------|------|---------|
| WonProductDetail.tsx | `/won/:id` | ✅ | 결제, 구매확정, 거래취소, 리뷰 작성 |
| ReviewCreate.tsx | `/review/:orderId` | ⚠️ 데드코드 | 라우트만 존재, WonProductDetail 모달로 대체됨 |

---

## 마이페이지

| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| MyPage.tsx | `/mypage` | ✅ | 판매/입찰/구매/찜/리뷰 탭 |
| Settings.tsx | `/settings` | ✅ | 프로필, 비밀번호, 알림설정, 차단 |
| Points.tsx | `/points` | ✅ | 포인트 현황 및 내역 |
| PointCharge.tsx | `/points/charge` | ✅ | 카드/계좌 충전 |
| PointWithdraw.tsx | `/points/withdraw` | ✅ | 출금 신청 |
| CardRegistration.tsx | `/points/card-register` | ✅ | 카드 등록 (빌링키) |
| AccountRegistration.tsx | `/settings/account-register` | ✅ | 계좌 등록/삭제 |

---

## 거래 / 커뮤니케이션

| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| Inbox.tsx | `/inbox` | ⚠️ | 알림 탭 ✅ / 채팅 탭 ❌ (MOCK_CHAT_ROOMS 사용) |
| chat.tsx | `/chat` | ❌ | 로컬 state만, 서버 연동 없음 |
| SellerProfile.tsx | `/seller/:id` | ✅ | 판매자 프로필, 받은 리뷰, 차단/신고 |

---

## 고객센터

| 페이지 | 경로 | 상태 | 연동 API |
|--------|------|------|---------|
| NoticeList.tsx | `/notice` | ✅ | `GET /api/notices` |
| NoticeDetail.tsx | `/notice/:id` | ✅ | `GET /api/notices/{id}` |
| InquiryList.tsx | `/inquiry` | ✅ | `GET /api/inquiries/my` |
| InquiryCreate.tsx | `/inquiry/create` | ✅ | `POST /api/inquiries` |
| InquiryDetail.tsx | `/inquiry/:id` | ✅ | `GET /api/inquiries/{id}` |
| Report.tsx | `/report` | ✅ | `POST /api/reports` |
| FAQ.tsx | `/faq` | ❌ | FAQ_DATA 하드코딩, 백엔드 API 없음 |

---

## 관리자

| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| AdminDashboard.tsx | `/admin/` | ✅ | 출금대기, 공지, 문의 현황 |
| UserManagement.tsx | `/admin/users` | ✅ | 정지/해제, 포인트, 매너온도 |
| AuctionManagement.tsx | `/admin/auctions` | ✅ | 경매 강제 종료 |
| ReportManagement.tsx | `/admin/reports` | ✅ | 신고 처리 |
| NotificationManagement.tsx | `/admin/notifications` | ✅ | 전체 알림 발송 |
| ActivityLogManagement.tsx | `/admin/activity-logs` | ✅ | 활동 로그 조회 |
| MannerHistoryManagement.tsx | `/admin/manner-history` | ✅ | 매너온도 변동 이력 |
| BannerManagement.tsx | `/admin/banners` | ✅ | 배너 CRUD, 이미지 업로드 |
| NoticeManagement.tsx | `/admin/notices` | ✅ | 공지 CRUD |
| InquiryManagement.tsx | `/admin/inquiries` | ⚠️ | API 연동됨, 닉네임 표시에 MOCK_USERS 사용 중 |
| WithdrawManagement.tsx | `/admin/withdraws` | ✅ | 출금 승인/거절 |

---

## 공통 컴포넌트

| 컴포넌트 | 상태 | 비고 |
|---------|------|------|
| Layout.tsx | ✅ | SSE 구독, Header, 알림 뱃지 |
| ProductCard.tsx | ✅ | 위시리스트 토글 |
| AppContext.tsx | ⚠️ | 관리자 데이터 API 연동, chatRooms는 Mock 초기값 |
| toastService.tsx | ✅ | 토스트 알림 |

---

## 미구현 항목 요약

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| 채팅 | 백엔드 API 없음, 프론트 로컬 state만 | 높음 |
| FAQ | 백엔드 API 없음, 하드코딩 | 낮음 |
| InquiryManagement 닉네임 | MOCK_USERS → 실제 API 조회로 교체 필요 | 중간 |
| ReviewCreate.tsx | 데드코드 — 삭제 또는 유지 결정 필요 | 낮음 |

---

## Mock 데이터 잔존 현황 (mockData.ts)

| Mock 데이터 | 사용처 | 처리 방향 |
|------------|--------|----------|
| `MOCK_CHAT_ROOMS` | AppContext, Inbox.tsx | 채팅 백엔드 구현 후 제거 |
| `MOCK_USERS` | InquiryManagement.tsx (닉네임 매핑) | API로 교체 필요 |
| `CURRENT_USER` | Layout.tsx, Inbox.tsx | 로그인 상태 API로 대부분 교체됨, 잔존 확인 필요 |

---

## DB 적용 필요 쿼리

```sql
-- 별점 컬럼 제거
ALTER TABLE REVIEW DROP COLUMN RATING;

-- 공지 요약설명 컬럼 제거
ALTER TABLE NOTICE DROP COLUMN DESCRIPTION;
```
