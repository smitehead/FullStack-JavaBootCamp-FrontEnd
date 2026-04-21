import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BsBell, BsShield, BsShieldCheck, BsCreditCard, BsBank, BsPersonDash, BsExclamationCircle, BsCheckCircle, BsPersonFillGear, BsChevronDown, BsX, BsToggle2On, BsToggle2Off } from 'react-icons/bs';
import api from '@/services/api';
import { showToast } from '@/components/toastService';
import { useAppContext } from '@/context/AppContext';
import { getProfileImageUrl } from '@/utils/imageUtils';

// 카카오 우편번호 서비스 타입 선언
declare global {
  interface Window {
    daum: any;
  }
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') as 'notification' | 'block' | 'profile' | 'card' | 'account' | null;
  const [activeTab, setActiveTab] = useState<'notification' | 'block' | 'profile' | 'card' | 'account'>((initialTab as any) || 'notification');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const { user, logout, updateCurrentUserAddress } = useAppContext();
  const [activeProductCount, setActiveProductCount] = useState(0);
  const [tradingProductCount, setTradingProductCount] = useState(0);
  const [settings, setSettings] = useState({
    auctionEnd: true,
    newBid: true,
    marketing: false,
    chat: true
  });
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // 탈퇴 조건 확인용 진행 중 상품 조회
  useEffect(() => {
    if (!user) return;
    api.get('/products/my-selling').then(res => {
      const list = res.data?.content ?? res.data ?? [];
      setActiveProductCount(list.filter((p: any) => p.status === 0).length);
      setTradingProductCount(list.filter((p: any) => p.status === 0).length);
    }).catch(() => { });
  }, [user]);

  // 프로필 초기 데이터를 API에서 로드
  useEffect(() => {
    if (!user) return;

    // API 로드 전 초기값 설정 (user context 기반)
    setFormData(prev => ({
      ...prev,
      nickname: user.nickname,
      addrShort: user.address || '',
    }));

    api.get(`/members/me`).then(res => {
      setFormData({
        nickname: res.data.nickname,
        email: res.data.email,
        phoneNum: res.data.phoneNum || '',
        addrRoad: res.data.addrRoad || '',
        addrDetail: res.data.addrDetail || '',
        addrShort: res.data.addrShort || '',
      });
      setSettings({
        auctionEnd: res.data.notifyAuctionEnd === 1,
        newBid: res.data.notifyNewBid === 1,
        chat: res.data.notifyChat === 1,
        marketing: res.data.marketingAgree === 1,
      });
    }).catch(() => { });
  }, [user]);

  // 차단 사용자 목록 로드
  useEffect(() => {
    if (activeTab !== 'block' || !user) return;
    api.get('/members/me/blocked')
      .then(res => setBlockedUsers(res.data))
      .catch(() => { });
  }, [activeTab, user]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isProfileSaveModalOpen, setIsProfileSaveModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'confirm' | 'reason' | 'input' | 'success'>('confirm');
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawReasonDetail, setWithdrawReasonDetail] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'verify' | 'success'>('input');
  const [passwordStep, setPasswordStep] = useState<'verify' | 'input' | 'success'>('verify');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);

  const openPostcode = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        // 도로명 주소 우선, 없으면 지번
        const fullAddress = data.roadAddress || data.jibunAddress;

        // 화면 표시용 짧은 주소 조립 (당근마켓 스타일)
        // sido + sigungu + bname(읍면동) 조합
        // 예: "서울특별시 강남구 역삼동" → "서울 강남구 역삼동"
        const sido = data.sido
          .replace('특별시', '').replace('광역시', '').replace('특별자치시', '').replace('도', '').trim();
        const sigungu = data.sigungu || '';
        const bname = data.bname || '';  // 읍면동 이름
        const addrShort = `${sido} ${sigungu} ${bname}`.trim();

        setFormData(prev => ({
          ...prev,
          addrRoad: fullAddress,    // 도로명 전체 주소
          addrDetail: '',
          addrShort,               // "서울 강남구 역삼동"
        }));
      },
    }).open();
  };

  // Profile Edit state
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    phoneNum: '',
    addrRoad: '',
    addrDetail: '',
    addrShort: '',
  });


  const [newEmailId, setNewEmailId] = useState('');
  const [newEmailDomain, setNewEmailDomain] = useState('');
  const [newCustomDomain, setNewCustomDomain] = useState('');
  const [isNewCustomDomain, setIsNewCustomDomain] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const getFullNewEmail = () => {
    const domain = isNewCustomDomain ? newCustomDomain : newEmailDomain;
    return domain ? `${newEmailId}@${domain}` : `${newEmailId}@`;
  };

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);

  const [registeredCard, setRegisteredCard] = useState<{
    cardName: string;
    cardNo: string;
    createdAt?: string;
  } | null>(null);
  const [isCardLoading, setIsCardLoading] = useState(true);

  useEffect(() => {
    api.get('/points/billing-key')
      .then((res) => {
        if (res.data.registered) {
          setRegisteredCard({
            cardName: res.data.cardName,
            cardNo: res.data.cardNo,
            createdAt: res.data.createdAt,
          });
        }
      })
      .catch(() => { })
      .finally(() => setIsCardLoading(false));
  }, []);

  const handleDeleteRegisteredCard = async () => {
    if (!confirm('등록된 카드를 삭제하시겠습니다?\n카드 삭제 후에는 간편 충전을 사용할 수 없습니다.')) return;
    try {
      await api.delete('/points/billing-key');
      setRegisteredCard(null);
      showToast('카드가 성공적으로 삭제되었습니다.', 'success');
    } catch (e) {
      showToast('카드 삭제 중 오류가 발생했습니다.', 'error');
    }
  }

  const [isProfileSaving, setIsProfileSaving] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleProfileSave = async () => {
    setIsProfileSaving(true);
    try {
      await api.put('/members/me/profile', {
        nickname: formData.nickname,
        phoneNum: formData.phoneNum,
        addrRoad: formData.addrRoad,
        addrDetail: formData.addrDetail,
        addrShort: formData.addrShort,
      });

      // 전역 상태(Header 등) 업데이트를 위해 호출
      if (updateCurrentUserAddress) {
        updateCurrentUserAddress(formData.addrShort);
      }

      setIsProfileSaveModalOpen(true);
      setIsProfileEditMode(false);
    } catch (e: any) {
      showToast(e.response?.data?.message || '저장에 실패했습니다.', 'error');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordStep === 'verify') {
      if (!passwordData.current) {
        showToast('현재 비밀번호를 입력해주세요.', 'warning');
        return;
      }
      setPasswordStep('input');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (passwordData.new.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.', 'warning');
      return;
    }

    try {
      await api.put('/members/me/password', {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });
      setPasswordStep('success');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordStep('verify');
        setPasswordData({ current: '', new: '', confirm: '' });
      }, 2000);
    } catch (e: any) {
      showToast(e.response?.data?.message || '비밀번호 변경에 실패했습니다.', 'error');
    }
  };

  const sendVerificationCode = async (type: 'email' | 'password') => {
    if (cooldown > 0) return;
    if (type === 'email') {
      const fullEmail = getFullNewEmail();
      if (!fullEmail.includes('@') || fullEmail.endsWith('@')) {
        showToast('올바른 이메일 형식을 입력해주세요.', 'error');
        return;
      }
      try {
        await api.post('/auth/send-email-code', { email: fullEmail });
        setIsCodeSent(true);
        setTimer(180);
        setCooldown(60);
        showToast('인증번호가 발송되었습니다.', 'success');
      } catch (e) {
        showToast('인증번호 발송에 실패했습니다.', 'error');
      }
    }
  };

  const verifyCode = async (type: 'email' | 'password') => {
    try {
      const fullEmail = getFullNewEmail();
      const res = await api.post('/auth/verify-email-code', {
        email: fullEmail,
        code: verificationCode,
      });
      if (res.data.verified) {
        if (type === 'email') {
          // 이메일 변경 확정 API 호출
          await api.put('/members/me/email', { email: fullEmail });
          setEmailStep('success');
          setFormData(prev => ({ ...prev, email: fullEmail }));
          setEmailVerificationError(null);
          setTimeout(() => {
            setIsEmailModalOpen(false);
            setEmailStep('input');
            setNewEmailId('');
            setNewEmailDomain('');
            setNewCustomDomain('');
            setIsNewCustomDomain(false);
            setVerificationCode('');
            setIsCodeSent(false);
          }, 2000);
        }
      } else {
        setEmailVerificationError('인증번호가 올바르지 않습니다.');
        showToast('인증번호가 올바르지 않습니다.', 'error');
      }
    } catch (e) {
      setEmailVerificationError('인증 확인에 실패했습니다.');
      showToast('인증 확인에 실패했습니다.', 'error');
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const newVal = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newVal }));

    try {
      await api.put('/members/me/notification', {
        [key === 'auctionEnd' ? 'auctionEnd' :
          key === 'newBid' ? 'newBid' :
            key === 'chat' ? 'chat' : 'marketing']: newVal,
      });
    } catch (e) {
      setSettings(prev => ({ ...prev, [key]: !newVal }));
      showToast('설정 변경에 실패했습니다.', 'error');
    }
  };

  const unblockUser = async (memberNo: number) => {
    try {
      await api.delete(`/members/me/blocked/${memberNo}`);
      setBlockedUsers(prev => prev.filter(u => u.memberNo !== memberNo));
      showToast('차단이 해제되었습니다.', 'success');
    } catch (e) {
      showToast('차단 해제에 실패했습니다.', 'error');
    }
  };

  const [accounts, setAccounts] = useState<{
    accountNo: number;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault: number;
  }[]>([]);
  const [isAccountLoading, setIsAccountLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'account') {
      setIsAccountLoading(true);
      api.get('/points/accounts')
        .then(res => setAccounts(res.data))
        .catch(() => { })
        .finally(() => setIsAccountLoading(false));
    }
  }, [activeTab]);


  const handleDeleteAccount = async (accountNo: number) => {
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/points/accounts/${accountNo}`);
      setAccounts(prev => prev.filter(a => a.accountNo !== accountNo));
      showToast('계좌가 삭제되었습니다.', 'success');
    } catch (e) {
      showToast('계좌 삭제에 실패했습니다.', 'error');
    }
  };

  const validateWithdrawal = () => {
    if ((user?.points || 0) > 0) {
      return `포인트를 먼저 출금해 주세요. 현재 잔액: ${user?.points?.toLocaleString()}P`;
    }
    return null;
  };

  const openWithdrawModal = () => {
    setIsWithdrawModalOpen(true);
    setWithdrawStep('confirm');
  };

  const handleWithdraw = async () => {
    if (withdrawInput !== user?.nickname) {
      setWithdrawError('닉네임이 일치하지 않습니다.');
      return;
    }

    try {
      await api.delete('/members/me', {
        data: {
          password: withdrawPassword,
          reason: withdrawReason,
          reasonDetail: withdrawReasonDetail,
        }
      });
      setWithdrawStep('success');
      setTimeout(() => {
        navigate('/');
        logout();
      }, 2000);
    } catch (e: any) {
      setWithdrawError(e.response?.data?.message || '탈퇴 처리에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">계정 설정</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="">
              <button
                onClick={() => setActiveTab('notification')}
                className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'notification' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BsBell className="w-5 h-5 mr-3" /> 알림 설정
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'profile' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BsPersonFillGear className="w-5 h-5 mr-3" /> 프로필 수정
              </button>
              <button
                onClick={() => setActiveTab('block')}
                className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'block' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BsShield className="w-5 h-5 mr-3" /> 차단 사용자 관리
              </button>
              <button
                onClick={() => setActiveTab('card')}
                className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'card' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BsCreditCard className="w-5 h-5 mr-3" /> 카드 관리
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center px-6 py-4 font-bold text-sm transition-colors ${activeTab === 'account' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BsBank className="w-5 h-5 mr-3" /> 계좌 관리
              </button>
              <button
                onClick={openWithdrawModal}
                className="w-full flex items-center px-6 py-4 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BsPersonDash className="w-5 h-5 mr-3" /> 회원 탈퇴
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="flex-1 space-y-8">
          {activeTab === 'profile' && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900">프로필 수정</h3>
                {!isProfileEditMode && (
                  <button
                    onClick={() => setIsProfileEditMode(true)}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
                  >
                    프로필 수정하기
                  </button>
                )}
              </div>

              <div className="space-y-8 max-w-2xl">
                {!isProfileEditMode ? (
                  /* ── 조회 모드 ── */
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 닉네임 */}
                      <div className="md:col-start-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">닉네임</p>
                        <div className="px-5 py-3.5 flex items-center bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900">
                          {formData.nickname}
                        </div>
                      </div>

                      {/* 이메일 */}
                      <div className="md:col-start-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">이메일</p>
                        <div
                          className="px-5 py-3.5 flex items-center bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 truncate"
                          title={formData.email}
                        >
                          <span className="truncate w-full">{formData.email}</span>
                        </div>
                      </div>

                      {/* 휴대폰 번호 */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">휴대폰 번호</p>
                        <div className="px-5 py-3.5 flex items-center bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900">
                          {formData.phoneNum}
                        </div>
                      </div>
                    </div>

                    {/* 주소 */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">주소</p>
                      <div className="space-y-3">
                        <div className="w-full px-5 py-3.5 flex items-center bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900">
                          {formData.addrRoad || '도로명 주소'}
                        </div>
                        <div className="w-full px-5 py-3.5 flex items-center bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900">
                          {formData.addrDetail || '상세 주소'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── 수정 모드 ── */
                  <>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 닉네임 */}
                        <div className="space-y-2 md:col-start-1">
                          <div className="flex items-center justify-between px-1">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">닉네임</label>
                            <button
                              onClick={() => setIsPasswordModalOpen(true)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              비밀번호 변경
                            </button>
                          </div>
                          <input
                            type="text"
                            className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none font-bold text-gray-900"
                            value={formData.nickname}
                            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          />
                        </div>

                        {/* 이메일 */}
                        <div className="space-y-2 md:col-start-1">
                          <div className="flex items-center justify-between px-1">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">이메일</label>
                            <button
                              onClick={() => setIsEmailModalOpen(true)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              이메일 변경
                            </button>
                          </div>
                          <input
                            type="email"
                            className="block w-full px-5 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl text-sm text-gray-500 cursor-not-allowed outline-none font-bold"
                            value={formData.email}
                            readOnly
                          />
                        </div>

                        {/* 휴대폰 번호 */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">휴대폰 번호</label>
                          <input
                            type="tel"
                            className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none font-bold text-gray-900"
                            placeholder="010-0000-0000"
                            value={formData.phoneNum}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/[^0-9]/g, '');
                              let formatted = digits;
                              if (digits.length <= 3) {
                                formatted = digits;
                              } else if (digits.length <= 7) {
                                formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                              } else {
                                formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
                              }
                              setFormData({ ...formData, phoneNum: formatted });
                            }}
                          />
                        </div>
                      </div>

                      {/* 주소 */}
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">주소</label>

                        <div className="flex gap-3">
                          <input
                            type="text"
                            readOnly
                            placeholder="주소 검색을 이용해주세요"
                            value={formData.addrRoad}
                            className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none font-bold text-gray-900 cursor-not-allowed"
                          />
                          <button
                            type="button"
                            onClick={openPostcode}
                            className="py-3.5 px-6 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-2xl transition-all whitespace-nowrap"
                          >
                            주소 검색
                          </button>
                        </div>

                        {/* 상세 주소 — 주소 입력 전 비활성화 */}
                        <input
                          type="text"
                          placeholder="상세 주소를 입력해주세요"
                          value={formData.addrDetail}
                          disabled={!formData.addrRoad}
                          onChange={(e) => setFormData({ ...formData, addrDetail: e.target.value })}
                          className={`block w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-sm transition-all outline-none font-bold ${!formData.addrRoad
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white text-gray-900'
                            }`}
                        />
                      </div>
                    </div>

                    {/* 버튼 */}
                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => setIsProfileEditMode(false)}
                        className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          handleProfileSave();
                          setIsProfileEditMode(false);
                        }}
                        disabled={isProfileSaving}
                        className="flex-1 py-3.5 bg-[#FF5A5A] text-white font-bold rounded-2xl hover:bg-[#FF4545] transition-all shadow-xl shadow-red-100 active:scale-95 disabled:opacity-50"
                      >
                        {isProfileSaving ? '저장 중...' : '프로필 정보 저장'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Card/Account Management */}
          {activeTab === 'card' && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-900">결제 카드 관리</h3>
                <button
                  onClick={() => {
                    if (registeredCard) {
                      showToast('이미 카드가 등록되어 있습니다. 삭제 후 다시 눌러주세요.', 'warning');
                    } else {
                      navigate('/points/card-register');
                    }
                  }}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
                >
                  카드 등록
                </button>
              </div>

              {isCardLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : registeredCard ? (
                <div className="flex items-center justify-between p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <BsCreditCard className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{registeredCard.cardName || '등록된 카드'}</p>
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          기본
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{registeredCard.cardNo || '카드번호 정보 없음'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteRegisteredCard}
                    className="px-4 py-2 bg-red-50 text-red-500 text-xs font-bold rounded-2xl hover:bg-red-100 transition-all"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <BsCreditCard className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium">등록된 카드가 없습니다.</p>
                  <p className="text-xs text-gray-300 mt-1">카드를 등록하면 포인트를 간편하게 충전할 수 있습니다.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'account' && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">계좌 관리</h3>
                  <p className="text-xs text-gray-400 mt-1">최대 3개까지 등록 가능합니다.</p>
                </div>
                {accounts.length < 3 && (
                  <button
                    onClick={() => navigate('/settings/account-register')}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
                  >
                    계좌 추가
                  </button>
                )}
              </div>


              {/* 등록된 계좌 목록 */}
              {isAccountLoading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <BsBank className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium">등록된 계좌가 없습니다.</p>
                  <p className="text-xs text-gray-300 mt-1">출금 시 사용할 계좌를 등록하세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <div key={acc.accountNo} className="flex items-center justify-between p-5 rounded-2xl border border-gray-100 bg-white">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <BsBank className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{acc.bankName}</p>
                          <p className="text-sm text-gray-400">{acc.accountNumber} · {acc.accountHolder}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(acc.accountNo)}
                        className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-2xl hover:bg-red-100 transition-all"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center pt-2">
                    {accounts.length}/3 계좌 등록됨
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Notification Settings */}
          {activeTab === 'notification' && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900">알림 설정</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-bold text-gray-900">경매 종료 알림</p>
                    <p className="text-sm text-gray-500">관심 등록하거나 입찰한 경매가 종료될 때 알림을 받습니다.</p>
                  </div>
                  <button
                    onClick={() => toggleSetting('auctionEnd')}
                    className={`text-3xl transition-all ${settings.auctionEnd ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {settings.auctionEnd ? <BsToggle2On /> : <BsToggle2Off />}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-bold text-gray-900">새로운 입찰 알림</p>
                    <p className="text-sm text-gray-500">내가 올린 상품에 새로운 입찰이 발생하면 알림을 받습니다.</p>
                  </div>
                  <button
                    onClick={() => toggleSetting('newBid')}
                    className={`text-3xl transition-all ${settings.newBid ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {settings.newBid ? <BsToggle2On /> : <BsToggle2Off />}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-bold text-gray-900">채팅 알림</p>
                    <p className="text-sm text-gray-500">새로운 채팅 메시지가 도착하면 알림을 받습니다.</p>
                  </div>
                  <button
                    onClick={() => toggleSetting('chat')}
                    className={`text-3xl transition-all ${settings.chat ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {settings.chat ? <BsToggle2On /> : <BsToggle2Off />}
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-50 pt-6">
                  <div>
                    <p className="font-bold text-gray-900">마케팅 정보 수신</p>
                    <p className="text-sm text-gray-500">이벤트, 혜택 등 다양한 마케팅 소식을 받습니다.</p>
                  </div>
                  <button
                    onClick={() => toggleSetting('marketing')}
                    className={`text-3xl transition-all ${settings.marketing ? 'text-brand' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {settings.marketing ? <BsToggle2On /> : <BsToggle2Off />}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Blocked Users Management */}
          {activeTab === 'block' && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-in fade-in duration-300">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900">차단 사용자 관리</h3>
              </div>

              {blockedUsers.length > 0 ? (
                <div className="space-y-4">
                  {blockedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <img src={getProfileImageUrl(user.profileImage)} alt={user.nickname} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-gray-900">{user.nickname}</p>
                          <p className="text-xs text-gray-400">매너온도 {Number(user.mannerTemp).toFixed(1)}℃</p>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(user.id)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all"
                      >
                        차단 해제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-200">
                  <p className="text-gray-400 font-medium">차단한 사용자가 없습니다.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Profile Save Success Modal */}
      {isProfileSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProfileSaveModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">수정 완료</h3>
              <p className="text-sm text-gray-500 mb-8 font-medium">프로필 정보가 성공적으로 수정되었습니다.</p>

              <button
                onClick={() => setIsProfileSaveModalOpen(false)}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">비밀번호 변경</h3>
                <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <BsX className="w-6 h-6" />
                </button>
              </div>

              {passwordStep === 'verify' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">기존 비밀번호</label>
                      <input
                        type="password"
                        placeholder="기존 비밀번호 입력"
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={handlePasswordChange}
                      className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl"
                    >
                      확인
                    </button>
                  </div>
                </div>
              )}

              {passwordStep === 'input' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                    <input
                      type="password"
                      placeholder="비밀번호 입력"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호 확인</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <BsShieldCheck
                          className={`h-5 w-5 ${passwordData.confirm === '' ? 'text-gray-400' : (passwordData.new === passwordData.confirm ? 'text-emerald-500' : 'text-red-500')}`}
                          title={passwordData.confirm !== '' && passwordData.new !== passwordData.confirm ? "비밀번호가 맞지 않습니다." : ""}
                        />
                      </div>
                      <input
                        type="password"
                        placeholder="비밀번호 다시 입력"
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-gray-200 outline-none"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handlePasswordChange}
                      className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl"
                    >
                      비밀번호 변경 완료
                    </button>
                  </div>
                </div>
              )}

              {passwordStep === 'success' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <BsCheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">변경 완료</h3>
                  <p className="text-sm text-gray-500">비밀번호가 성공적으로 변경되었습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">이메일 변경</h3>
                <button onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <BsX className="w-6 h-6" />
                </button>
              </div>

              {emailStep === 'input' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            required
                            disabled={isCodeSent}
                            className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none disabled:opacity-50 font-bold"
                            placeholder="이메일 아이디"
                            value={newEmailId}
                            onChange={(e) => setNewEmailId(e.target.value)}
                          />
                        </div>
                        <span className="text-gray-400 font-bold">@</span>
                        <div className="relative flex-1">
                          <select
                            disabled={isCodeSent}
                            className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none disabled:opacity-50 appearance-none font-bold"
                            value={isNewCustomDomain ? 'custom' : newEmailDomain}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setIsNewCustomDomain(true);
                              } else {
                                setIsNewCustomDomain(false);
                                setNewEmailDomain(e.target.value);
                              }
                            }}
                          >
                            <option value="">선택</option>
                            <option value="naver.com">naver.com</option>
                            <option value="gmail.com">gmail.com</option>
                            <option value="daum.net">daum.net</option>
                            <option value="hanmail.net">hanmail.net</option>
                            <option value="nate.com">nate.com</option>
                            <option value="outlook.com">outlook.com</option>
                            <option value="custom">직접 입력</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
                            <BsChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {isNewCustomDomain && !isCodeSent && (
                        <div className="animate-in slide-in-from-top-1 duration-200">
                          <input
                            type="text"
                            required
                            className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none font-bold"
                            placeholder="도메인을 입력해주세요"
                            value={newCustomDomain}
                            onChange={(e) => setNewCustomDomain(e.target.value)}
                          />
                        </div>
                      )}

                      {!isCodeSent && (
                        <button
                          onClick={() => sendVerificationCode('email')}
                          disabled={!newEmailId || (isNewCustomDomain ? !newCustomDomain : !newEmailDomain)}
                          className="w-full py-4 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-black transition-all disabled:opacity-50"
                        >
                          인증번호 발송
                        </button>
                      )}
                    </div>

                    {/* 인증번호 입력 섹션 (중앙 정렬 스타일) */}
                    {isCodeSent && (
                      <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-40">
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-center">인증번호</label>
                            <div className="relative border-b border-gray-200 pb-1.5 flex items-center focus-within:border-[#FF5A5A] transition-colors">
                              <input
                                type="text"
                                maxLength={6}
                                className="block w-full bg-transparent text-xl font-bold placeholder:text-gray-200 outline-none tracking-[0.3em] text-center"
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  setVerificationCode(val);
                                }}
                              />
                              {timer > 0 && (
                                <span className="absolute -right-2 text-[10px] font-bold text-[#FF5A5A] tabular-nums">
                                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            {emailVerificationError && (
                              <p className="text-[10px] text-red-500 mt-1 font-bold flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-1">
                                <BsExclamationCircle className="w-3 h-3" /> {emailVerificationError}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => verifyCode('email')}
                              className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm"
                            >
                              인증 확인
                            </button>
                            <button
                              type="button"
                              onClick={() => sendVerificationCode('email')}
                              disabled={cooldown > 0}
                              className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-bold text-gray-400 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm disabled:opacity-50"
                            >
                              {cooldown > 0 ? `${cooldown}초 후 재요청` : '재요청'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {emailStep === 'success' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <BsCheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">변경 완료</h3>
                  <p className="text-sm text-gray-500">이메일 주소가 성공적으로 변경되었습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsWithdrawModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {withdrawStep !== 'success' && (
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <BsX className="w-6 h-6" />
              </button>
            )}

            <div className="p-10">
              {withdrawStep === 'confirm' && (
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">정말 탈퇴하시겠습니까?</h3>

                  <div className="bg-red-50 p-6 rounded-2xl text-left mb-8">
                    <p className="text-sm font-bold text-red-800 mb-4">탈퇴 조건 확인</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-700">보유 포인트 0원</span>
                        {(user?.points || 0) === 0 ? (
                          <BsCheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-white px-2 py-0.5 rounded-md shadow-sm">
                            {user?.points?.toLocaleString()}P 보유 중
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-700">판매 중인 물건 없음</span>
                        {activeProductCount === 0 ? (
                          <BsCheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-white px-2 py-0.5 rounded-md shadow-sm">
                            {activeProductCount}건 진행 중
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-700">거래 중인 물품 없음</span>
                        {tradingProductCount === 0 ? (
                          <BsCheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 bg-white px-2 py-0.5 rounded-md shadow-sm">
                            {tradingProductCount}건 거래 중
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl text-left mb-8">
                    <p className="text-sm font-bold text-gray-800 mb-2">주의사항</p>
                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                      <li>탈퇴 시 모든 적립금과 거래 내역이 삭제되며 복구할 수 없습니다.</li>
                      <li>동일한 계정으로 재가입이 일정 기간 제한될 수 있습니다.</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      const error = validateWithdrawal();
                      if (error) {
                        showToast(error, 'error');
                      } else {
                        setWithdrawStep('reason');
                      }
                    }}
                    className="w-full py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/10"
                  >
                    다음 단계
                  </button>
                </div>
              )}

              {withdrawStep === 'reason' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">탈퇴 사유</h3>
                  <p className="text-sm text-gray-500 mb-8">탈퇴하시는 이유를 알려주시면 서비스 개선에 큰 도움이 됩니다.</p>

                  <div className="space-y-3 mb-8">
                    {[
                      '더 이상 서비스를 이용하지 않음',
                      '개인정보 보호를 위해',
                      '다른 계정으로 재가입',
                      '서비스 이용이 불편함',
                      '기타'
                    ].map(reason => (
                      <button
                        key={reason}
                        onClick={() => setWithdrawReason(reason)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm font-bold transition-all ${withdrawReason === reason
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {withdrawReason === '기타' && (
                    <textarea
                      value={withdrawReasonDetail}
                      onChange={(e) => setWithdrawReasonDetail(e.target.value)}
                      placeholder="사유를 입력해주세요."
                      className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm mb-8 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                    />
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setWithdrawStep('confirm')}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => setWithdrawStep('input')}
                      disabled={!withdrawReason || (withdrawReason === '기타' && !withdrawReasonDetail)}
                      className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}

              {withdrawStep === 'input' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">필수 정보 입력</h3>
                  <p className="text-sm text-gray-500 mb-8">안전한 탈퇴를 위해 본인 확인이 필요합니다.</p>

                  <div className="bg-gray-50 p-4 rounded-2xl text-center mb-6 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">인증 문구 (닉네임)</p>
                    <p className="text-lg font-bold text-red-600 tracking-wider font-mono">{user?.nickname}</p>
                  </div>

                  <input
                    type="text"
                    value={withdrawInput}
                    onChange={(e) => {
                      setWithdrawInput(e.target.value);
                      setWithdrawError(null);
                    }}
                    placeholder="닉네임을 정확히 입력하세요"
                    className={`block w-full px-5 py-4 bg-gray-50 border rounded-2xl text-sm outline-none mb-4 transition-all ${withdrawError ? 'border-red-500' : 'border-gray-100 focus:border-red-500'}`}
                  />

                  <input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={withdrawPassword}
                    onChange={(e) => setWithdrawPassword(e.target.value)}
                    className="block w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none mb-4 focus:border-red-500 transition-all"
                  />

                  {withdrawError && <p className="text-xs text-red-500 mb-6 ml-2">{withdrawError}</p>}

                  <button
                    onClick={handleWithdraw}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    회원 탈퇴 완료
                  </button>
                </div>
              )}

              {withdrawStep === 'success' && (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <BsCheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">탈퇴 처리가 완료되었습니다</h3>
                  <p className="text-sm text-gray-500">그동안 이용해주셔서 감사합니다.<br />잠시 후 메인 화면으로 이동합니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
