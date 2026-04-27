export const formatPrice = (amount: number): string => {
  if (amount == null) return '0';
  
  // 백만원 미만은 기존처럼 콤마 표기
  if (amount < 1000000) {
    return amount.toLocaleString();
  }

  const eok = Math.floor(amount / 100000000);
  const man = Math.floor((amount % 100000000) / 10000);
  const remainder = amount % 10000;

  let result = '';
  if (eok > 0) result += `${eok.toLocaleString()}억 `;
  if (man > 0) result += `${man.toLocaleString()}만`;
  
  if (remainder > 0 && eok === 0) {
     result += ` ${remainder.toLocaleString()}`;
  }

  return result.trim();
};
