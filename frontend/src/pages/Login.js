// frontend/src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
// -------------------------------------------------
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// -------------------------------------------------
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
  const [toastMessage, setToastMessage] = useState('');
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAccountsDropdown, setShowAccountsDropdown] = useState(false);
  const navigate = useNavigate();
  // تحميل الحسابات المحفوظة من localStorage
  useEffect(() => {
    const accounts = JSON.parse(localStorage.getItem('savedLoginAccounts') || '[]');
    setSavedAccounts(accounts);
    const lastUsed = localStorage.getItem('lastUsedAccount');
    if (lastUsed) {
      const account = accounts.find(acc => acc.id === lastUsed);
      if (account) {
        setForm({
          emailOrPhone: account.emailOrPhone,
          password: account.password,
        });
      }
    }
  }, []);
  // حفظ الحسابات في localStorage عند التغيير
  useEffect(() => {
    localStorage.setItem('savedLoginAccounts', JSON.stringify(savedAccounts));
  }, [savedAccounts]);
  // أنيميشن الإنترو (أكثر سلاسة)
  useEffect(() => {
    const t1 = setTimeout(() => setShowIntro(false), 2200);
    const t2 = setTimeout(() => setShowForm(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // إشعار من الأيقونة كل 5 ثواني
  useEffect(() => {
    const messages = [
      'للشكاوي تواصل معانا',
      'لتفعيل الحساب تواصل معانا'
    ];
    let index = 0;
    const showToast = () => {
      setToastMessage(messages[index]);
      index = (index + 1) % messages.length;
      setTimeout(() => setToastMessage(''), 3000);
    };
    const interval = setInterval(showToast, 5000);
    return () => clearInterval(interval);
  }, []);
  // ---------- حفظ الحساب بعد تسجيل دخول ناجح ----------
  const saveAccount = (emailOrPhone, password, name = '') => {
    const id = Date.now().toString();
    const displayName = name || emailOrPhone;
    const newAccount = {
      id,
      emailOrPhone,
      password,
      displayName,
      savedAt: new Date().toLocaleString('ar-EG')
    };
    const filtered = savedAccounts.filter(acc => acc.emailOrPhone !== emailOrPhone);
    const updated = [newAccount, ...filtered].slice(0, 10);
    setSavedAccounts(updated);
    localStorage.setItem('lastUsedAccount', id);
  };
  // ---------- اختيار حساب من القائمة ----------
  const selectAccount = (account) => {
    setForm({
      emailOrPhone: account.emailOrPhone,
      password: account.password,
    });
    setShowAccountsDropdown(false);
  };
  // ---------- حذف حساب ----------
  const deleteAccount = (id, e) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(acc => acc.id !== id);
    setSavedAccounts(updated);
    if (localStorage.getItem('lastUsedAccount') === id) {
      localStorage.removeItem('lastUsedAccount');
    }
  };
  // ---------- تسجيل الدخول ----------
  const handleLogin = async e => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const payload = {};
      if (/^\d{11}$/.test(form.emailOrPhone)) payload.phone = form.emailOrPhone;
      else payload.email = form.emailOrPhone;
      payload.password = form.password;
      const res = await axios.post(`${API_URL}/api/auth/login`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.userId);
      window.dispatchEvent(new Event('authChange'));
      const userName = res.data.name || '';
      saveAccount(form.emailOrPhone, form.password, userName);
      setTimeout(() => {
        const { role } = res.data;
        if (role === 'admin') navigate('/admin');
        else if (role === 'vendor') navigate('/vendor');
        else navigate('/');
      }, 600);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };
  // ---------- إنشاء حساب ----------
  const handleRegister = async e => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const payload = {
        name: registerForm.name,
        phone: registerForm.phone,
        password: registerForm.password,
      };
      await axios.post(`${API_URL}/api/auth/register-customer-public`, payload);
      setSuccess('تم إرسال طلب التسجيل بنجاح! بانتظار موافقة الأدمن');
      setRegisterForm({ name: '', phone: '', password: '' });
      setTimeout(() => setIsRegistering(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };
  // فتح واتساب
  const openWhatsApp = () => {
    const phone = '201553531373';
    const url = `https://wa.me/${phone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#18191a] text-white relative overflow-hidden">
      {/* خلفية ناعمة - موف */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        {/* إنترو (أكثر سلاسة) */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="flex flex-col items-center space-y-6"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -60 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 -m-6"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#e9d5ff" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeDasharray="15 15" className="opacity-50" />
                  </svg>
                </motion.div>
                <motion.img
                  src="/icon.png"
                  alt="Web Shose"
                  className="w-36 h-36 object-contain drop-shadow-2xl relative z-10"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
              <motion.div
                className="text-center space-y-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1 }}
              >
                <p className="text-lg font-medium text-purple-400 tracking-widest">أهلاً بك في</p>
                <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                  Web Shose
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* نموذج الدخول / التسجيل */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-[#242526]/90 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-gray-700/50"
              initial={{ opacity: 0, y: 50, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              {/* تبويب */}
              <div className="flex justify-center mb-6 gap-4">
                <motion.button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                    !isRegistering ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' : 'bg-gray-700 text-gray-400'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  تسجيل الدخول
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                    isRegistering ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' : 'bg-gray-700 text-gray-400'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  إنشاء حساب
                </motion.button>
              </div>
              {/* رسائل */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl mb-4 text-center text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="bg-green-500/20 border border-green-500/50 text-green-300 p-3 rounded-xl mb-4 text-center text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* ==== تسجيل الدخول ==== */}
              {!isRegistering ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="relative">
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">البريد أو الهاتف</label>
                    <input
                      type="text"
                      value={form.emailOrPhone}
                      onChange={e => setForm({ ...form, emailOrPhone: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                      placeholder="example@domain.com أو 01234567890"
                      required
                      disabled={loading}
                    />
                    {savedAccounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAccountsDropdown(!showAccountsDropdown)}
                        className="absolute left-3 top-11 text-purple-400 text-xs underline hover:text-purple-300 transition"
                      >
                        الحسابات المحفوظة
                      </button>
                    )}
                    <AnimatePresence>
                      {showAccountsDropdown && savedAccounts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#2d2d2d] border border-gray-600 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto"
                        >
                          {savedAccounts.map(acc => (
                            <div
                              key={acc.id}
                              onClick={() => selectAccount(acc)}
                              className="px-4 py-3 hover:bg-purple-900/40 cursor-pointer flex justify-between items-center border-b border-gray-700 last:border-0 transition"
                            >
                              <div className="text-right">
                                <p className="text-sm font-medium text-white">{acc.displayName}</p>
                                <p className="text-xs text-gray-400">{acc.emailOrPhone}</p>
                              </div>
                              <button
                                onClick={(e) => deleteAccount(acc.id, e)}
                                className="text-red-400 text-xs hover:text-red-300 transition"
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
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">كلمة المرور</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl disabled:opacity-70 transition-all duration-300"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'دخول'}
                  </motion.button>
                </form>
              ) : (
                /* ==== إنشاء حساب ==== */
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">الاسم الكامل</label>
                    <input
                      type="text"
                      value={registerForm.name}
                      onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                      placeholder="أحمد محمد"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">رقم الهاتف (11 رقم)</label>
                    <input
                      type="text"
                      value={registerForm.phone}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setRegisterForm({ ...registerForm, phone: v });
                      }}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                      placeholder="01234567890"
                      required
                      disabled={loading}
                      maxLength="11"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">كلمة المرور</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/70 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all duration-300"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength="6"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl disabled:opacity-70 transition-all duration-300"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'إنشاء حساب'}
                  </motion.button>
                </form>
              )}
              {/* معلومات مساعدة */}
              <p className="text-center mt-6 text-gray-400 text-xs leading-relaxed">
                للأدمن: <span className="text-purple-300">admin@test.com</span> / 123456
                <br />
                للتاجر: أنشئ من لوحة الأدمن
                <br />
                للعملاء: سجل هنا وانتظر موافقة الأدمن
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* أيقونة واتساب العائمة - مطابقة لصفحة Home */}
        <div className="fixed bottom-6 left-6 z-50">
          <motion.button
            onClick={openWhatsApp}
            className="relative bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#128C7E] transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.5, type: "spring", stiffness: 120 }}
            title="تواصل معانا عبر واتساب"
          >
            {/* الأيقونة نفسها من صفحة Home */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.33.26 2.59.73 3.77L2 21l5.44-.94c1.14.77 2.46 1.17 3.81 1.17 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.66 14.56c-.24.66-.88.88-1.44.49-1.22-.86-2.96-2.07-4.44-2.56-.66-.22-1.32-.09-1.77.33l-.66.66c-.22.22-.55.22-.77 0-.55-.55-1.44-1.44-1.77-2.1-.11-.22 0-.44.22-.55.55-.33 1.11-.88 1.44-1.44.22-.33.11-.77-.22-1.1-.66-.66-1.32-1.32-1.99-1.99-.33-.33-.77-.44-1.21-.22-.44.22-.88.66-1.1 1.1-.88 1.77.22 4.1 2.21 6.09 2.43 2.43 5.31 2.65 7.08 1.77.44-.22.88-.66 1.1-1.1.33-.66.11-1.44-.55-1.77z"/>
            </svg>

            {/* Toast الإشعار */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-2xl whitespace-nowrap"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
export default Login;
