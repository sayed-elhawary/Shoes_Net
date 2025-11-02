// frontend/src/pages/BlockCustomer.js
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

const BlockCustomer = () => {
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [blockModal, setBlockModal] = useState(null);
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

  const handleBlock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!/^\d{11}$/.test(phone)) {
      setError('رقم الهاتف يجب أن يتكون من 11 رقمًا');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/block-customer`,
        { phone, reason: reason || 'لا يوجد سبب محدد' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage('تم حظر العميل بنجاح');
      setShowSuccessAnimation(true);
      setPhone('');
      setReason('');
      fetchCustomers();
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
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

  const handleUpdate = async (id) => {
    const customer = customers.find(c => c._id === id);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
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

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
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

        {/* نموذج حظر عميل */}
        <motion.div
          className="bg-[#1F1F2E] p-6 md:p-8 rounded-2xl shadow-2xl mb-8"
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl font-bold text-center text-white mb-6">حظر عميل</h1>

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

          <form onSubmit={handleBlock} className="space-y-4">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400"
              placeholder="رقم الهاتف (11 رقم)"
              required
              disabled={loading}
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 bg-[#2A2A3E] text-white rounded-xl text-sm text-right placeholder-gray-400 resize-none"
              rows="2"
              placeholder="سبب الحظر (اختياري)"
            />
            <motion.button
              type="submit"
              className="w-full p-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? <CustomLoadingSpinner /> : 'حظر العميل'}
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

        {/* قائمة العملاء (كروت) */}
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
                      placeholder="الاسم"
                    />
                    <input
                      type="text"
                      defaultValue={customer.phone}
                      onChange={(e) => setEditing({ ...editing, newPhone: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                      placeholder="رقم الهاتف"
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
                        <button onClick={() => setBlockModal(customer._id)} className="flex-1 bg-red-600 py-2 rounded-lg text-sm">حظر</button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* نافذة تأكيد الحظر */}
        <AnimatePresence>
          {blockModal && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-[#1F1F2E] p-6 rounded-2xl max-w-md w-full"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
                <h3 className="text-xl font-bold text-white mb-4">تأكيد الحظر</h3>
                <p className="text-gray-300 mb-4">هل أنت متأكد من حظر هذا العميل؟</p>
                <div className="flex gap-2">
                  <button onClick={() => { setBlockModal(null); setPhone(customers.find(c => c._id === blockModal).phone); }} className="flex-1 bg-red-600 py-2 rounded-lg">نعم، حظر</button>
                  <button onClick={() => setBlockModal(null)} className="flex-1 bg-gray-600 py-2 rounded-lg">إلغاء</button>
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

export default BlockCustomer;
