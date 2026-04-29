import React from 'react';
import { TransactionMethod } from '@/types';

interface ShippingSectionProps {
  transactionMethod: TransactionMethod;
  location: string;
}

export const ShippingSection: React.FC<ShippingSectionProps> = ({ transactionMethod, location }) => {
  const methodLabel =
    transactionMethod === 'both' ? '택배거래, 직거래 가능' :
    transactionMethod === 'delivery' ? '택배거래' : '직거래';

  return (
    <div id="shipping" className="scroll-mt-[300px] space-y-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">배송 정보</h3>
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex border-b border-gray-50 pb-4">
          <span className="w-32 text-gray-500 font-medium">배송 방법</span>
          <span className="text-gray-900">{methodLabel}</span>
        </div>
        <div className="flex border-b border-gray-50 pb-4">
          <span className="w-32 text-gray-500 font-medium">배송 정보</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-900">배송비 별도</span>
            <span className="text-xs text-gray-400 font-medium">(판매자와 협의)</span>
          </div>
        </div>
        <div className="flex">
          <span className="w-32 text-gray-500 font-medium">거래 지역</span>
          <span className="text-gray-900">{location}</span>
        </div>
      </div>
    </div>
  );
};
