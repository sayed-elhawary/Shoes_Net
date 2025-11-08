// frontend/src/pages/CreateVendor.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function CreateVendor() {
  const [form, setForm] = useState({ name: '', email: '', password: '', description: '', phone: '', logo: null });
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const navigate = useNavigate();

  // Debounce
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // === التحقق من صلاحية الأدمن ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      setError('غير مصرح: للأدمن فقط');
      navigate('/login');
      return;
    }
    fetchVendors();
  }, [navigate]);

  // === جلب التجار مع البحث ===
  const fetchVendors = useCallback(
    debounce(async (query = '') => {
      setFetchLoading(true);
      try {
        const token = localStorage.getItem('token');
        let url = `${process.env.REACT_APP_API_URL}/api/vendors`;
        if (query) url += `?name=${encodeURIComponent(query)}`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendors(res.data);
      } catch (err) {
        setError('فشل جلب التجار');
        setVendors([]);
      } finally {
        setFetchLoading(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    fetchVendors(searchQuery);
  }, [searchQuery, fetchVendors]);

  // === إرسال النموذج ===
  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!form.name || !form.email || !form.phone || (!isEditing && !form.password)) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      setLoading(false);
      return;
    }
    if (!/^\d{11}$/.test(form.phone)) {
      setError('رقم الهاتف يجب أن يكون 11 رقمًا');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('phone', form.phone);
    if (!isEditing) formData.append('password', form.password);
    if (form.description) formData.append('description', form.description);
    if (form.logo) formData.append('logo', form.logo);

    try {
      const token = localStorage.getItem('token');
      if (isEditing) {
        await axios.put(`${process.env.REACT_APP_API_URL}/api/vendors/${editingId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        });
        setSuccess('تم تعديل التاجر بنجاح');
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/vendors`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        });
        setSuccess('تم إنشاء التاجر بنجاح');
      }
      setShowSuccessAnimation(true);
      resetForm();
      fetchVendors(searchQuery);
      setTimeout(() => setShowSuccessAnimation(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // === تعديل تاجر ===
  const handleEdit = (vendor) => {
    setForm({
      name: vendor.name || '',
      email: vendor.email || '',
      password: '',
      description: vendor.description || '',
      phone: vendor.phone || '',
      logo: null
    });
    setIsEditing(true);
    setEditingId(vendor._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === حذف تاجر ===
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التاجر؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('تم حذف التاجر بنجاح');
      fetchVendors(searchQuery);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
    }
  };

  // === إعادة تعيين النموذج ===
  const resetForm = () => {
    setForm({ name: '', email: '', password: '', description: '', phone: '', logo: null });
    setIsEditing(false);
    setEditingId(null);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.08 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    hover: { scale: 1.05, y: -8, boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)' }
  };

  const inputVariants = {
    focus: { scale: 1.02, boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3)' }
  };

  return (
    <motion.div
      className="min-h-screen bg-[#18191a] text-white p-4 sm:p-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 drop-shadow-lg">
            إدارة التجار
          </h1>
          <p className="text-purple-300 mt-3 text-lg">إنشاء · تعديل · حذف</p>
        </motion.div>

        {/* === رسائل الخطأ / النجاح === */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="w-full max-w-2xl mx-auto bg-red-900/90 text-white p-5 rounded-2xl mb-8 text-center font-medium shadow-2xl border border-red-800"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              className="w-full max-w-2xl mx-auto bg-green-900/90 text-white p-5 rounded-2xl mb-8 text-center font-medium shadow-2xl border border-green-800"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === نموذج إنشاء/تعديل === */}
        <motion.div
          className="bg-[#242526]/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/70 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            {isEditing ? 'تعديل تاجر' : 'إنشاء تاجر جديد'}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <motion.input
              type="text"
              placeholder="الاسم الكامل *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg"
              disabled={loading}
              variants={inputVariants}
              whileFocus="focus"
            />
            <motion.input
              type="email"
              placeholder="البريد الإلكتروني *"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg"
              disabled={loading}
              variants={inputVariants}
              whileFocus="focus"
            />
            <motion.input
              type="text"
              placeholder="رقم الهاتف (11 رقم) *"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              className="p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg"
              disabled={loading}
              maxLength={11}
              variants={inputVariants}
              whileFocus="focus"
            />
            <motion.input
              type="password"
              placeholder={isEditing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg"
              disabled={loading}
              variants={inputVariants}
              whileFocus="focus"
            />
            <motion.textarea
              placeholder="وصف التاجر"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="md:col-span-2 p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right placeholder-gray-400 h-28 resize-none focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg"
              disabled={loading}
              variants={inputVariants}
              whileFocus="focus"
            />
            <motion.div
              className="md:col-span-2"
              variants={inputVariants}
              whileFocus="focus"
            >
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm({ ...form, logo: e.target.files[0] })}
                className="w-full p-5 rounded-2xl bg-[#3a3b3c]/60 border border-gray-600 text-right file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                disabled={loading}
              />
            </motion.div>
          </div>
          <div className="flex gap-4 mt-8">
            <motion.button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl font-bold shadow-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all duration-300 text-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  جارٍ...
                </span>
              ) : (
                isEditing ? 'حفظ التعديلات' : 'إنشاء التاجر'
              )}
            </motion.button>
            {isEditing && (
              <motion.button
                onClick={resetForm}
                className="flex-1 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 text-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                إلغاء
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* === حقل البحث === */}
        <motion.div
          className="max-w-xl mx-auto mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.input
            type="text"
            placeholder="ابحث باسم التاجر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-5 rounded-2xl bg-[#242526] text-white border border-gray-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-lg transition-all duration-300 shadow-xl placeholder-gray-400"
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>

        {/* === قائمة التجار === */}
        <h2 className="text-3xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
          قائمة التجار
        </h2>

        <AnimatePresence mode="wait">
          {fetchLoading ? (
            <motion.p
              key="loading"
              className="text-center text-2xl text-purple-400 py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              جاري تحميل التجار...
            </motion.p>
          ) : vendors.length === 0 ? (
            <motion.p
              key="no-vendors"
              className="text-center text-2xl text-gray-400 py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {searchQuery ? `لا يوجد تاجر باسم "${searchQuery}"` : 'لا يوجد تجار حاليًا'}
            </motion.p>
          ) : (
            <motion.div
              key="vendors-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {vendors.map((vendor, index) => (
                <motion.div
                  key={vendor._id}
                  className="bg-[#242526]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/70 overflow-hidden flex flex-col h-full"
                  variants={cardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <div className="p-6 flex justify-center items-center flex-1">
                    {vendor.logo ? (
                      <img
                        src={`${process.env.REACT_APP_API_URL}/uploads/${vendor.logo}`}
                        alt={`لوجو ${vendor.name}`}
                        className="w-32 h-32 object-contain rounded-2xl border border-purple-600/50 shadow-xl p-2 bg-white/5"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`;
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center shadow-xl">
                        <span className="text-3xl font-bold text-white">
                          {vendor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-3 text-right border-t border-gray-700 bg-gradient-to-t from-black/20 to-transparent">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 line-clamp-1">
                      {vendor.name}
                    </h3>
                    <p className="text-sm text-gray-300">البريد: {vendor.email}</p>
                    <p className="text-sm text-gray-300">الهاتف: {vendor.phone || 'غير محدد'}</p>
                    <p className="text-sm text-gray-300 line-clamp-2 min-h-10">
                      {vendor.description || 'لا يوجد وصف'}
                    </p>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="flex-1 py-3 text-center rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-300 text-lg"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(vendor._id)}
                        className="flex-1 py-3 text-center rounded-xl text-white font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg transition-all duration-300 text-lg"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              className="bg-[#242526] p-10 rounded-3xl shadow-2xl"
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 180 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <svg className="w-20 h-20 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default CreateVendor;
