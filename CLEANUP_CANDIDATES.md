# 정리 후보 목록 (팀 검토용)

> 삭제/수정 전 팀원과 협의 필요. 기능에 영향 없는 항목들이지만 확인 후 처리.

---

## 프론트엔드

### 🔴 제거 후보 파일 (미사용)

| 파일 | 내용 | 근거 |
|------|------|------|
| `src/services/mockData.ts` | MOCK_USERS, MOCK_PRODUCTS 등 더미 데이터 13종 (550줄) | 전체 코드베이스에서 import하는 파일 없음 |
| `src/pages/mypage/MyPageStubs.tsx` | ProfileEditStub 등 스텁 4개 (43줄) | 어디서도 import 안 됨, 전부 TODO 주석만 있음 |

### 🟡 같이 정리 가능한 항목

| 파일 | 항목 | 근거 |
|------|------|------|
| `src/types.ts` | `ReviewTag` 인터페이스 | mockData.ts 에서만 사용 → mockData 삭제 시 같이 제거 가능 |

---

## 백엔드

### 🔴 제거 후보 (미사용)

| 경로 | 내용 | 근거 |
|------|------|------|
| `src/main/resources/sql/queries/db/` | SQL 파일 12개 (relatedToAddress.sql 등) | 과거 마이그레이션용으로 추정, Java 코드에서 전혀 참조 안 됨 |
| `ProductRepository.java` `countProductsByRootCategory()` | 카테고리별 상품 수 집계 네이티브 쿼리 | 호출하는 Service/Controller 없음 |

### 🟠 수정 필요 (TODO 미처리)

| 파일 | 내용 |
|------|------|
| `domain/bid/service/BidCancelService.java` L59 | `CANCEL_BLOCK_HOURS = 0L` — QA 완료 후 `12L`로 복구해야 한다는 TODO 주석 남아있음 |

### 🟡 중복 패턴 (기능 문제는 없음, 리팩토링 선택사항)

| 패턴 | 해당 파일 |
|------|-----------|
| `memberRepository.findById().orElseThrow(...)` 패턴이 5곳에 반복 | AdminServiceImpl, BidCancelService, AuctionAutoConfirmProcessor, PaymentExpiryProcessor, MemberServiceImpl |
| 알림 발송 try-catch 블록 반복 | AuctionAutoConfirmProcessor, AuctionAutoConfirmScheduler, PaymentExpiryProcessor |
| PointHistory 저장 로직 반복 | AuctionAutoConfirmProcessor, PaymentExpiryProcessor, BidCancelService, PointServiceImpl |
