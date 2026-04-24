import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import { CATEGORY_DATA, LOCATION_DATA } from '@/constants';
import { showToast } from '@/components/toastService';

import { BsCrosshair, BsDash, BsArrowCounterclockwise, BsSearch, BsChevronRight, BsX, BsPlusLg } from 'react-icons/bs';
import { Product } from '@/types';
import { resolveImageUrls } from '@/utils/imageUtils';
import { useAppContext } from '@/context/AppContext';
import { getMemberNo } from '@/utils/memberUtils';

type SortOption = 'all' | 'popular' | 'ending' | 'latest';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppContext(); // 로그인 사용자 정보 (memberNo 전송용)

  // 데이터 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // 필터 상태 (URL과 동기화)
  const [largeCat, setLargeCat] = useState(searchParams.get('large') || '');
  const [mediumCat, setMediumCat] = useState(searchParams.get('medium') || '');
  const [smallCat, setSmallCat] = useState(searchParams.get('small') || '');

  // 카테고리 펼침 상태
  const [expandedLarge, setExpandedLarge] = useState<string | null>(searchParams.get('large'));
  const [expandedMedium, setExpandedMedium] = useState<string | null>(searchParams.get('medium'));

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [neighborhood, setNeighborhood] = useState(searchParams.get('neighborhood') || '');

  const [delivery, setDelivery] = useState(searchParams.get('delivery') === 'true');
  const [faceToFace, setFaceToFace] = useState(searchParams.get('face') === 'true');

  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'all');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');

  // UI 상태
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);

  // 두 스크롤 콜백 ref - 마지막 요소 관래
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    }, { threshold: 0.1 }); // 10% 보이면 바로 발화
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // 이전 페이지 ref - 중복 포치 방지
  const fetchedPageRef = useRef<number>(0);

  // 데이터 가져오기 함수
  const fetchProducts = useCallback(async (pageToFetch: number, isNewSearch: boolean) => {
    if (loading) return;
    setLoading(true);

    try {
      const memberNo = getMemberNo(user) ?? undefined;
      
      // searchParams에서 직접 값 추출 (Race Condition 방지)
      const curLarge = searchParams.get('large');
      const curMedium = searchParams.get('medium');
      const curSmall = searchParams.get('small');
      const curMinP = searchParams.get('minPrice');
      const curMaxP = searchParams.get('maxPrice');
      const curCity = searchParams.get('city');
      const curDistrict = searchParams.get('district');
      const curNeighborhood = searchParams.get('neighborhood');
      const curDel = searchParams.get('delivery');
      const curFace = searchParams.get('face');
      const curSort = searchParams.get('sort') || 'all';
      const curKeyword = searchParams.get('q');

      const params = {
        page: pageToFetch,
        size: 16,
        large: curLarge ? parseInt(curLarge, 10) : undefined,
        medium: curMedium ? parseInt(curMedium, 10) : undefined,
        small: curSmall ? parseInt(curSmall, 10) : undefined,
        minPrice: curMinP ? parseInt(curMinP) : undefined,
        maxPrice: curMaxP ? parseInt(curMaxP) : undefined,
        city: curCity || undefined,
        district: curDistrict || undefined,
        neighborhood: curNeighborhood || undefined,
        delivery: curDel === 'true' || undefined,
        face: curFace === 'true' || undefined,
        sort: curSort,
        keyword: curKeyword || undefined,
        memberNo: memberNo || undefined,
      };

      const response = await api.get('/products', { params });
      const data = response.data;

      const mappedProducts: Product[] = (data.content || []).map((item: any) => ({
        ...item,
        id: String(item.id),
        seller: item.seller || { id: 'unknown', nickname: '판매자' },
        images: resolveImageUrls(item.images || []),
        status: item.status || 'active',
        participantCount: item.participantCount || 0,
        currentPrice: item.currentPrice || 0,
        endTime: item.endTime || new Date().toISOString()
      }));

      if (isNewSearch) {
        setProducts(mappedProducts);
      } else {
        setProducts(prev => [...prev, ...mappedProducts]);
      }

      setTotalElements(data.totalElements || 0);
      setHasMore(!data.last);
    } catch (error) {
      console.error('상품 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams, user]);

  // 필터 변경 시 초기화 + 첫 페이지 로드
  useEffect(() => {
    fetchedPageRef.current = 1;
    setPage(1);
    fetchProducts(1, true);
  }, [searchParams, fetchProducts]);

  // 페이지 변경 시(무한 스크롤) 추가 로드
  useEffect(() => {
    if (page <= 1 || page <= fetchedPageRef.current) return;
    fetchedPageRef.current = page;
    fetchProducts(page, false);
  }, [page, fetchProducts]);

  // URL 변경 시 상태 동기화 (예: 뒤로가기 버튼)
  useEffect(() => {
    const l = searchParams.get('large') || '';
    const m = searchParams.get('medium') || '';
    const s = searchParams.get('small') || '';
    setLargeCat(l);
    setMediumCat(m);
    setSmallCat(s);
    if (l) setExpandedLarge(l);
    if (m) setExpandedMedium(m);

    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setCity(searchParams.get('city') || '');
    setDistrict(searchParams.get('district') || '');
    setNeighborhood(searchParams.get('neighborhood') || '');
    setDelivery(searchParams.get('delivery') === 'true');
    setFaceToFace(searchParams.get('face') === 'true');
    setSort((searchParams.get('sort') as SortOption) || 'all');
    setKeyword(searchParams.get('q') || '');
  }, [searchParams]);

  // 파생 데이터 (선택된 카테고리·지역 정보)
  const selectedLarge = CATEGORY_DATA.find(c => c.id === largeCat);
  const selectedMedium = selectedLarge?.subCategories?.find(c => c.id === mediumCat);
  const selectedSmall = selectedMedium?.subCategories?.find(c => c.id === smallCat);

  const selectedCityData = LOCATION_DATA.find(l => l.name === city || l.short === city);
  const districtOptions = selectedCityData?.sub || [];
  const selectedDistrictData = districtOptions.find(d => d.name === district);
  const neighborhoodOptions = selectedDistrictData?.sub || [];

  const updateParams = (newParams: any) => {
    const params = Object.fromEntries(searchParams.entries());
    const merged = { ...params, ...newParams };
    Object.keys(merged).forEach(key => {
      if (merged[key] === '' || merged[key] === undefined || merged[key] === null || merged[key] === false) {
        delete merged[key];
      }
    });
    setSearchParams(merged);
  };

  const handleLargeClick = (id: string) => {
    setLargeCat(id);
    setMediumCat('');
    setSmallCat('');
    if (id === '') {
      updateParams({ large: '', medium: '', small: '' });
      setExpandedLarge(null);
      setExpandedMedium(null);
    } else {
      updateParams({ large: id, medium: '', small: '' });
      setExpandedLarge(id);
      setExpandedMedium(null);
    }
  };

  const handleMediumClick = (id: string) => {
    setMediumCat(id);
    setSmallCat('');
    updateParams({ medium: id, small: '' });
    setExpandedMedium(id);
  };

  const handleSmallClick = (id: string) => {
    setSmallCat(id);
    updateParams({ small: id });
  };

  const handleSortChange = (newSort: SortOption) => {
    updateParams({ sort: newSort });
  };

  const resetAll = () => {
    setSearchParams({});
    setLargeCat('');
    setMediumCat('');
    setSmallCat('');
    setExpandedLarge(null);
    setExpandedMedium(null);
    setMinPrice('');
    setMaxPrice('');
    setCity('');
    setDistrict('');
    setNeighborhood('');
    setDelivery(false);
    setFaceToFace(false);
    setSort('all');
    setKeyword('');
  };

  const handleCurrentLocationFilter = () => {
    if (!user?.address) {
      showToast('로그인 후 주소를 등록해주세요.', 'warning');
      return;
    }

    // 주소 형식: "경남 창원시 성산구 남산동" 또는 "서울 강남구 역삼동"
    const parts = user.address.split(' ');
    if (parts.length < 1) return;

    const sidoPart = parts[0];
    const sigunguPart = parts[1] || '';
    const bnamePart = parts[2] || '';
    const restPart = parts[3] || '';

    // 1. 시/도 찾기
    const foundCity = LOCATION_DATA.find(l => l.short === sidoPart || l.name === sidoPart);
    if (!foundCity) return;

    // 셀렉트 박스에서 short(예: '경남', '서울')를 value로 사용하므로 short로 지정
    let targetCity = foundCity.short;
    let targetDistrict = '';
    let targetNeighborhood = '';

    if (sigunguPart) {
      // 2. 시/군/구 찾기
      // 창원시 성산구 -> 데이터상 "창원시성산구" 형태일 수 있으므로 우선 결합된 형태로 검색
      let searchDistrictFull = (sigunguPart + bnamePart).replace(/\s/g, '');
      let foundDistrict = foundCity.sub.find(d => d.name.replace(/\s/g, '') === searchDistrictFull);

      // 결합된 형태가 없다면 단일 구역(sigunguPart)으로 검색
      if (!foundDistrict) {
        foundDistrict = foundCity.sub.find(d => d.name === sigunguPart);
      }

      if (foundDistrict) {
        targetDistrict = foundDistrict.name;

        // 3. 읍/면/동 찾기
        // 찾은 시군구가 "창원시성산구"처럼 조합된 것이라면 읍면동은 4번째(restPart) 부분일 확률이 높음
        let searchNeighborhood = (foundDistrict.name.replace(/\s/g, '') === searchDistrictFull) ? restPart : bnamePart;

        if (searchNeighborhood && foundDistrict.sub.includes(searchNeighborhood)) {
          targetNeighborhood = searchNeighborhood;
        } else if (bnamePart && foundDistrict.sub.includes(bnamePart)) {
          targetNeighborhood = bnamePart; // fallback
        } else if (restPart && foundDistrict.sub.includes(restPart)) {
          targetNeighborhood = restPart; // fallback
        }
      }
    }

    // 상태 업데이트 및 실제 검색 실행
    setCity(targetCity);
    setDistrict(targetDistrict);
    setNeighborhood(targetNeighborhood);
    updateParams({ city: targetCity, district: targetDistrict, neighborhood: targetNeighborhood });
    showToast(`내 동네(${user.address})로 필터링되었습니다.`, 'success');
  };

  const removeFilter = (key: string) => {
    if (key === 'price') {
      updateParams({ minPrice: '', maxPrice: '' });
    } else if (key === 'location') {
      updateParams({ city: '', district: '', neighborhood: '' });
    } else if (key === 'delivery') {
      updateParams({ delivery: '' });
    } else if (key === 'face') {
      updateParams({ face: '' });
    } else if (key === 'large') {
      updateParams({ large: '', medium: '', small: '' });
      setExpandedLarge(null);
      setExpandedMedium(null);
    } else if (key === 'medium') {
      updateParams({ medium: '', small: '' });
      setExpandedMedium(null);
    } else if (key === 'small') {
      updateParams({ small: '' });
    } else if (key === 'q') {
      setKeyword('');
      updateParams({ q: '' });
    }
  };

  if (loading && products.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="spinner-border w-12 h-12" />
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-10 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 space-x-2">
        <span className="cursor-pointer hover:text-gray-900" onClick={() => navigate('/')}>홈</span>
        <BsChevronRight className="w-4 h-4" />
        <span className={`cursor-pointer ${!largeCat ? 'font-bold text-gray-900' : 'hover:text-gray-900'}`} onClick={() => handleLargeClick('')}>전체</span>
        {selectedLarge && (
          <>
            <BsChevronRight className="w-4 h-4" />
            <span className={`cursor-pointer ${!mediumCat ? 'font-bold text-gray-900' : 'hover:text-gray-900'}`} onClick={() => handleLargeClick(largeCat)}>{selectedLarge.name}</span>
          </>
        )}
        {selectedMedium && (
          <>
            <BsChevronRight className="w-4 h-4" />
            <span className={`cursor-pointer ${!smallCat ? 'font-bold text-gray-900' : 'hover:text-gray-900'}`} onClick={() => handleMediumClick(mediumCat)}>{selectedMedium.name}</span>
          </>
        )}
        {selectedSmall && (
          <>
            <BsChevronRight className="w-4 h-4" />
            <span className="font-bold text-gray-900">{selectedSmall.name}</span>
          </>
        )}
      </nav>

      {/* Filter Container */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {/* Category Section */}
        <div className="flex border-b border-gray-100">
          <div className="w-32 bg-gray-50 p-4 flex-shrink-0 flex flex-col border-r border-gray-100">
            <div className="flex items-center cursor-pointer group" onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}>
              <span className="text-sm font-bold text-gray-700 group-hover:text-brand transition-colors">카테고리</span>
              {isCategoryExpanded ? (
                <BsDash className="w-3 h-3 ml-auto text-gray-400 group-hover:text-brand transition-colors" />
              ) : (
                <BsPlusLg className="w-3 h-3 ml-auto text-gray-400 group-hover:text-brand transition-colors" />
              )}
            </div>
          </div>
          <div className="flex-grow flex flex-col">
            <div className="px-6 pt-4 pb-2 flex items-center space-x-2 text-sm">
              <button
                onClick={() => handleLargeClick('')}
                className={`font-bold ${!largeCat ? 'text-brand' : 'text-gray-900 hover:underline'}`}
              >
                전체
              </button>
              {selectedLarge && (
                <>
                  <BsChevronRight className="w-3 h-3 text-gray-300" />
                  <button
                    onClick={() => { setMediumCat(''); setSmallCat(''); updateParams({ medium: '', small: '' }); }}
                    className={`font-bold ${!mediumCat ? 'text-brand' : 'text-gray-900 hover:underline'}`}
                  >
                    {selectedLarge.name}
                  </button>
                </>
              )}
              {selectedMedium && (
                <>
                  <BsChevronRight className="w-3 h-3 text-gray-300" />
                  <button
                    onClick={() => { setSmallCat(''); updateParams({ small: '' }); }}
                    className={`font-bold ${!smallCat ? 'text-brand' : 'text-gray-900 hover:underline'}`}
                  >
                    {selectedMedium.name}
                  </button>
                </>
              )}
              {selectedSmall && (
                <>
                  <BsChevronRight className="w-3 h-3 text-gray-300" />
                  <span className="font-bold text-brand">{selectedSmall.name}</span>
                </>
              )}
            </div>

            <div className={`px-6 pb-6 flex-grow transition-all duration-300 ${isCategoryExpanded ? 'opacity-100' : 'h-0 opacity-0 overflow-hidden p-0'}`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-3 gap-x-8 mt-2">
                {!largeCat ? (
                  CATEGORY_DATA.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleLargeClick(cat.id)}
                      className="text-sm text-left text-gray-600 hover:text-brand hover:font-bold transition-all"
                    >
                      {cat.name}
                    </button>
                  ))
                ) : !mediumCat ? (
                  selectedLarge?.subCategories?.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleMediumClick(sub.id)}
                      className="text-sm text-left text-gray-600 hover:text-brand hover:font-bold transition-all"
                    >
                      {sub.name}
                    </button>
                  ))
                ) : (
                  selectedMedium?.subCategories?.map(small => (
                    <button
                      key={small.id}
                      onClick={() => handleSmallClick(small.id)}
                      className={`text-sm text-left transition-all ${smallCat === small.id ? 'text-brand font-bold' : 'text-gray-600 hover:text-brand hover:font-bold'}`}
                    >
                      {small.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price Row */}
        <div className="flex border-b border-gray-100">
          <div className="w-32 bg-gray-50 p-4 flex-shrink-0 flex items-center border-r border-gray-100">
            <span className="text-sm font-bold text-gray-700">가격대</span>
          </div>
          <div className="p-4 flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="최소 금액"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-40 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <span className="absolute right-3 top-2 text-gray-400 text-sm">원</span>
            </div>
            <span className="text-gray-400">~</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="최대 금액"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-40 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <span className="absolute right-3 top-2 text-gray-400 text-sm">원</span>
            </div>
            <button
              onClick={() => updateParams({ minPrice, maxPrice })}
              className="bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              적용
            </button>
          </div>
        </div>

        {/* Location Row */}
        <div className="flex border-b border-gray-100">
          <div className="w-32 bg-gray-50 p-4 flex-shrink-0 flex items-center border-r border-gray-100">
            <span className="text-sm font-bold text-gray-700">지역</span>
          </div>
          <div className="p-4 flex items-center space-x-2">
            <div className="flex gap-2">
              {/* 1. 시/도 선택 */}
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setDistrict('');
                  setNeighborhood('');
                }}
                className="w-32 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:border-gray-400"
              >
                <option value="">시/도 선택</option>
                {LOCATION_DATA.map(l => (
                  <option key={l.name} value={l.short}>{l.short}</option>
                ))}
              </select>

              {/* 2. 시/군/구 선택 */}
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setNeighborhood('');
                }}
                disabled={!city || districtOptions.length === 0}
                className="w-32 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">시/군/구 선택</option>
                {districtOptions.map(sg => (
                  <option key={sg.name} value={sg.name}>{sg.name || '전체'}</option>
                ))}
              </select>

              {/* 3. 읍/면/동 선택 */}
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={!district || neighborhoodOptions.length === 0}
                className="w-32 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">읍/면/동 선택</option>
                {neighborhoodOptions.map(emd => (
                  <option key={emd} value={emd}>{emd}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => updateParams({ city, district, neighborhood })}
              className="bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm"
            >
              적용
            </button>
            <div className="flex-grow"></div>
            <button
              onClick={handleCurrentLocationFilter}
              className="p-2 text-gray-400 hover:text-[#FF5A5A] transition-colors group relative"
              title="내 위치로 필터링"
            >
              <BsCrosshair className="w-5 h-5" />
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                내 위치로 찾기
              </div>
            </button>
          </div>
        </div>

        {/* Delivery Row */}
        <div className="flex">
          <div className="w-32 bg-gray-50 p-4 flex-shrink-0 flex items-center border-r border-gray-100">
            <span className="text-sm font-bold text-gray-700">배송형태</span>
          </div>
          <div className="p-4 flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={faceToFace}
                onChange={(e) => { setFaceToFace(e.target.checked); updateParams({ face: e.target.checked ? 'true' : '' }); }}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">대면거래</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={delivery}
                onChange={(e) => { setDelivery(e.target.checked); updateParams({ delivery: e.target.checked ? 'true' : '' }); }}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">택배거래</span>
            </label>
          </div>
        </div>

        {/* Active Filter Chips */}
        <div className="bg-gray-50/50 border-t border-gray-100 p-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {largeCat && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>{CATEGORY_DATA.find(c => c.id === largeCat)?.name}</span>
                <button onClick={() => removeFilter('large')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {mediumCat && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>{selectedMedium?.name}</span>
                <button onClick={() => removeFilter('medium')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {smallCat && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>{selectedSmall?.name}</span>
                <button onClick={() => removeFilter('small')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {(searchParams.get('minPrice') || searchParams.get('maxPrice')) && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>
                  {searchParams.get('minPrice') ? `${Number(searchParams.get('minPrice')).toLocaleString()}원` : '0원'} ~
                  {searchParams.get('maxPrice') ? `${Number(searchParams.get('maxPrice')).toLocaleString()}원` : '무제한'}
                </span>
                <button onClick={() => removeFilter('price')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {(searchParams.get('city') || searchParams.get('district') || searchParams.get('neighborhood')) && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>
                  {LOCATION_DATA.find(l => l.short === searchParams.get('city') || l.name === searchParams.get('city'))?.short || searchParams.get('city')}
                  {searchParams.get('district') && ` ${searchParams.get('district')}`}
                  {searchParams.get('neighborhood') && ` ${searchParams.get('neighborhood')}`}
                </span>
                <button onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('city');
                  newParams.delete('district');
                  newParams.delete('neighborhood');
                  setSearchParams(newParams);

                  setCity('');
                  setDistrict('');
                  setNeighborhood('');
                }} className="ml-2 hover:text-brand-dark">
                  <BsX className="w-3 h-3" />
                </button>
              </div>
            )}
            {delivery && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>택배거래</span>
                <button onClick={() => removeFilter('delivery')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {faceToFace && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <span>대면거래</span>
                <button onClick={() => removeFilter('face')} className="ml-2 hover:text-brand-dark"><BsX className="w-3 h-3" /></button>
              </div>
            )}
            {searchParams.get('q') && (
              <div className="flex items-center bg-white border border-gray-200 text-brand px-3 py-1 rounded-full text-xs font-medium">
                <BsSearch className="w-3 h-3 mr-1" />
                <span>"{searchParams.get('q')}"</span>
                <button
                  onClick={() => removeFilter('q')}
                  className="ml-2 hover:text-brand-dark"
                >
                  <BsX className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={resetAll}
            className="flex items-center text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            <BsArrowCounterclockwise className="w-4 h-4 mr-1" /> 초기화
          </button>
        </div>
      </div>

      {/* List Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-gray-900">총 <span className="text-gray-900">{totalElements}</span>개 상품</span>
        </div>

        <div className="flex items-center space-x-1">
          {[
            { id: 'all', label: '전체' },
            { id: 'popular', label: '인기순' },
            { id: 'ending', label: '종료임박순' },
            { id: 'latest', label: '최신순' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => handleSortChange(opt.id as SortOption)}
              className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${sort === opt.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            ref={index === products.length - 1 ? lastElementRef : null}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Loading & No Results */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="spinner-border w-6 h-6" />
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="py-32 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <BsSearch className="w-16 h-16 text-gray-200 mx-auto mb-6" />
          <p className="text-gray-500 text-xl font-bold mb-2">조건에 맞는 상품이 없습니다.</p>
          <p className="text-gray-400 text-sm mb-8">다른 검색어나 필터를 사용해보세요.</p>
          <button
            onClick={resetAll}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 underline underline-offset-4"
          >
            필터 초기화
          </button>
        </div>
      )}
    </div>
  );
};
