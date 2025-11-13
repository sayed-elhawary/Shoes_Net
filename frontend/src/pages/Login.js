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
  const [savedEmails, setSavedEmails] = useState([]); // فقط الإيميلات/التليفونات
  const [showDropdown, setShowDropdown] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // تحميل الحسابات المحفوظة بأخف طريقة ممكنة
  useEffect(() => {
    const load = () => {
      try {
        const data = localStorage.getItem('savedLogins');
        if (data) {
          const parsed = JSON.parse(data);
          setSavedEmails(parsed.slice(0, 8)); // أخر 8 حسابات بس
          // إملأ آخر حساب مستخدم تلقائيًا
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

  // حفظ الإيميل/التليفون فقط بعد تسجيل دخول ناجح
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

  // اختيار من الدرب داون
  const selectSaved = (value) => {
    setForm(prev => ({ ...prev, emailOrPhone: value, password: '' }));
    setShowDropdown(false);
    localStorage.setItem('lastLoginEmail', value);
  };

  // حذف حساب محفوظ
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

  // إغلاق الدرب داون عند النقر بره
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // أنيميشن الإنترو خفيف جدًا
  useEffect(() => {
    const t1 = setTimeout(() => setShowIntro(false), 1500);
    const t2 = setTimeout(() => setShowForm(true), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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

      // حفظ الإيميل/التليفون فقط بعد نجاح اللوجن
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
    window.open('https://wa.me/201553531373', '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#18191a] text-white relative overflow-hidden">
      {/* خلفية خفيفة جدًا */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* إنترو سريع */}
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

                    {/* درب داون الحسابات المحفوظة */}
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

        {/* واتساب عائم */}
        <motion.button
          onClick={openWhatsApp}
          className="fixed bottom-6 left-6 bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-50"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 1.8 }}
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.33.26 2.59.73 3.77L2 21l5.44-.94c1.14.77 2.46 1.17 3.81 1.17 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.66 14.56c-.24.66-.88.88-1.44.49-1.22-.86-2.96-2.07-4.44-2.56-.66-.22-1.32-.09-1.77.33l-.66.66c-.22.22-.55.22-.77 0-.55-.55-1.44-1.44-1.77-2.1-.11-.22 0-.44.22-.55.55-.33 1.11-.88 1.44-1.44.22-.33.11-.77-.22-1.1-.66-.66-1.32-1.32-1.99-1.99-.33-.33-.77-.44-1.21-.22-.44.22-.88.66-1.1 1.1-.88 1.77.22 4.1 2.21 6.09 2.43 2.43 5.31 2.65 7.08 1.77.44-.22.88-.66 1.1-1.1.33-.66.11-1.44-.55-1.77z"/>
          </svg>
        </motion.button>
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
