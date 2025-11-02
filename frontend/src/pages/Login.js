import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomLoadingSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    <span className="text-sm">جارٍ التحميل...</span>
  </div>
);

const Login = () => {
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIntro, setShowIntro] = useState(true); // يتحكم في اللوجو + الرسالة
  const [showForm, setShowForm] = useState(false);  // يتحكم في النموذج
  const navigate = useNavigate();

  // === تسلسل الأنيميشن: لوغو → رسالة → اختفاء → نموذج ===
  useEffect(() => {
    const timer1 = setTimeout(() => {}, 800); // اللوجو يظهر فورًا
    const timer2 = setTimeout(() => {}, 1600); // الرسالة تظهر بعد اللوجو
    const timer3 = setTimeout(() => setShowIntro(false), 3200); // يختفي الكل
    const timer4 = setTimeout(() => setShowForm(true), 3500);   // النموذج يظهر

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {};
      if (/^\d{11}$/.test(form.emailOrPhone)) {
        payload.phone = form.emailOrPhone;
      } else {
        payload.email = form.emailOrPhone;
      }
      payload.password = form.password;

      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.userId);
      window.dispatchEvent(new Event('authChange'));

      setTimeout(() => {
        if (res.data.role === 'admin') {
          navigate('/admin');
        } else if (res.data.role === 'vendor') {
          navigate('/vendor');
        } else {
          navigate('/');
        }
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* === اللوجو + الرسالة (معًا في حاوية واحدة) === */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ 
                opacity: 0, 
                scale: 0.9, 
                y: -80,
                transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
              }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* اللوجو مع الحلقة */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 -m-4"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#fca5a5" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="4"
                      strokeDasharray="20 10"
                      className="opacity-70"
                    />
                  </svg>
                </motion.div>

                <motion.img
                  src="/icon.png"
                  alt="SHOSE NET"
                  className="w-40 h-40 object-contain drop-shadow-2xl relative z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>

              {/* الرسالة الترحيبية (تظهر بعد اللوجو) */}
              <motion.div
                className="text-center space-y-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.2 }}
              >
                <p className="text-lg font-medium text-red-400 tracking-widest">
                  أهلاً بك في
                </p>
                <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                  متجر SHOSE NET
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === نموذج تسجيل الدخول (يحل محل اللوجو بنعومة) === */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700/50"
              initial={{ 
                opacity: 0, 
                y: 60, 
                scale: 0.92 
              }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1 
              }}
              transition={{ 
                duration: 0.9, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1
              }}
            >
              <h1 className="text-2xl font-bold text-center text-white mb-8">تسجيل الدخول</h1>

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
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/80 text-sm mb-2 text-right font-medium">
                    البريد أو الهاتف
                  </label>
                  <input
                    type="text"
                    value={form.emailOrPhone}
                    onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                    className="w-full p-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    placeholder="example@domain.com أو 01234567890"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2 text-right font-medium">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full p-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full p-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl"
                  disabled={loading}
                >
                  {loading ? <CustomLoadingSpinner /> : 'دخول'}
                </button>
              </form>

              <p className="text-center mt-6 text-slate-400 text-xs leading-relaxed">
                للأدمن: admin@test.com / 123456
                <br />
                للتاجر: أنشئ من لوحة الأدمن
                <br />
                للعملاء: اطلب حسابًا من الأدمن
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
