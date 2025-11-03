// frontend/src/pages/BlockCustomer.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const CustomCheckIcon = () => (
  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
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
  const [blockReasonModal, setBlockReasonModal] = useState('');
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

  // === حظر عميل من النموذج ===
  const handleBlock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (!/^\d{11}$/.test(phone)) {
      setError('رقم الهاتف يجب أن يكون 11 رقمًا');
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

  // === تأكيد الحظر من الكرت ===
  const confirmBlock = async (id) => {
    const customer = customers.find(c => c._id === id);
    if (!blockReasonModal.trim()) {
      setError('يرجى كتابة سبب الحظر');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/block-customer`,
        { phone: customer.phone, reason: blockReasonModal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockModal(null);
      setBlockReasonModal('');
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

  // === تعديل عميل ===
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
            حظر العملاء
          </h1>
          <p className="text-red-300 mt-2">إدارة الحظر والتعديل</p>
        </motion.div>

        {/* === رسالة الخطأ / النجاح === */}
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

        {/* === نموذج حظر عميل === */}
        <motion.div
          className="bg-[#242526]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl font-bold text-red-400 mb-6 text-center">حظر عميل برقم الهاتف</h2>
          <form onSubmit={handleBlock} className="space-y-4">
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="رقم الهاتف (11 رقم)"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              required
              disabled={loading}
            />
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="سبب الحظر (اختياري)"
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-24 resize-none focus:outline-none focus:border-red-500"
            />
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold shadow-md hover:from-red-700 hover:to-red-800 disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  جارٍ الحظر...
                </span>
              ) : (
                'حظر العميل'
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
                {editing === customer._id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      defaultValue={customer.name}
                      onChange={e => setEditing({ ...editing, name: e.target.value })}
                      className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                    />
                    <input
                      type="text"
                      defaultValue={customer.phone}
                      onChange={e => setEditing({ ...editing, newPhone: e.target.value })}
                      className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                    />
                    <input
                      type="password"
                      placeholder="كلمة مرور جديدة (اختياري)"
                      onChange={e => setEditing({ ...editing, password: e.target.value })}
                      className="w-full p-3 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(customer._id)}
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing({ name: customer.name, newPhone: customer.phone })}
                        className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-sm font-medium"
                      >
                        تعديل
                      </button>
                      {customer.isBlocked ? (
                        <button
                          onClick={() => handleUnblock(customer._id)}
                          className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-sm font-medium"
                        >
                          إلغاء حظر
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlockModal(customer._id)}
                          className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-sm font-medium"
                        >
                          حظر
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* === مودال تأكيد الحظر === */}
        <AnimatePresence>
          {blockModal && (
            <motion.div
              className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setBlockModal(null); setBlockReasonModal(''); }}
            >
              <motion.div
                className="bg-[#242526]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-red-400 mb-4 text-center">تأكيد الحظر</h3>
                <p className="text-gray-300 mb-4 text-center">
                  العميل: <strong>{customers.find(c => c._id === blockModal)?.name}</strong>
                </p>
                <textarea
                  value={blockReasonModal}
                  onChange={e => setBlockReasonModal(e.target.value)}
                  placeholder="سبب الحظر..."
                  className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-24 resize-none focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => confirmBlock(blockModal)}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-bold"
                  >
                    تأكيد الحظر
                  </button>
                  <button
                    onClick={() => { setBlockModal(null); setBlockReasonModal(''); }}
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

export default BlockCustomer;
