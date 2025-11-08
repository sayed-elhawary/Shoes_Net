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
  const navigate = useNavigate();

  // أنيميشن الإنترو
  useEffect(() => {
    const t1 = setTimeout(() => {}, 100);
    const t2 = setTimeout(() => {}, 600);
    const t3 = setTimeout(() => setShowIntro(false), 2000);
    const t4 = setTimeout(() => setShowForm(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // إشعار من الأيقونة نفسها كل 5 ثواني
  useEffect(() => {
    const messages = [
      'للشكاوي تواصل معانا',
      'لتفعيل الحساب تواصل معانا'
    ];
    let index = 0;
    const showToast = () => {
      setToastMessage(messages[index]);
      index = (index + 1) % messages.length;
      setTimeout(() => setToastMessage(''), 3000); // إخفاء بعد 3 ثواني
    };
    const interval = setInterval(showToast, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // فتح واتساب عند الضغط على الأيقونة
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
        {/* إنترو */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="flex flex-col items-center space-y-6"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                {/* دائرة دوارة - موف متدرج */}
                <motion.div
                  className="absolute inset-0 -m-6"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
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
                  className="w-36 h-36 object-contain drop-shadow-xl relative z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
              <motion.div
                className="text-center space-y-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
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
              className="bg-[#242526]/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-gray-700/50"
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            >
              {/* تبويب */}
              <div className="flex justify-center mb-6 gap-4">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    !isRegistering ? 'bg-purple-700 text-white shadow-md' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isRegistering ? 'bg-purple-700 text-white shadow-md' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  إنشاء حساب
                </button>
              </div>

              {/* رسائل */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-purple-500/20 border border-purple-500/50 text-purple-300 p-3 rounded-xl mb-4 text-center text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    className="bg-purple-500/20 border border-purple-500/50 text-purple-300 p-3 rounded-xl mb-4 text-center text-sm"
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
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">البريد أو الهاتف</label>
                    <input
                      type="text"
                      value={form.emailOrPhone}
                      onChange={e => setForm({ ...form, emailOrPhone: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      placeholder="example@domain.com أو 01234567890"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">كلمة المرور</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl disabled:opacity-70"
                    disabled={loading}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'دخول'}
                  </button>
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength="6"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl disabled:opacity-70"
                    disabled={loading}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'إنشاء حساب'}
                  </button>
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

        {/* أيقونة واتساب + إشعار من نفس الأيقونة */}
        <div className="fixed bottom-6 left-6 z-50">
          <motion.button
            onClick={openWhatsApp}
            className="relative w-16 h-16 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 border-4 border-white"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.5, type: "spring", stiffness: 120 }}
            title="تواصل معانا عبر واتساب"
          >
            {/* أيقونة واتساب احترافية جدًا (SVG مخصص) */}
            <svg className="w-10 h-10 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.49 2 2 6.48 2 12.04c0 1.9.52 3.75 1.51 5.35l-1.26 4.61 4.74-1.24c1.55.84 3.29 1.32 5.05 1.32 5.55 0 10.04-4.48 10.04-10.04C22.08 6.49 17.59 2 12.04 2zM17.2 15.41c-.24.67-.72 1.25-1.43 1.41-.59.13-1.37.13-2.31-.36-.71-.37-1.33-.85-1.94-1.38-.61-.53-1.17-1.15-1.67-1.82-.5-.67-.89-1.42-1.15-2.21-.26-.79-.17-1.48.22-2.03.39-.55 1.01-.79 1.68-.67.67.12 1.22.58 1.57 1.15.35.57.55 1.22.57 1.89.02.67-.23 1.3-.68 1.78-.45.48-1.06.83-1.72 1.02-.66.19-1.38.15-2.05-.11-.67-.26-1.27-.72-1.72-1.31-.45-.59-.73-1.28-.81-2.02-.08-.74.06-1.46.38-2.06.32-.6.82-.99 1.41-1.12.59-.13 1.21.02 1.71.41.5.39.86.94 1.06 1.55.2.61.25 1.26.15 1.91-.1.65-.43 1.23-.94 1.65-.51.42-1.18.64-1.89.64-.71 0-1.38-.28-1.88-.78-.5-.5-.78-1.17-.78-1.88 0-.71.28-1.38.78-1.88.5-.5 1.17-.78 1.88-.78.71 0 1.38.28 1.88.78.5.5.78 1.17.78 1.88 0 .71-.28 1.38-.78 1.88-.5.5-1.17.78-1.88.78z"/>
            </svg>
            {/* إشعار صغير يطلع من الأيقونة */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full text-xs font-medium shadow-xl whitespace-nowrap"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
