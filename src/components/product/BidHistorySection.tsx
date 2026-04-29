import React, { useState } from 'react';
import { BidHistory } from '@/types';

interface BidHistorySectionProps {
  bids: BidHistory[];
}

export const BidHistorySection: React.FC<BidHistorySectionProps> = ({ bids }) => {
  const [visibleCount, setVisibleCount] = useState(5);

  return (
    <div id="history" className="scroll-mt-[300px] space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">입찰 기록</h3>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-6 py-4 text-left font-bold">입찰자</th>
              <th className="px-6 py-4 text-right font-bold">입찰 금액</th>
              <th className="px-6 py-4 text-right font-bold">입찰 시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bids.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, visibleCount).map(bid => (
              <tr key={bid.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 max-w-[150px] truncate" title={bid.bidderName}>{bid.bidderName}</td>
                <td className="px-6 py-4 text-right font-bold text-brand">{(bid.amount || 0).toLocaleString()}원</td>
                <td className="px-6 py-4 text-right text-gray-400">{new Date(bid.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bids.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + 5, bids.length))}
            className="w-full py-4 bg-gray-50 text-gray-500 font-bold text-sm hover:bg-gray-100 transition-colors border-t border-gray-100 flex items-center justify-center gap-2"
          >
            입찰 기록 5개 더보기 ({visibleCount} / {bids.length})
          </button>
        )}
      </div>
    </div>
  );
};
