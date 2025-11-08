// frontend/src/pages/CreateCustomer.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// === أيقونة نجاح مخصصة ===
const CustomCheckIcon = () => (
  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const CreateCustomer = () => {
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, phone, newPhone, password }
  const [blocking, setBlocking] = useState(null);
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
      setFetching(false);
    }
  };

  // === إنشاء عميل جديد ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!/^\d{11}$/.test(form.phone)) {
      showToast('رقم الهاتف يجب أن يكون 11 رقمًا', 'error');
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/register-customer`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm({ name: '', phone: '', password: '' });
      fetchCustomers();
      setShowSuccessAnimation(true);
      showToast('تم إنشاء العميل بنجاح', 'success');
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'حدث خطأ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // === بدء التعديل ===
  const startEditing = (customer) => {
    setEditing({
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      newPhone: customer.phone,
      password: ''
    });
  };

  // === حفظ التعديل ===
  const handleUpdate = async () => {
    if (!editing) return;
    const { id, name, phone, newPhone, password } = editing;
    if (newPhone && !/^\d{11}$/.test(newPhone)) {
      showToast('رقم الهاتف الجديد يجب أن يكون 11 رقمًا', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/auth/update-customer`,
        {
          phone,
          name: name.trim() || undefined,
          newPhone: newPhone !== phone ? newPhone : undefined,
          password: password || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(null);
      fetchCustomers();
      setShowSuccessAnimation(true);
      showToast('تم تحديث العميل بنجاح', 'success');
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل التحديث', 'error');
    }
  };

  // === حذف عميل ===
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/auth/delete-customer`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { phone: customer.phone }
        }
      );
      fetchCustomers();
      setShowSuccessAnimation(true);
      showToast('تم حذف العميل بنجاح', 'success');
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'فشل حذف العميل', 'error');
    }
  };

  // === حظر عميل ===
  const handleBlock = async (id) => {
    if (!blockReason.trim()) {
      showToast('يرجى كتابة سبب الحظر', 'error');
      return;
    }
    const customer = customers.find(c => c._id === id);
    try {
      const token = localStorage.getItem('token');
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
    const customer = customers.find(c => c._id === id);
    try {
      const token = localStorage.getItem('token');
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

  // === تصفية العملاء ===
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

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
      {/* خلفية موف ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            إدارة العملاء
          </h1>
          <p className="text-purple-300 mt-2 text-lg">إنشاء · تعديل · حظر · حذف</p>
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

        {/* === نموذج إنشاء عميل === */}
        <motion.div
          className="bg-[#242526]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-purple-400 mb-6 text-center">إنشاء عميل جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="الاسم"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              required
              disabled={loading}
            />
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="رقم الهاتف (11 رقم)"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              required
              disabled={loading}
            />
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="كلمة المرور"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
              required
              disabled={loading}
            />
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-70 transition"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  جارٍ الإنشاء...
                </span>
              ) : (
                'إنشاء العميل'
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* === البحث === */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
          />
        </motion.div>

        {/* === قائمة العملاء === */}
        {fetching ? (
          <div className="flex justify-center py-20">
            <motion.div
              className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <motion.p
            className="text-center text-slate-400 text-xl py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            لا يوجد عملاء
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCustomers.map((customer, i) => (
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
                  {editing?.id === customer._id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editing.name}
                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                      />
                      <input
                        type="text"
                        value={editing.newPhone}
                        onChange={e => setEditing({ ...editing, newPhone: e.target.value })}
                        placeholder="رقم هاتف جديد"
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                      />
                      <input
                        type="password"
                        value={editing.password}
                        onChange={e => setEditing({ ...editing, password: e.target.value })}
                        placeholder="كلمة مرور جديدة (اختياري)"
                        className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          onClick={handleUpdate}
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
                            <p className="text-xs text-red-400 mt-1">سبب: {customer.blockReason || 'غير محدد'}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${customer.isBlocked ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                          {customer.isBlocked ? 'محظور' : 'نشط'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <motion.button
                          onClick={() => startEditing(customer)}
                          className="py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-xs font-medium"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          تعديل
                        </motion.button>
                        {customer.isBlocked ? (
                          <motion.button
                            onClick={() => handleUnblock(customer._id)}
                            className="py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-xs font-medium"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            إلغاء حظر
                          </motion.button>
                        ) : (
                          <motion.button
                            onClick={() => setBlocking(customer._id)}
                            className="py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-xs font-medium"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            حظر
                          </motion.button>
                        )}
                        <motion.button
                          onClick={() => handleDelete(customer._id)}
                          className="py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-xs font-medium"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          حذف
                        </motion.button>
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
                <h3 className="text-xl font-bold text-purple-400 mb-4 text-center">سبب الحظر</h3>
                <textarea
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="اكتب سبب الحظر..."
                  className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-28 resize-none focus:outline-none focus:border-purple-500"
                />
                <div className="flex gap-3 mt-5">
                  <motion.button
                    onClick={() => handleBlock(blocking)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl font-bold"
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

        {/* === أنيميشن النجاح === */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#242526] p-8 rounded-2xl shadow-2xl"
                initial={{ scale: 0.5, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.5, rotate: 180 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CustomCheckIcon />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreateCustomer;
