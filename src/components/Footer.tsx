import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F8F9FA] pt-16 pb-12 border-t border-gray-100">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <div className="flex items-center space-x-2 mb-6">
              <span className="text-xl font-bold text-gray-700 tracking-tight">JAVAJAVA</span>
            </div>
            <div className="space-y-2 text-sm text-gray-500 font-medium leading-relaxed">
              <p>대표이사: 홍길동 | 사업자등록번호: 123-45-67890</p>
              <p>통신판매업신고: 2024-서울강남-00000</p>
              <p>주소: 서울특별시 강남구 테헤란로 123, 옥션타워 15층</p>
              <p>이메일: help@auctionhouse.co.kr | 고객센터: 1588-0000</p>
              <p className="pt-4 text-xs text-gray-400">© 2024 AuctionHouse Inc. All rights reserved.</p>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">서비스 및 정책</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li><Link to="/about?tab=intro" className="hover:text-gray-900 transition-colors">서비스 소개</Link></li>
              <li><Link to="/about?tab=privacy" className="hover:text-gray-900 transition-colors">개인정보처리방침</Link></li>
              <li><Link to="/about?tab=terms" className="hover:text-gray-900 transition-colors">이용약관</Link></li>
              <li><Link to="/about?tab=policy" className="hover:text-gray-900 transition-colors">운영정책</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">고객지원</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li><Link to="/notice" className="hover:text-gray-900 transition-colors">공지사항</Link></li>
              <li><Link to="/faq" className="hover:text-gray-900 transition-colors">자주 묻는 질문 (FAQ)</Link></li>
              <li><Link to="/inquiry" className="hover:text-gray-900 transition-colors">1:1 문의하기</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-6 text-[11px] font-bold text-gray-400">
            <a href="#" className="hover:text-gray-600">구매안전서비스 가입 사실 확인</a>
            <span className="opacity-30">|</span>
            <a href="#" className="hover:text-gray-600">서울보증보험 가입</a>
          </div>
          <p className="text-[11px] font-medium text-gray-400">
            본 사이트의 상품/판매자 정보는 거래 당사자의 책임하에 제공됩니다.
          </p>
        </div>
      </div>
    </footer>
  );
};
