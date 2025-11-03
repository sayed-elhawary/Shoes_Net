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
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700" />
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
                <motion.div
                  className="absolute inset-0 -m-6"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#fca5a5" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeDasharray="15 15" className="opacity-50" />
                  </svg>
                </motion.div>
                <motion.img
                  src="/icon.png"
                  alt="SHOSE NET"
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
                <p className="text-lg font-medium text-red-400 tracking-widest">أهلاً بك في</p>
                <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                  متجر SHOSE NET
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
                    !isRegistering ? 'bg-red-600 text-white shadow-md' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    isRegistering ? 'bg-green-600 text-white shadow-md' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  إنشاء حساب
                </button>
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
                  <div>
                    <label className="block text-white/80 text-sm mb-2 text-right font-medium">البريد أو الهاتف</label>
                    <input
                      type="text"
                      value={form.emailOrPhone}
                      onChange={e => setForm({ ...form, emailOrPhone: e.target.value })}
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl disabled:opacity-70"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
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
                      className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      minLength="6"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl disabled:opacity-70"
                    disabled={loading}
                  >
                    {loading ? <CustomLoadingSpinner /> : 'إنشاء حساب'}
                  </button>
                </form>
              )}

              {/* معلومات مساعدة */}
              <p className="text-center mt-6 text-gray-400 text-xs leading-relaxed">
                للأدمن: <span className="text-red-300">admin@test.com</span> / 123456
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
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 5.44h-.006c-1.58 0-3.13-.595-4.497-1.718l-.321-.19-3.313.873 1.002-3.233-.236-.375c-1.175-1.863-1.792-4.009-1.792-6.205 0-6.336 5.159-11.486 11.495-11.486 3.072 0 5.958 1.198 8.126 3.374 2.168 2.176 3.374 5.06 3.374 8.13-.001 6.336-5.16 11.486-11.495 11.486m6.708-18.74c-2.61-2.61-6.07-4.05-9.755-4.05-7.602 0-13.783 6.182-13.783 13.783 0 2.43.632 4.795 1.833 6.846l-1.947 6.298 6.45-1.692c1.988 1.084 4.218 1.657 6.474 1.657 7.602 0 13.783-6.182 13.783-13.783 0-3.686-1.44-7.146-4.055-9.755"/>
            </svg>

            {/* إشعار صغير يطلع من الأيقونة */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-xs font-medium shadow-xl whitespace-nowrap"
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
