import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Package, Check, ChevronRight, Mail, User, Lock, ShieldCheck, MapPin, Phone, Calendar, AlertCircle, Send, CheckCircle2, X, Sparkles, ChevronDown } from 'lucide-react';
import { showToast } from '@/components/toastService';

declare global {
  interface Window { daum: any; }
}

type SignupStep = 'terms' | 'info' | 'success';

export const Signup: React.FC = () => {
  const navigate = useNavigate();

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
          address: fullAddress,    // 도로명 전체 주소
          addrDetail: '',
          addrShort,               // "서울 강남구 역삼동"
        }));
      },
    }).open();
  };

  const [step, setStep] = useState<SignupStep>('terms');

  // 약관 동의 상태
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    purpose: false,
    termsDef: false,
    auction: false,
    prohibited: false,
    marketing: false
  });

  // 회원정보 입력 상태
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    email: '',
    address: '',      // 도로명 전체 (내부 관리용)
    addrShort: '',    // 표시용 짧은 주소
    addrDetail: '',
    phoneNum: '',
    birthDate: ''
  });

  // 아이디 중복확인 상태
  const [idCheckMessage, setIdCheckMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isIdChecked, setIsIdChecked] = useState(false);

  // 닉네임 중복확인 상태
  const [nicknameCheckMessage, setNicknameCheckMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  
  // 이메일 분리 입력 상태
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // 이메일 상태 동기화
  useEffect(() => {
    const domain = isCustomDomain ? customDomain : emailDomain;
    setFormData(prev => ({ ...prev, email: `${emailId}@${domain}` }));
  }, [emailId, emailDomain, customDomain, isCustomDomain]);

  // 약관 아코디언 펼침 상태
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const termContents: Record<string, string> = {
    service: 'JAVAJAVA 서비스 이용약관입니다. 본 약관은 회원이 서비스를 이용함에 있어 필요한 권리, 의무 및 책임사항을 규정합니다. 회원은 가입 시 본 약관에 동의함으로써 서비스 이용 권한을 부여받습니다.',
    privacy: '개인정보 처리방침입니다. 회사는 회원의 개인정보를 소중히 취급하며, 관련 법령을 준수합니다. 수집된 정보는 서비스 제공 및 품질 개선을 위해서만 사용됩니다.',
    purpose: '서비스 이용 목적에 대한 동의입니다. 본 서비스는 실시간 경매를 통한 투명한 거래 문화를 지향하며, 건전한 경매 생태계 조성을 목적으로 합니다.',
    termsDef: '용어의 정의에 대한 동의입니다. 서비스 내에서 사용되는 주요 용어들에 대한 명확한 정의를 안내하여 서비스 이용의 혼선을 방지합니다.',
    auction: '서비스 이용 및 낙찰에 대한 동의입니다. 경매 참여 방법 및 낙찰 시 의무사항에 대해 규정하며, 낙찰 후 정당한 사유 없는 취소는 제한될 수 있습니다.',
    prohibited: '금지물품에 대한 동의입니다. 법령에 위반되거나 서비스 운영상 부적절한 물품의 등록을 금지하며, 위반 시 서비스 이용이 제한될 수 있습니다.',
    marketing: '마케팅 정보 수신 동의입니다. 이벤트, 할인 혜택 등 다양한 소식을 받아보실 수 있습니다. 동의하지 않으셔도 서비스 이용은 가능합니다.'
  };

  const toggleTermExpand = (key: string) => {
    setExpandedTerm(prev => prev === key ? null : key);
  };

  const handleIdCheck = async () => {
    if (!formData.userId) {
      setIdCheckMessage({ text: '아이디를 입력해주세요.', isError: true });
      return;
    }
    const idRegex = /^[a-z0-9]{5,20}$/;
    if (!idRegex.test(formData.userId)) {
      setIdCheckMessage({ text: '영문 소문자, 숫자 포함 5~20자여야 합니다.', isError: true });
      return;
    }

    try {
      const res = await api.get(`/members/check-userid?userId=${formData.userId}`);
      if (res.data.duplicate) {
        setIdCheckMessage({ text: '이미 사용 중인 아이디입니다.', isError: true });
        setIsIdChecked(false);
      } else {
        setIdCheckMessage({ text: '사용 가능한 아이디입니다.', isError: false });
        setIsIdChecked(true);
      }
    } catch {
      setIdCheckMessage({ text: '중복확인 중 오류가 발생했습니다.', isError: true });
    }
  };

  const handleNicknameCheck = async () => {
    if (!formData.nickname) {
      setNicknameCheckMessage({ text: '닉네임을 입력해주세요.', isError: true });
      return;
    }
    try {
      const res = await api.get(`/members/check-nickname?nickname=${encodeURIComponent(formData.nickname)}`);
      if (res.data.duplicate) {
        setNicknameCheckMessage({ text: '이미 사용 중인 닉네임입니다.', isError: true });
        setIsNicknameChecked(false);
      } else {
        setNicknameCheckMessage({ text: '사용 가능한 닉네임입니다.', isError: false });
        setIsNicknameChecked(true);
      }
    } catch {
      setNicknameCheckMessage({ text: '중복확인 중 오류가 발생했습니다.', isError: true });
    }
  };

  // 이메일 인증 상태
  const [emailCode, setEmailCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [cooldown, setCooldown] = useState(0);

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

  const isAllRequiredTermsChecked =
    terms.service && terms.privacy && terms.purpose &&
    terms.termsDef && terms.auction && terms.prohibited;

  const handleTermToggle = (key: keyof typeof terms) => {
    setTerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAllTermsToggle = () => {
    const allChecked = Object.values(terms).every(v => v);
    setTerms({
      service: !allChecked,
      privacy: !allChecked,
      purpose: !allChecked,
      termsDef: !allChecked,
      auction: !allChecked,
      prohibited: !allChecked,
      marketing: !allChecked
    });
  };

  const sendVerificationCode = async (isResend = false) => {
    if (!formData.email.includes('@')) {
      showToast("올바른 '이메일' 형식을 입력해주세요.", 'error');
      return;
    }
    // DB에 이미 등록된 이메일인지 먼저 확인
    try {
      const res = await api.get(`/members/check-email?email=${encodeURIComponent(formData.email)}`);
      if (res.data.duplicate) {
        showToast("이미 사용 중인 '이메일'입니다. 다른 이메일을 입력해주세요.", 'error');
        return;
      }
    } catch {
      showToast("'이메일' 확인 중 오류가 발생했습니다.", 'error');
      return;
    }
    // 재전송일 때만 즉시 버튼 비활성화
    if (isResend) setCooldown(60);
    // 백엔드로 인증번호 발송 요청
    try {
      await api.post('/auth/send-email-code', { email: formData.email });
      setShowCodeInput(true);
      setTimer(180); // 3분
      showToast("'인증번호'가 발송되었습니다. 이메일을 확인해주세요.", 'success');
    } catch {
      if (isResend) setCooldown(0); // 실패 시 쿨다운 해제
      showToast('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  const verifyCode = async () => {
    try {
      const res = await api.post('/auth/verify-email-code', { email: formData.email, code: emailCode });
      if (res.data.verified) {
        setIsEmailVerified(true);
        setVerificationError(null);
        showToast("'이메일' 인증이 완료되었습니다.", 'success');
      } else {
        setVerificationError('인증번호가 틀렸거나 만료되었습니다.');
      }
    } catch {
      setVerificationError('인증 확인 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. ID 중복확인 여부 체크
    if (!isIdChecked) {
      showToast("'아이디' 중복확인을 완료해주세요.", 'error');
      return;
    }

    // 1-1. 닉네임 중복확인 여부 체크
    if (!isNicknameChecked) {
      showToast("'닉네임' 중복확인을 완료해주세요.", 'error');
      return;
    }

    // 2. 아이디 유효성 검사 (영문 소문자·숫자 5~20자)
    const idRegex = /^[a-z0-9]{5,20}$/;
    if (!idRegex.test(formData.userId)) {
      showToast("'아이디'는 영문 소문자, 숫자 포함 5~20자여야 합니다.", 'error');
      return;
    }

    // 3. 비밀번호 유효성 검사 (8자 이상)
    if (formData.password.length < 8) {
      showToast("'비밀번호'는 최소 8자 이상이어야 합니다.", 'error');
      return;
    }

    // 4. 비밀번호 일치 확인
    if (formData.password !== formData.confirmPassword) {
      showToast("'비밀번호'가 일치하지 않습니다.", 'error');
      return;
    }

    // 5. 이메일 인증 완료 여부 확인
    if (!isEmailVerified) {
      showToast("'이메일' 인증을 완료해주세요.", 'error');
      return;
    }

    // 6. 주소 입력 여부 확인
    if (!formData.address) {
      showToast('주소를 검색해주세요.', 'warning');
      return;
    }
    if (!formData.addrDetail.trim()) {
      showToast('상세주소를 입력해주세요.', 'warning');
      return;
    }

    // 6. birthDate: YYMMDD → yyyy-MM-dd 변환
    const yy = parseInt(formData.birthDate.substring(0, 2), 10);
    const currentYY = new Date().getFullYear() % 100;
    const fullYear = yy > currentYY ? `19${formData.birthDate.substring(0, 2)}` : `20${formData.birthDate.substring(0, 2)}`;
    const birthDateFormatted = `${fullYear}-${formData.birthDate.substring(2, 4)}-${formData.birthDate.substring(4, 6)}`;

    try {
      await api.post('/members', {
        userId: formData.userId,
        password: formData.password,
        nickname: formData.nickname,
        email: formData.email,
        phoneNum: formData.phoneNum,
        addrRoad: formData.address,          // 도로명 전체
        addrDetail: formData.addrDetail,     // 상세주소
        addrShort: formData.addrShort,       // 표시용 짧은 주소
        birthDate: birthDateFormatted,
        marketingAgree: terms.marketing ? 1 : 0,
      });
      showToast("'회원가입'이 성공적으로 완료되었습니다!", 'success');
      setStep('success');
    } catch (error: any) {
      if (error.response?.status === 409) {
        showToast("이미 사용 중인 '아이디', '닉네임', 또는 '이메일'입니다.", 'error');
      } else if (error.response?.status === 400) {
        showToast(error.response.data?.message || '입력 정보를 다시 확인해주세요.', 'error');
      } else {
        showToast("'회원가입'에 실패했습니다. 잠시 후 다시 시도해주세요.", 'error');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-12 px-6">
      <div className="max-w-lg mx-auto">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === 'terms' ? 'bg-[#FF5A5A] text-white shadow-lg shadow-red-500/10 scale-110' : 'bg-white text-gray-300 border border-gray-100'}`}>1</div>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${step === 'terms' ? 'text-[#FF5A5A]' : 'text-gray-300'}`}>약관동의</span>
          </div>
          <div className="flex-1 h-px mx-4"></div>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === 'info' ? 'bg-[#FF5A5A] text-white shadow-lg shadow-red-500/10 scale-110' : 'bg-white text-gray-300 border border-gray-100'}`}>2</div>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${step === 'info' ? 'text-[#FF5A5A]' : 'text-gray-300'}`}>정보입력</span>
          </div>
          <div className="flex-1 h-px mx-4"></div>
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step === 'success' ? 'bg-[#FF5A5A] text-white shadow-lg shadow-red-500/10 scale-110' : 'bg-white text-gray-300 border border-gray-100'}`}>3</div>
            <span className={`text-[12px] font-bold uppercase tracking-wider ${step === 'success' ? 'text-[#FF5A5A]' : 'text-gray-300'}`}>가입완료</span>
          </div>
        </div>

        {step === 'terms' && (
          <div className="bg-white p-10 rounded-[32px] shadow-xl border border-gray-100">
            <div className="text-left mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">약관 동의</h2>
              <p className="mt-2 text-sm text-gray-500 font-medium">JAVAJAVA 서비스 이용을 위해 약관에 동의해주세요.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleAllTermsToggle}
                className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${Object.values(terms).every(v => v) ? 'bg-[#FF5A5A] text-white' : 'bg-white text-gray-200 border border-gray-200'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-800">전체 동의하기</span>
                </div>
              </button>

              <div className="space-y-2 pt-4">
                {[
                  { key: 'service', label: '이용약관 동의', required: true },
                  { key: 'privacy', label: '개인정보 처리방침 동의', required: true },
                  { key: 'purpose', label: '목적 동의', required: true },
                  { key: 'termsDef', label: '용어의 정의 동의', required: true },
                  { key: 'auction', label: '서비스 이용 및 낙찰 동의', required: true },
                  { key: 'prohibited', label: '금지물품 동의', required: true },
                  { key: 'marketing', label: '마케팅 정보 수신 동의', required: false },
                ].map((item) => (
                  <div key={item.key} className="p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleTermToggle(item.key as keyof typeof terms)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${terms[item.key as keyof typeof terms] ? 'bg-[#FF5A5A] text-white' : 'bg-white text-gray-200 border border-gray-200'}`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <span className={`text-sm font-bold ${item.required ? 'text-gray-700' : 'text-gray-400'}`}>
                          {item.label} {item.required ? <span className="text-[#FF5A5A]">(필수)</span> : '(선택)'}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleTermExpand(item.key)}
                        className="text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-[#FF5A5A] transition-colors"
                      >
                        {expandedTerm === item.key ? '닫기' : '보기'}
                      </button>
                    </div>
                    {expandedTerm === item.key && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 leading-relaxed animate-in slide-in-from-top-2 duration-200">
                        {termContents[item.key]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={!isAllRequiredTermsChecked}
              onClick={() => setStep('info')}
              className={`w-full mt-10 py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isAllRequiredTermsChecked ? 'bg-[#FF5A5A] text-white shadow-lg shadow-red-500/10 hover:bg-[#FF4545] active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              다음 단계로
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'info' && (
          <div className="bg-white p-10 rounded-[32px] shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">회원정보</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ID & PW */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">아이디</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        required
                        className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                        placeholder="영문 소문자, 숫자 포함 5~20자"
                        value={formData.userId}
                        onChange={(e) => {
                          setFormData({ ...formData, userId: e.target.value });
                          setIdCheckMessage(null);
                          setIsIdChecked(false);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleIdCheck}
                      className="px-5 py-3.5 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
                    >
                      중복확인
                    </button>
                  </div>
                  {idCheckMessage && (
                    <p className={`text-[10px] mt-2 ml-1 font-bold ${idCheckMessage.isError ? 'text-red-500' : 'text-emerald-500'}`}>
                      {idCheckMessage.text}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                        placeholder="최소 8자 이상"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">비밀번호 확인</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <ShieldCheck className={`h-5 w-5 ${formData.confirmPassword === '' ? 'text-gray-400' : (formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-red-500')}`} />
                      </div>
                      <input
                        type="password"
                        required
                        className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                        placeholder="비밀번호 재입력"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nickname & Email */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">닉네임</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      className="block flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                      placeholder="한글/영문 15자 이내"
                      value={formData.nickname}
                      onChange={(e) => {
                        setFormData({ ...formData, nickname: e.target.value });
                        setNicknameCheckMessage(null);
                        setIsNicknameChecked(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleNicknameCheck}
                      className="px-5 py-3.5 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all"
                    >
                      중복확인
                    </button>
                  </div>
                  {nicknameCheckMessage && (
                    <p className={`text-[10px] mt-2 ml-1 font-bold ${nicknameCheckMessage.isError ? 'text-red-500' : 'text-emerald-500'}`}>
                      {nicknameCheckMessage.text}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">이메일 인증</label>
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          disabled={isEmailVerified}
                          className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none disabled:opacity-50"
                          placeholder="이메일 아이디"
                          value={emailId}
                          onChange={(e) => setEmailId(e.target.value)}
                        />
                      </div>
                      <span className="text-gray-400 font-bold">@</span>
                      <div className="relative flex-1">
                        <select
                          disabled={isEmailVerified}
                          className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none disabled:opacity-50 appearance-none"
                          value={isCustomDomain ? 'custom' : emailDomain}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setIsCustomDomain(true);
                            } else {
                              setIsCustomDomain(false);
                              setEmailDomain(e.target.value);
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
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                    
                    {isCustomDomain && !isEmailVerified && (
                      <div className="animate-in slide-in-from-top-1 duration-200">
                        <input
                          type="text"
                          required
                          className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                          placeholder="도메인을 입력해주세요 (예: example.com)"
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                        />
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => sendVerificationCode(false)}
                      disabled={isEmailVerified || cooldown > 0 || !emailId || (isCustomDomain ? !customDomain : !emailDomain)}
                      className="px-5 py-3.5 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all disabled:bg-gray-200 whitespace-nowrap"
                    >
                      코드전송
                    </button>
                  </div>

                  {/* 인증번호 입력 섹션 (중앙 정렬 스타일) */}
                  {!isEmailVerified && showCodeInput && (
                    <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-40">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-center">인증번호</label>
                          <div className="relative border-b border-gray-200 pb-1.5 flex items-center focus-within:border-[#FF5A5A] transition-colors">
                            <input
                              type="text"
                              maxLength={6}
                              className="block w-full bg-transparent text-xl font-bold placeholder:text-gray-200 outline-none tracking-[0.3em] text-center"
                              placeholder="000000"
                              value={emailCode}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setEmailCode(val);
                              }}
                            />
                            {timer > 0 && (
                              <span className="absolute -right-2 text-[10px] font-bold text-[#FF5A5A] tabular-nums">
                                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={verifyCode}
                            className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm"
                          >
                            인증 확인
                          </button>
                          <button
                            type="button"
                            onClick={() => sendVerificationCode(true)}
                            disabled={cooldown > 0 || !emailId || (isCustomDomain ? !customDomain : !emailDomain)}
                            className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {cooldown > 0 ? `${cooldown}초 후 가능` : '재요청'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationError && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold text-center">{verificationError}</p>}
                  {isEmailVerified && (
                    <p className="text-[10px] text-emerald-500 mt-1 ml-1 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 인증이 완료되었습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* Address & Phone & Birth */}
              <div className="space-y-4">
                {/* 주소 */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">주소</label>
                  <div className="space-y-2">

                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        placeholder="주소 찾기를 이용해주세요"
                        value={formData.address}
                        className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none font-bold text-gray-900 cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={openPostcode}
                        className="px-5 py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-2xl transition-all whitespace-nowrap"
                      >
                        주소 검색
                      </button>
                    </div>

                    {/* 상세주소 — 주소 입력 전 비활성화 */}
                    <input
                      type="text"
                      placeholder="상세주소를 입력하세요"
                      value={formData.addrDetail}
                      disabled={!formData.address}
                      onChange={(e) => setFormData({ ...formData, addrDetail: e.target.value })}
                      className={`block w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-sm transition-all outline-none ${!formData.address
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed placeholder-gray-400'
                        : 'bg-gray-50 focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white text-gray-900'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">휴대폰 번호</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                        placeholder="010-0000-0000"
                        value={formData.phoneNum}
                        onChange={(e) => {
                          // 숫자만 추출 후 010-0000-0000 형식으로 자동 포맷
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
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">생년월일 (6자리)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        className="block w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white transition-all outline-none"
                        placeholder="YYMMDD"
                        value={formData.birthDate}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length <= 6) {
                            setFormData({ ...formData, birthDate: val });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#FF5A5A] text-white font-bold text-sm rounded-2xl hover:bg-[#FF4545] transition-all shadow-lg shadow-red-500/10 active:scale-95 flex items-center justify-center gap-2"
              >
                가입 완료하기
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center mb-10 text-center">
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">회원가입이 성공적으로 완료되었습니다.</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                지금 바로 JAVAJAVA의 실시간 중고 경매를 시작해보세요.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex-1 py-5 bg-[#FF5A5A] text-white font-bold rounded-2xl hover:bg-[#FF4545] transition-all shadow-lg shadow-red-500/10 active:scale-95 text-center"
              >
                로그인 하러가기
              </Link>
              <Link
                to="/"
                className="flex-1 py-5 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all text-center"
              >
                메인으로 이동
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
