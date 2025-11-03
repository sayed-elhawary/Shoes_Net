// frontend/src/pages/CreateCustomer.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomCheckIcon = () => (
  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const CreateCustomer = () => {
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, newPhone, password }
  const [blocking, setBlocking] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const navigate = useNavigate();

  // === التحقق من صلاحية الأدمن ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      setError('غير مصرح: للأدمن فقط');
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
      setError('فشل جلب العملاء');
    } finally {
      setFetching(false);
    }
  };

  // === إنشاء عميل جديد ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    if (!/^\d{11}$/.test(form.phone)) {
      setError('رقم الهاتف يجب أن يكون 11 رقمًا');
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
      setSuccessMessage('تم إنشاء العميل بنجاح');
      setShowSuccessAnimation(true);
      setForm({ name: '', phone: '', password: '' });
      fetchCustomers();
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // === بدء التعديل ===
  const startEditing = (customer) => {
    setEditing({
      id: customer._id,
      name: customer.name,
      phone: customer.phone,     // الهاتف القديم (لتحديد العميل)
      newPhone: customer.phone,  // الهاتف الجديد (قابل للتعديل)
      password: ''               // كلمة المرور الجديدة (اختياري)
    });
  };

  // === حفظ التعديل ===
  const handleUpdate = async () => {
    if (!editing) return;

    const { id, name, phone, newPhone, password } = editing;

    // التحقق من رقم الهاتف الجديد
    if (newPhone && !/^\d{11}$/.test(newPhone)) {
      setError('رقم الهاتف الجديد يجب أن يكون 11 رقمًا');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/auth/update-customer`,
        {
          phone,       // الهاتف القديم لتحديد العميل
          name: name.trim() || undefined,
          newPhone: newPhone !== phone ? newPhone : undefined,
          password: password || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(null);
      fetchCustomers();
      setSuccessMessage('تم تحديث العميل بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التحديث');
    }
  };

  // === حذف عميل ===
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/auth/delete-customer`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { phone: customer.phone } // نرسل الهاتف في الـ body
        }
      );
      fetchCustomers();
      setSuccessMessage('تم حذف العميل بنجاح');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل حذف العميل');
    }
  };

  // === حظر عميل ===
  const handleBlock = async (id) => {
    if (!blockReason.trim()) {
      setError('يرجى كتابة سبب الحظر');
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
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحظر');
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
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إلغاء الحظر');
    }
  };

  // === تصفية العملاء ===
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            إدارة العملاء
          </h1>
          <p className="text-red-300 mt-2">إنشاء · تعديل · حظر · حذف</p>
        </motion.div>

        {/* === رسائل الخطأ والنجاح === */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-600/20 border border-red-600 text-red-300 p-4 rounded-xl text-center mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              className="bg-green-600/20 border border-green-600 text-green-300 p-4 rounded-xl text-center mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === نموذج إنشاء عميل === */}
        <motion.div
          className="bg-[#242526]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl font-bold text-red-400 mb-6 text-center">إنشاء عميل جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="الاسم"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              required
              disabled={loading}
            />
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="رقم الهاتف (11 رقم)"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              required
              disabled={loading}
            />
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="كلمة المرور"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              required
              disabled={loading}
            />
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  جارٍ الإنشاء...
                </span>
              ) : (
                'إنشاء العميل'
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* === البحث === */}
        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        {/* === قائمة العملاء === */}
        {fetching ? (
          <div className="text-center text-gray-400 py-10">جارٍ تحميل العملاء...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center text-gray-400 py-10">لا يوجد عملاء</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer, i) => (
              <motion.div
                key={customer._id}
                className={`bg-[#242526]/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border ${customer.isBlocked ? 'border-red-600' : 'border-gray-700/50'} overflow-hidden`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
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
                      <button
                        onClick={handleUpdate}
                        className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-medium"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="flex-1 py-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-medium"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
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
                      <button
                        onClick={() => startEditing(customer)}
                        className="py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-xs font-medium"
                      >
                        تعديل
                      </button>
                      {customer.isBlocked ? (
                        <button
                          onClick={() => handleUnblock(customer._id)}
                          className="py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-xs font-medium"
                        >
                          إلغاء حظر
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlocking(customer._id)}
                          className="py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-xs font-medium"
                        >
                          حظر
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(customer._id)}
                        className="py-2 bg-gradient-to-r from-red-800 to-red-900 rounded-xl text-xs font-medium"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
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
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="اكتب سبب الحظر..."
                  className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-28 resize-none focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => handleBlock(blocking)}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold"
                  >
                    تأكيد الحظر
                  </button>
                  <button
                    onClick={() => { setBlocking(null); setBlockReason(''); }}
                    className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold"
                  >
                    إلغاء
                  </button>
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
