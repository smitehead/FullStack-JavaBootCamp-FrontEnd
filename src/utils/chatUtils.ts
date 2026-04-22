/**
 * 채팅 및 알림 메시지 프리뷰를 사용자 친화적인 문자열로 변환합니다.
 * JSON 데이터나 HTML 태그가 포함된 경우 이를 적절한 텍스트로 대체합니다.
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
