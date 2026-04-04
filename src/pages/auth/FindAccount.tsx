import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Search, Lock, ChevronLeft, User, Send, CheckCircle2 } from 'lucide-react';
import { showToast } from '@/components/toastService';

type Tab = 'id' | 'pw';

export const FindAccount: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('id');

  // 아이디 찾기 상태
  const [idEmail, setIdEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);

  // 비밀번호 찾기 상태
  const [pwUserId, setPwUserId] = useState('');
  const [pwEmailCode, setPwEmailCode] = useState('');
  const [pwSentCode, setPwSentCode] = useState<string | null>(null);
  const [isPwVerified, setIsPwVerified] = useState(false);
  const [isPwSuccess, setIsPwSuccess] = useState(false);
  const [timer, setTimer] = useState(0);

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
    if (location.pathname === '/find-pw') {
      setActiveTab('pw');
    } else {
      setActiveTab('id');
    }
  }, [location.pathname]);

  const handleFindId = (e: React.FormEvent) => {
    e.preventDefault();
    if (idEmail === 'test@example.com') {
      setFoundId('testuser');
    } else {
      showToast('일치하는 이메일 정보가 없습니다.', 'error');
    }
  };

  const handleSendCode = () => {
    if (!pwUserId.trim()) {
      showToast('아이디를 먼저 입력해주세요.', 'error');
      return;
    }
    if (pwUserId === 'testuser') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setPwSentCode(code);
      setTimer(180); // 3 minutes
      showToast(`인증번호가 발송되었습니다: ${code} (실제 서비스에서는 등록된 이메일로 발송됩니다)`, 'info');
    } else {
      showToast('일치하는 아이디 정보가 없습니다.', 'error');
    }
  };

  const handleVerifyCode = () => {
    if (pwEmailCode === pwSentCode) {
      setIsPwVerified(true);
      showToast('이메일 인증이 완료되었습니다.', 'success');
    } else {
      showToast('인증번호가 틀렸습니다.', 'error');
    }
  };

  const handleFindPw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwVerified) {
      showToast('이메일 인증을 완료해주세요.', 'error');
      return;
    }
    setIsPwSuccess(true);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('id')}
            className={`flex-1 py-5 text-sm font-black transition-all ${activeTab === 'id' ? 'text-gray-900 bg-white border-b-2 border-[#FF5A5A]' : 'text-gray-400 bg-gray-50/50 hover:bg-gray-50'}`}
          >
            아이디 찾기
          </button>
          <button
            onClick={() => setActiveTab('pw')}
            className={`flex-1 py-5 text-sm font-black transition-all ${activeTab === 'pw' ? 'text-gray-900 bg-white border-b-2 border-[#FF5A5A]' : 'text-gray-400 bg-gray-50/50 hover:bg-gray-50'}`}
          >
            비밀번호 찾기
          </button>
        </div>

        <div className="p-10">
          {activeTab === 'id' ? (
            <div className="animate-in fade-in duration-300">
              <div className="text-left mb-8">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">아이디 찾기</h2>
                <p className="mt-2 text-sm text-gray-500 font-medium leading-relaxed">가입 시 등록한 이메일을 입력해주세요.</p>
              </div>

              {!foundId ? (
                <form className="space-y-6" onSubmit={handleFindId}>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">이메일 주소</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white hover:border-[#FF5A5A]/30 transition-all outline-none"
                        placeholder="example@email.com"
                        value={idEmail}
                        onChange={(e) => setIdEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    아이디 찾기
                  </button>
                </form>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-300 text-left">
                  <div className="bg-red-50 p-8 rounded-2xl text-left border border-red-100">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">찾으시는 아이디는</p>
                    <p className="text-2xl font-black text-[#FF5A5A] tracking-wider">{foundId}</p>
                  </div>
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="block w-full py-4 bg-[#FF5A5A] text-white font-black rounded-2xl hover:bg-[#FF4545] transition-all shadow-lg shadow-red-100 text-center"
                    >
                      로그인 하러가기
                    </Link>
                    <button
                      onClick={() => setActiveTab('pw')}
                      className="block w-full py-4 bg-gray-50 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-all text-center"
                    >
                      비밀번호 찾기
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <div className="text-left mb-8">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">비밀번호 찾기</h2>
                <p className="mt-2 text-sm text-gray-500 font-medium leading-relaxed">아이디와 이메일 인증을 진행해주세요.</p>
              </div>

              {!isPwSuccess ? (
                <form className="space-y-6" onSubmit={handleFindPw}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">아이디</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          disabled={isPwVerified}
                          className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF5A5A]/20 focus:bg-white hover:border-[#FF5A5A]/30 transition-all outline-none disabled:opacity-50"
                          placeholder="아이디를 입력하세요"
                          value={pwUserId}
                          onChange={(e) => setPwUserId(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">이메일 인증</label>
                      <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            disabled
                            className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none opacity-50 hover:border-[#FF5A5A]/30 transition-all"
                            placeholder="등록된 이메일로 인증"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={isPwVerified}
                          className="px-5 py-3.5 bg-gray-900 text-white text-xs font-bold rounded-2xl hover:bg-black transition-all disabled:bg-gray-200"
                        >
                          인증번호 전송
                        </button>
                      </div>
                      {/* 인증번호 입력 섹션 (중앙 정렬 스타일) */}
                      {!isPwVerified && pwSentCode && (
                        <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-40">
                              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-center">인증번호</label>
                              <div className="relative border-b border-gray-200 pb-1.5 flex items-center focus-within:border-[#FF5A5A] transition-colors">
                                <input
                                  type="text"
                                  maxLength={4}
                                  className="block w-full bg-transparent text-xl font-bold placeholder:text-gray-200 outline-none tracking-[0.3em] text-center"
                                  placeholder="0000"
                                  value={pwEmailCode}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setPwEmailCode(val);
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
                                onClick={handleVerifyCode}
                                className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-black text-gray-600 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm"
                              >
                                인증 확인
                              </button>
                              <button
                                type="button"
                                onClick={handleSendCode}
                                className="px-6 py-2.5 border border-gray-200 rounded-full text-[11px] font-black text-gray-400 hover:bg-gray-50 transition-all whitespace-nowrap shadow-sm"
                              >
                                재요청
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {isPwVerified && <p className="text-[10px] text-emerald-500 mt-1 ml-1 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 인증이 완료되었습니다.</p>}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isPwVerified}
                    className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${isPwVerified ? 'bg-gray-900 text-white shadow-lg hover:bg-black active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  >
                    임시 비밀번호 전송
                  </button>
                </form>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-300 text-left">
                  <div className="bg-emerald-50 p-8 rounded-2xl text-left border border-emerald-100">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <Send className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-emerald-800 mb-2">임시 비밀번호 전송 완료</p>
                    <p className="text-xs text-emerald-600 leading-relaxed font-medium">
                      등록된 이메일로 임시 비밀번호가 발송되었습니다.<br />
                      로그인 후 반드시 비밀번호를 변경해주세요.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="block w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg text-center"
                  >
                    로그인 하러가기
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-50 text-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 로그인 화면으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
