import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomCheckIcon = () => (
  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const CustomLoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
    <span className="mr-2">جارٍ التحميل...</span>
  </div>
);

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.userId);
      setSuccessMessage('تم تسجيل الدخول بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
        if (res.data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/vendor');
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
  };

  const inputVariants = {
    hover: {
      scale: 1.02,
      borderColor: 'rgba(59, 130, 246, 0.5)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    focus: {
      scale: 1.02,
      borderColor: 'rgba(59, 130, 246, 0.5)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <motion.div
        className="bg-[#1F1F2E] p-8 rounded-2xl shadow-2xl w-full max-w-md"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-2xl font-bold text-center text-white mb-6">🔐 تسجيل الدخول</h1>

        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}
          {successMessage && !loading && (
            <motion.div
              className="bg-green-500/10 text-green-400 p-3 rounded-lg mb-4 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4">
            <label className="block text-white text-sm mb-2 text-right">البريد الإلكتروني</label>
            <motion.input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 border border-gray-200/30 rounded-xl focus:outline-none transition-all duration-300 bg-[#2A2A3E] text-white text-sm shadow-sm text-right placeholder-gray-400"
              required
              disabled={loading}
              placeholder="أدخل البريد الإلكتروني"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          </div>
          <div className="mb-6">
            <label className="block text-white text-sm mb-2 text-right">كلمة المرور</label>
            <motion.input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 border border-gray-200/30 rounded-xl focus:outline-none transition-all duration-300 bg-[#2A2A3E] text-white text-sm shadow-sm text-right placeholder-gray-400"
              required
              disabled={loading}
              placeholder="أدخل كلمة المرور"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          </div>
          <motion.button
            type="submit"
            className="w-full p-3 rounded-xl text-white font-semibold"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            disabled={loading}
          >
            {loading ? <CustomLoadingSpinner /> : 'تسجيل الدخول'}
          </motion.button>
        </motion.form>

        <p className="text-center mt-4 text-sm text-gray-400">
          للأدمن: admin@test.com / 123456
          <br />
          للتاجر: أنشئ من لوحة الأدمن
        </p>

        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="bg-white p-6 rounded-lg flex items-center justify-center"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.5 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <CustomCheckIcon />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Login;
