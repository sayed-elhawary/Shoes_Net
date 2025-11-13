// frontend/src/pages/PendingCustomers.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const PendingCustomers = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchPending();
  }, [navigate]);
  const fetchPending = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/pending-customers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل في جلب الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  };
  const approve = async (phone) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/approve-customer`, { phone }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(prev => prev.filter(c => c.phone !== phone));
      showToast('تمت الموافقة بنجاح', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل في الموافقة', 'error');
    }
  };
  const reject = async (phone) => {
    if (!window.confirm('هل تريد رفض هذا الطلب؟')) return;
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reject-customer`, { phone }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPending(prev => prev.filter(c => c.phone !== phone));
      showToast('تم الرفض بنجاح', 'error');
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل في الرفض', 'error');
    }
  };
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };
  // === الأنيميشن ===
  const cardVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    hover: { scale: 1.02, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)' }
  };
  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };
  const toastVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 }
  };
  return (
    <div className="min-h-screen bg-[#18191a] text-white p-6 relative overflow-hidden">
      {/* خلفية أحمر ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700" />
      </div>
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            طلبات التسجيل المعلقة
          </h1>
          <p className="text-red-300 mt-2 text-lg">مراجعة طلبات العملاء الجدد</p>
        </motion.div>
        {/* === حالة التحميل === */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <motion.div
              className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : pending.length === 0 ? (
          <motion.p
            className="text-center text-slate-400 text-xl py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            لا توجد طلبات معلقة حاليًا
          </motion.p>
        ) : (
          <div className="grid gap-5">
            <AnimatePresence>
              {pending.map((customer, index) => (
                <motion.div
                  key={customer._id}
                  className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  whileHover="hover"
                  custom={index}
                  layout
                >
                  <div className="text-right">
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                      {customer.name}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">رقم الهاتف: {customer.phone}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      تاريخ الطلب: {new Date(customer.createdAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <motion.button
                      onClick={() => approve(customer.phone)}
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold shadow-lg hover:from-green-700 hover:to-green-800 transition"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      موافقة
                    </motion.button>
                    <motion.button
                      onClick={() => reject(customer.phone)}
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold shadow-lg hover:from-red-700 hover:to-red-800 transition"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      رفض
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      {/* === Toast === */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            className={`fixed top-6 right-6 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 z-50 ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-white`}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default PendingCustomers;
