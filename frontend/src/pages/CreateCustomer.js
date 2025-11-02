// frontend/src/pages/CreateCustomer.js
import React, { useState, useEffect } from 'react';
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

const CreateCustomer = () => {
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!/^\d{11}$/.test(form.phone)) {
      setError('رقم الهاتف يجب أن يتكون من 11 رقمًا');
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

  const handleUpdate = async (id) => {
    const customer = customers.find(c => c._id === id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/update-customer`,
        { ...editing, phone: customer.phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(null);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التحديث');
    }
  };

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

  const filteredCustomers = customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  const formVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, type: 'spring', stiffness: 100 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-6xl mx-auto">

        {/* إنشاء عميل جديد */}
        <motion.div
          className="bg-[#1F1F2E] p-6 md:p-8 rounded-2xl shadow-2xl mb-8"
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl font-bold text-center text-white mb-6">إنشاء عميل جديد</h1>

          <AnimatePresence>
            {error && (
              <motion.div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-center"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {error}
              </motion.div>
            )}
            {successMessage && !loading && (
              <motion.div className="bg-green-500/10 text-green-400 p-3 rounded-lg mb-4 text-center"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400"
              placeholder="الاسم"
              required
              disabled={loading}
            />
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400"
              placeholder="رقم الهاتف (11 رقم)"
              required
              disabled={loading}
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400"
              placeholder="كلمة المرور"
              required
              disabled={loading}
            />
            <motion.button
              type="submit"
              className="w-full p-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'إنشاء العميل'}
            </motion.button>
          </form>
        </motion.div>

        {/* البحث */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400"
          />
        </div>

        {/* قائمة العملاء */}
        {fetching ? (
          <div className="text-center text-white">جارٍ تحميل العملاء...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center text-gray-400">لا يوجد عملاء</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer._id}
                className={`bg-[#1F1F2E] p-6 rounded-2xl shadow-xl ${customer.isBlocked ? 'border-2 border-red-500' : ''}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                {editing === customer._id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={customer.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      defaultValue={customer.phone}
                      onChange={(e) => setEditing({ ...editing, newPhone: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                    />
                    <input
                      type="password"
                      placeholder="كلمة مرور جديدة"
                      onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(customer._id)} className="flex-1 bg-green-600 py-2 rounded-lg text-sm">حفظ</button>
                      <button onClick={() => setEditing(null)} className="flex-1 bg-gray-600 py-2 rounded-lg text-sm">إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                        <p className="text-sm text-gray-400">{customer.phone}</p>
                        {customer.isBlocked && (
                          <p className="text-xs text-red-400 mt-1">سبب: {customer.blockReason || 'غير محدد'}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${customer.isBlocked ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                        {customer.isBlocked ? 'محظور' : 'نشط'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditing({ name: customer.name, newPhone: customer.phone })} className="flex-1 bg-blue-600 py-2 rounded-lg text-sm">تعديل</button>
                      {customer.isBlocked ? (
                        <button onClick={() => handleUnblock(customer._id)} className="flex-1 bg-green-600 py-2 rounded-lg text-sm">إلغاء حظر</button>
                      ) : (
                        <button onClick={() => setBlocking(customer._id)} className="flex-1 bg-red-600 py-2 rounded-lg text-sm">حظر</button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* نافذة سبب الحظر */}
        <AnimatePresence>
          {blocking && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-[#1F1F2E] p-6 rounded-2xl max-w-md w-full"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                <h3 className="text-xl font-bold text-white mb-4">سبب الحظر</h3>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-3 bg-[#2A2A3E] text-white rounded-lg text-sm resize-none"
                  rows="3"
                  placeholder="اكتب سبب الحظر..."
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleBlock(blocking)} className="flex-1 bg-red-600 py-2 rounded-lg">تأكيد</button>
                  <button onClick={() => { setBlocking(null); setBlockReason(''); }} className="flex-1 bg-gray-600 py-2 rounded-lg">إلغاء</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* أنيميشن النجاح */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white p-6 rounded-lg" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
                <CustomCheckIcon />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CreateCustomer;
