// frontend/src/pages/ManageCustomers.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
const ManageCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editing, setEditing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [form, setForm] = useState({});
  const [blockReason, setBlockReason] = useState('');
  const navigate = useNavigate();
  // === التحقق من صلاحية الأدمن ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      showToast('غير مصرح: للأدمن فقط', 'error');
      navigate('/login');
      return;
    }
    fetchCustomers();
  }, [navigate]);
  // === جلب العملاء ===
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(res.data);
    } catch (err) {
      showToast('فشل جلب العملاء', 'error');
    } finally {
      setLoading(false);
    }
  };
  // === بدء التعديل ===
  const handleEdit = (customer) => {
    setEditing(customer._id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      newPhone: customer.phone,
      password: '',
    });
  };
  // === حفظ التعديل ===
  const handleUpdate = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/auth/update-customer`,
        { ...form, phone: customers.find(c => c._id === id).phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(null);
      fetchCustomers();
      showToast('تم تحديث العميل بنجاح', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل التحديث', 'error');
    }
  };
  // === حظر عميل ===
  const handleBlock = async (id) => {
    if (!blockReason.trim()) {
      showToast('يرجى كتابة سبب الحظر', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/block-customer`,
        { phone: customer.phone, reason: blockReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlocking(null);
      setBlockReason('');
      fetchCustomers();
      showToast('تم حظر العميل بنجاح', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل الحظر', 'error');
    }
  };
  // === إلغاء الحظر ===
  const handleUnblock = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/unblock-customer`,
        { phone: customer.phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCustomers();
      showToast('تم إلغاء الحظر', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل إلغاء الحظر', 'error');
    }
  };
  // === Toast ===
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };
  // === الأنيميشن ===
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    hover: { scale: 1.03, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)' }
  };
  const buttonVariants = { hover: { scale: 1.05 }, tap: { scale: 0.95 } };
  const toastVariants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 50 } };
  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية أحمر ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            إدارة العملاء
          </h1>
          <p className="text-red-300 mt-2 text-lg">تعديل · حظر · إلغاء</p>
        </motion.div>
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
        {/* === حالة التحميل === */}
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div
              className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : customers.length === 0 ? (
          <motion.p
            className="text-center text-slate-400 text-xl py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            لا يوجد عملاء حاليًا
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {customers.map((customer, i) => (
                <motion.div
                  key={customer._id}
                  className={`bg-[#242526]/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border ${
                    customer.isBlocked ? 'border-red-600' : 'border-gray-700/50'
                  } overflow-hidden`}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  whileHover="hover"
                  custom={i}
                  layout
                >
                  {editing === customer._id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500"
                        placeholder="الاسم"
                      />
                      <input
                        type="text"
                        value={form.newPhone}
                        onChange={(e) => setForm({ ...form, newPhone: e.target.value })}
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500"
                        placeholder="رقم الهاتف الجديد"
                      />
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500"
                        placeholder="كلمة مرور جديدة (اختياري)"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleUpdate(customer._id)}
                          className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-medium"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          حفظ
                        </motion.button>
                        <motion.button
                          onClick={() => setEditing(null)}
                          className="flex-1 py-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-medium"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          إلغاء
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-right">
                          <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                          <p className="text-sm text-gray-400">{customer.phone}</p>
                          {customer.isBlocked && (
                            <p className="text-xs text-red-400 mt-1">
                              سبب الحظر: {customer.blockReason || 'غير محدد'}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            customer.isBlocked ? 'bg-red-600' : 'bg-green-600'
                          } text-white`}
                        >
                          {customer.isBlocked ? 'محظور' : 'نشط'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <motion.button
                          onClick={() => handleEdit(customer)}
                          className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-sm font-medium"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          تعديل
                        </motion.button>
                        {customer.isBlocked ? (
                          <motion.button
                            onClick={() => handleUnblock(customer._id)}
                            className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-sm font-medium"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            إلغاء الحظر
                          </motion.button>
                        ) : (
                          <motion.button
                            onClick={() => setBlocking(customer._id)}
                            className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-sm font-medium"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            حظر
                          </motion.button>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {/* === نافذة سبب الحظر === */}
        <AnimatePresence>
          {blocking && (
            <motion.div
              className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setBlocking(null); setBlockReason(''); }}
            >
              <motion.div
                className="bg-[#242526]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-red-400 mb-4 text-center">سبب الحظر</h3>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-28 resize-none focus:outline-none focus:border-red-500"
                  placeholder="اكتب سبب الحظر..."
                />
                <div className="flex gap-3 mt-5">
                  <motion.button
                    onClick={() => handleBlock(blocking)}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    تأكيد الحظر
                  </motion.button>
                  <motion.button
                    onClick={() => { setBlocking(null); setBlockReason(''); }}
                    className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default ManageCustomers;
