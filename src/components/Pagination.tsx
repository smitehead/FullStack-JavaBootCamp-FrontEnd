import React from 'react';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const groupSize = 5;
  const currentGroup = Math.ceil(currentPage / groupSize);
  const startPage = (currentGroup - 1) * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, totalPages);

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center space-x-2 pt-12">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all font-bold"
      >
        <BsChevronLeft className="w-5 h-5" />
      </button>

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-10 h-10 flex items-center justify-center rounded font-bold transition-all ${
            p === currentPage
              ? 'bg-brand text-white shadow-lg shadow-brand/10'
              : 'border border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all font-bold"
      >
        <BsChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
