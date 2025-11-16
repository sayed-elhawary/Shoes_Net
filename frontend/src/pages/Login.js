// frontend/src/pages/Login.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CustomLoadingSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    <span className="text-sm">جارٍ التحميل...</span>
  </div>
);

const Login = () => {
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [savedEmails, setSavedEmails] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // تحميل الحسابات المحفوظة
  useEffect(() => {
    const load = () => {
      try {
        const data = localStorage.getItem('savedLogins');
        if (data) {
          const parsed = JSON.parse(data);
          setSavedEmails(parsed.slice(0, 8));
          const last = localStorage.getItem('lastLoginEmail');
          if (last && parsed.includes(last)) {
            setForm(prev => ({ ...prev, emailOrPhone: last }));
          }
        }
      } catch (e) { /* ignore */ }
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load);
    } else {
      setTimeout(load, 50);
    }
  }, []);

  // حفظ الإيميل/التليفون
  const saveEmailOrPhone = useCallback((emailOrPhone) => {
    if (!emailOrPhone.trim()) return;
    try {
      const cleaned = emailOrPhone.trim();
      let updated = [cleaned];
      const prev = JSON.parse(localStorage.getItem('savedLogins') || '[]');
      updated = [...updated, ...prev.filter(x => x !== cleaned)].slice(0, 8);
      localStorage.setItem('savedLogins', JSON.stringify(updated));
      localStorage.setItem('lastLoginEmail', cleaned);
      setSavedEmails(updated);
    } catch (e) { /* ignore */ }
  }, []);

  const selectSaved = (value) => {
    setForm(prev => ({ ...prev, emailOrPhone: value, password: '' }));
    setShowDropdown(false);
    localStorage.setItem('lastLoginEmail', value);
  };

  const deleteSaved = (e, value) => {
    e.stopPropagation();
    try {
      const filtered = savedEmails.filter(x => x !== value);
      localStorage.setItem('savedLogins', JSON.stringify(filtered));
      setSavedEmails(filtered);
      if (localStorage.getItem('lastLoginEmail') === value) {
        localStorage.removeItem('lastLoginEmail');
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // أنيميشن الإنترو
  useEffect(() => {
    const t1 = setTimeout(() => setShowIntro(false), 1500);
    const t2 = setTimeout(() => setShowForm(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // إشعارات الواتساب
  useEffect(() => {
    const messages = [
      "للشكاوي والاستفسارات تواصل معانا",
      "لتفعيل الحساب تواصل معانا على واتساب"
    ];
    let index = 0;
    const showNextToast = () => {
      setToast(messages[index]);
      index = (index + 1) % messages.length;
      setTimeout(() => {
        setToast(null);
      }, 4000);
    };
    const interval = setInterval(showNextToast, 5000);
    setTimeout(showNextToast, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = /^\d{11}$/.test(form.emailOrPhone)
        ? { phone: form.emailOrPhone, password: form.password }
        : { email: form.emailOrPhone, password: form.password };
      const res = await axios.post(`${API_URL}/api/auth/login`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.userId);
      window.dispatchEvent(new Event('authChange'));
      saveEmailOrPhone(form.emailOrPhone);
      setTimeout(() => {
        const role = res.data.role;
        if (role === 'admin') navigate('/admin');
        else if (role === 'vendor') navigate('/vendor');
        else navigate('/');
      }, 200);
    } catch (err) {
      setError(err.response?.data?.message || 'بيانات غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register-customer-public`, {
        name: registerForm.name,
        phone: registerForm.phone,
        password: registerForm.password,
      });
      setSuccess('تم إرسال طلب التسجيل بنجاح! بانتظار الموافقة');
      setRegisterForm({ name: '', phone: '', password: '' });
      setTimeout(() => setIsRegistering(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/201117111050', '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#18191a] text-white relative overflow-hidden">
      {/* خلفية خفيفة */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* إنترو */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="flex flex-col items-center space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <div className="rotating-ring" />
                <img
                  src="/icon.png"
                  alt="Shoes Net"
                  className="w-32 h-32 object-contain relative z-10"
                  loading="lazy"
                />
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  Shoes Net
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* الفورم */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-[#242526]/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-center mb-6 gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${!isRegistering ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`px-6 py-2.5 rounded-xl font-medium transition-all ${isRegistering ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg' : 'bg-gray-700 text-gray-400'}`}
                >
                  إنشاء حساب
                </button>
              </div>

              {error && (
                <motion.div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-4 text-center text-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div className="bg-green-500/20 border border-green-500/50 text-green-300 p-3 rounded-xl mb-4 text-center text-sm"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {success}
                </motion.div>
              )}

              {!isRegistering ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">
                      البريد الإلكتروني أو رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={form.emailOrPhone}
                      onChange={(e) => setForm(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                      onFocus={() => savedEmails.length > 0 && setShowDropdown(true)}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all"
                      placeholder="example@domain.com أو 01xxxxxxxxx"
                      required
                      autoComplete="username"
                    />
                    <AnimatePresence>
                      {showDropdown && savedEmails.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#2d2d2d] border border-gray-600 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto"
                        >
                          {savedEmails.map((item, i) => (
                            <div
                              key={i}
                              onClick={() => selectSaved(item)}
                              className="px-4 py-3 hover:bg-red-900/40 cursor-pointer flex justify-between items-center border-b border-gray-700 last:border-0"
                            >
                              <div className="text-right">
                                <p className="text-sm font-medium text-white truncate">{item}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => deleteSaved(e, item)}
                                className="text-red-400 text-xs hover:text-red-300 mr-2"
                              >
                                حذف
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg disabled:opacity-70 transition-all"
                  >
                    {loading ? <CustomLoadingSpinner /> : 'تسجيل الدخول'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">الاسم الكامل</label>
                    <input type="text" value={registerForm.name} onChange={e => setRegisterForm(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400" placeholder="أحمد محمد" required />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">رقم الهاتف</label>
                    <input type="text" value={registerForm.phone} onChange={e => setRegisterForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0,11) }))} className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white" placeholder="01xxxxxxxxx" required maxLength="11" />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">كلمة المرور</label>
                    <input type="password" value={registerForm.password} onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))} className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white" placeholder="••••••••" required minLength="6" />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg disabled:opacity-70 transition-all"
                  >
                    {loading ? <CustomLoadingSpinner /> : 'إنشاء حساب'}
                  </button>
                </form>
              )}

              <p className="text-center mt-6 text-gray-400 text-xs">
                أدمن: admin@test.com / 123456<br />
                العملاء: سجلوا وانتظروا الموافقة
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* زر واتساب عائم + الإشعارات تطلع فوقه من غير ما تحرك الزر أبدًا */}
        <div className="fixed bottom-6 left-6 z-50">
          {/* Toast مطلق فوق الزر تمامًا */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[280px] pointer-events-none"
              >
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-400">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-right leading-tight">{toast}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* زر الواتساب - مش هيتحرك أبدًا */}
          <motion.button
            onClick={openWhatsApp}
            className="bg-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-green-500 block"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 1.8 }}
            title="تواصل معانا على واتساب"
          >
            <svg
              className="h-8 w-8 text-green-500 drop-shadow-lg"
              viewBox="0 0 32 32"
              fill="currentColor"
            >
              <path d="M16 3C9.37 3 4 8.37 4 15c0 2.42.72 4.68 1.96 6.58L4 29l7.72-1.96A11.88 11.88 0 0 0 16 27c6.63 0 12-5.37 12-12S22.63 3 16 3zm0 22c-1.86 0-3.59-.51-5.08-1.41l-.36-.21-4.46 1.13 1.18-4.33-.24-.38A9.02 9.02 0 0 1 7 15c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 10-9 10zm5.16-6.57c-.28-.14-1.65-.82-1.9-.92-.25-.09-.43-.14-.61.14-.18.28-.71.92-.87 1.11-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.24-1.41-.82-.73-1.38-1.63-1.54-1.9-.16-.28-.02-.43.12-.57.12-.13.28-.32.41-.48.13-.16.18-.28.27-.47.09-.19.05-.35-.02-.49-.07-.14-.62-1.48-.85-2.04-.22-.55-.45-.47-.62-.48-.16-.02-.35-.02-.54-.02-.19 0-.49.07-.75.35-.26.28-.98.96-.98 2.33 0 1.37 1 2.7 1.14 2.89.14.19 1.93 2.95 4.9 4.15.69.3 1.23.47 1.64.59.69.22 1.31.2 1.8.11.55-.09 1.65-.67 1.88-1.31.23-.65.23-1.2.17-1.31-.07-.11-.25-.18-.53-.32z" />
            </svg>
          </motion.button>
        </div>
      </div>

      <style jsx>{`
        .rotating-ring {
          position: absolute;
          inset: -20px;
          border: 3px solid transparent;
          border-top: 3px solid #ef4444;
          border-right: 3px solid #f87171;
          border-radius: 50%;
          animation: rotate 3s linear infinite;
          opacity: 0.5;
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
