// frontend/src/pages/CreateVendor.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function CreateVendor() {
  const [form, setForm] = useState({ name: '', email: '', password: '', description: '', logo: null });
  const [vendors, setVendors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
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
    fetchVendors();
  }, [navigate]);

  // === جلب التجار ===
  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data);
    } catch (err) {
      setError('فشل جلب التجار');
    }
  };

  // === إرسال النموذج ===
  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!form.name || !form.email || (!isEditing && !form.password)) {
      setError('يرجى ملء الحقول المطلوبة');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    if (!isEditing) formData.append('password', form.password);
    formData.append('description', form.description || '');
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
      fetchVendors();
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
      logo: null
    });
    setIsEditing(true);
    setEditingId(vendor._id);
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
      fetchVendors();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
    }
  };

  // === إعادة تعيين النموذج ===
  const resetForm = () => {
    setForm({ name: '', email: '', password: '', description: '', logo: null });
    setIsEditing(false);
    setEditingId(null);
  };

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
            إدارة التجار
          </h1>
          <p className="text-red-300 mt-2">إنشاء · تعديل · حذف</p>
        </motion.div>

        {/* === رسائل الخطأ / النجاح === */}
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
          {success && (
            <motion.div
              className="bg-green-600/20 border border-green-600 text-green-300 p-4 rounded-xl text-center mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === نموذج إنشاء/تعديل === */}
        <motion.div
          className="bg-[#242526]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl font-bold text-red-400 mb-6 text-center">
            {isEditing ? 'تعديل تاجر' : 'إنشاء تاجر جديد'}
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="الاسم الكامل"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              disabled={loading}
            />
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              disabled={loading}
            />
            <input
              type="password"
              placeholder={isEditing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              disabled={loading}
            />
            <textarea
              placeholder="وصف التاجر"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right placeholder-gray-400 h-24 resize-none focus:outline-none focus:border-red-500"
              disabled={loading}
            />
            <input
              type="file"
              accept="image/*"
              onChange={e => setForm({ ...form, logo: e.target.files[0] })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-right file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
              disabled={loading}
            />
            <div className="flex gap-3">
              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-bold shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50"
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
                  className="flex-1 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl font-bold shadow-md hover:from-gray-700 hover:to-gray-800"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  إلغاء
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* === قائمة التجار === */}
        <h2 className="text-2xl font-bold text-center mb-8 text-red-400">قائمة التجار</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.length === 0 ? (
            <motion.p
              className="col-span-full text-center text-gray-400 py-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              لا يوجد تجار حاليًا
            </motion.p>
          ) : (
            vendors.map((vendor, i) => (
              <motion.div
                key={vendor._id}
                className="bg-[#242526]/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex justify-center mb-4">
                  {vendor.logo ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${vendor.logo}`}
                      alt={`لوجو ${vendor.name}`}
                      className="w-24 h-24 object-contain rounded-xl border border-gray-600"
                      onError={e => { e.target.onerror = null; e.target.src = '/default-logo.png'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-700 rounded-xl flex items-center justify-center">
                      <span className="text-gray-400 text-xs">لا يوجد لوجو</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white text-right">{vendor.name}</h3>
                <p className="text-sm text-gray-300 text-right mt-1">البريد: {vendor.email}</p>
                <p className="text-sm text-gray-300 text-right mt-2 line-clamp-2">
                  الوصف: {vendor.description || 'لا يوجد وصف'}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-sm font-medium"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(vendor._id)}
                    className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-xl text-sm font-medium"
                  >
                    حذف
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
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
              className="bg-[#242526] p-8 rounded-2xl shadow-2xl"
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 180 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CreateVendor;
