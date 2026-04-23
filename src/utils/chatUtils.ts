import { format, isToday, differenceInCalendarDays, differenceInMonths, differenceInYears } from 'date-fns';

/**
 * 채팅 및 알림 메시지 프리뷰를 사용자 친화적인 문자열로 변환합니다.
 */
export const formatMessagePreview = (content: string | null | undefined): string => {
  if (!content) return '';

  // 1. 이미지 메시지 체크
  if (content === '사진들' || (content.match(/IMAGE_UPLOAD_PLACEHOLDER/g) || []).length > 1) {
    return '사진을 여러장 보냈습니다.';
  }
  if (content === '사진' || content.includes('IMAGE_UPLOAD_PLACEHOLDER')) {
    return '사진을 보냈습니다.';
  }

  // 2. 약속 잡기 (JSON 형태) 체크
  if (content.startsWith('{') && content.includes('dateLabel')) {
    return '약속을 잡았습니다.';
  }

  // 3. 배송지/위치 정보 (ADDRESS/LOCATION) 체크
  if (content === '배송지 공유' || content === '위치 공유') {
    return '배송지를 보냈습니다.';
  }

  // 4. HTML 태그 제거 및 엔티티 변환 (최소한의 스트리핑)
  const stripped = content
    .replace(/<[^>]*>?/gm, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // 5. 만약 위에서 처리되지 않은 JSON 형태가 남아있다면 간단히 처리
  if (stripped.startsWith('{') && stripped.endsWith('}')) {
    if (stripped.includes('addrRoad')) return '배송지를 보냈습니다.';
    return '새로운 메시지';
  }

  return stripped;
};

/**
 * 날짜 문자열을 상대표기 방식(오늘: 시간, 그외: N일전/N개월전/N년전)으로 변환합니다.
 */
export const formatRelativeTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();

    if (isToday(date)) {
      return format(date, 'HH:mm');
    }

    const diffDays = differenceInCalendarDays(now, date);
    if (diffDays <= 30) {
      return `${diffDays}일 전`;
    }

    const diffMonths = differenceInMonths(now, date);
    if (diffMonths < 12) {
      return `${diffMonths}개월 전`;
    }

    const diffYears = differenceInYears(now, date);
    return `${diffYears}년 전`;
  } catch (e) {
    console.error('[formatRelativeTime] Error:', e);
    return '';
  }
};
