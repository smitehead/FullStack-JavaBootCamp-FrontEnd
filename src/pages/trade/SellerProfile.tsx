import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { 
  BsBox2, BsChatLeft, BsBox2Fill, BsChatLeftFill, 
  BsShieldFill, BsFlagFill, BsArrowLeft
} from 'react-icons/bs';
import { Product } from '@/types';
import { showToast } from '@/components/toastService';
import api from '@/services/api';
import { resolveImageUrl, resolveImageUrls, getProfileImageUrl } from '@/utils/imageUtils';
import { getMemberNo } from '@/utils/memberUtils';
import { useAppContext } from '@/context/AppContext';

interface SellerInfo {
  sellerNo: number;
  nickname: string;
  profileImgUrl: string | null;
  mannerTemp: number;
  joinedAt: string;
}

function mapToProduct(item: any): Product {
  return {
    ...item,
    id: String(item.id),
    title: item.title || '',
    description: '',
    category: item.category || '기타',
    seller: { id: 'unknown', nickname: '', profileImage: '', points: 0, mannerTemp: 36.5, joinedAt: '' },
    startPrice: item.currentPrice || 0,
    currentPrice: item.currentPrice || 0,
    minBidIncrement: item.minBidUnit || 1000,
    startTime: new Date().toISOString(),
    endTime: item.endTime || new Date().toISOString(),
    images: resolveImageUrls(item.images || []),
    participantCount: item.participantCount || 0,
    bids: [],
    status: item.status || 'active',
    location: item.location || '',
    transactionMethod: 'both',
    isWishlisted: item.isWishlisted || false,
    bidStatus: item.bidStatus || null,
    auctionResultStatus: item.auctionResultStatus || null,
    resultNo: item.resultNo || null,
  };
}


export const SellerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState<'selling' | 'reviews'>('selling');
  const [sellingFilter, setSellingFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const memberNo = id.replace(/[^0-9]/g, '');
    if (!memberNo) return;

    setLoading(true);
    Promise.all([
      api.get(`/members/${memberNo}/seller-profile`),
      api.get(`/reviews/target/${memberNo}`),
    ])
      .then(([profileRes, reviewRes]) => {
        const data = profileRes.data;
        setSeller({
          sellerNo: data.sellerNo,
          nickname: data.nickname,
          profileImgUrl: resolveImageUrl(data.profileImgUrl),
          mannerTemp: data.mannerTemp ?? 36.5,
          joinedAt: data.joinedAt ? new Date(data.joinedAt).toLocaleDateString() : '-',
        });
        setSellerProducts((data.products || []).map(mapToProduct));
        setReviews(reviewRes.data || []);
      })
      .catch(() => showToast('판매자 정보를 불러오지 못했습니다.', 'error'))
      .finally(() => setLoading(false));

    // 차단 여부 조회
    if (user) {
      api.get(`/members/me/blocked/${memberNo}`)
        .then(res => setIsBlocked(res.data.blocked))
        .catch(() => { });
    }
  }, [id, user]);

  const handleBlockToggle = async () => {
    if (!user) {
      showToast('로그인이 필요한 서비스입니다.', 'warning');
      return;
    }
    const memberNo = id?.replace(/[^0-9]/g, '');
    if (!memberNo) return;

    try {
      if (isBlocked) {
        await api.delete(`/members/me/blocked/${memberNo}`);
        setIsBlocked(false);
        showToast(`${seller?.nickname}님 차단이 해제되었습니다.`, 'success');
      } else {
        await api.post(`/members/me/blocked/${memberNo}`);
        setIsBlocked(true);
        showToast(`${seller?.nickname}님을 차단했습니다.`, 'success');
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || '처리 중 오류가 발생했습니다.', 'error');
    }
  };


  const visibleProducts = sellerProducts.filter(p => p.status === 'active' || p.auctionResultStatus === '구매확정');

  const filteredProducts = visibleProducts.filter(p => {
    if (sellingFilter === 'all') return true;
    if (sellingFilter === 'active') return p.status === 'active';
    if (sellingFilter === 'completed') return p.auctionResultStatus === '구매확정';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-4">
      <button
        onClick={() => navigate(-1)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors mb-4"
      >
        <BsArrowLeft className="w-6 h-6 text-gray-900" />
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8 relative overflow-hidden">

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Profile Image */}
          <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl flex-shrink-0 bg-gray-100 flex items-center justify-center">
            <img src={getProfileImageUrl(seller.profileImgUrl)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>

          {/* User Info */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-1">{seller.nickname}</h2>
                <div className="flex items-center justify-center md:justify-start gap-3 text-sm text-gray-400 font-medium">
                  <span>가입일: {seller.joinedAt}</span>
                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                  <span>판매상품 {visibleProducts.length}개</span>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={handleBlockToggle}
                      className={`text-xs font-medium transition-colors flex items-center ${isBlocked ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <BsShieldFill className={`w-3 h-3 mr-1 ${isBlocked ? 'text-blue-500' : ''}`} /> {isBlocked ? '차단풀기' : '차단하기'}
                    </button>
                    <Link
                      to={`/report?sellerId=${seller.sellerNo}&sellerNickname=${encodeURIComponent(seller.nickname)}`}
                      className="text-xs font-medium hover:text-brand transition-colors flex items-center"
                    >
                      <BsFlagFill className="w-3 h-3 mr-1" /> 신고하기
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-emerald-600">매너온도</span>
                    <span className="text-xl font-bold text-emerald-600">{Number(seller.mannerTemp).toFixed(1)}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-300">100</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(seller.mannerTemp / 100) * 100}%` }}></div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <BsBox2Fill className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">전체 판매</p>
                  <p className="text-xl font-bold text-gray-900">{visibleProducts.length}<span className="text-sm font-medium ml-1">건</span></p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-xl">
                  <BsChatLeftFill className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">받은 후기</p>
                  <p className="text-xl font-bold text-gray-900">{reviews.length}<span className="text-sm font-medium ml-1">건</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <button
              onClick={() => setActiveTab('selling')}
              className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'selling' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BsBox2 className="w-5 h-5 mr-3" /> 판매 상품
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'reviews' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BsChatLeft className="w-5 h-5 mr-3" /> 거래 후기
            </button>
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {activeTab === 'selling' ? '판매 상품' : '거래 후기'}
            </h3>

            {activeTab === 'selling' && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {(['all', 'active', 'completed'] as const).map(f => (
                  <button key={f} onClick={() => setSellingFilter(f)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${sellingFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {f === 'all' ? '전체' : f === 'active' ? '경매중' : '판매완료'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'selling' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProducts.length > 0 ? (
                filteredProducts.map(p => {
                  const isInvolved = (user && getMemberNo(user) === seller.sellerNo) || !!p.bidStatus;
                  return (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      isSold={p.status === 'completed' && isInvolved} 
                      hideOverlay={p.status === 'completed' && !isInvolved}
                    />
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <BsBox2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-medium">등록된 상품이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            reviews.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                <BsChatLeft className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium">받은 후기가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">받은 태그</h4>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const tagCounts: Record<string, number> = {};
                      reviews.forEach(r => r.tags?.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
                      const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
                      return sortedTags.map(([tag, count]) => (
                        <div key={tag} className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-gray-100">
                          <span className="text-sm font-medium text-gray-700">{tag}</span>
                          <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.reviewNo} className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700">{review.writerNickname}</span>
                          <span className="text-xs text-gray-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {review.tags.map((tag: string) => (
                            <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {review.content && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.content}</p>
                      )}
                      {review.productTitle && (
                        <Link
                          to={`/products/${review.productNo}`}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                          <BsBox2 className="w-3.5 h-3.5" />
                          {review.productTitle}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
