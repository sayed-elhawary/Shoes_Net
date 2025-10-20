import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

function CreateVendor() {
  const [form, setForm] = useState({ name: '', email: '', password: '', description: '', logo: null });
  const [vendors, setVendors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('يرجى تسجيل الدخول كأدمن أولاً!');
      return;
    }

    axios.get(`${process.env.REACT_APP_API_URL}/api/vendors`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        console.log('Vendors data:', res.data); // للتحقق من بيانات التجار ومسار logo
        setVendors(res.data);
      })
      .catch(err => alert('خطأ في جلب التجار: ' + (err.response?.data?.message || err.message)));
  };

  const handleSubmit = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('يرجى تسجيل الدخول كأدمن أولاً!');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('password', form.password);
    formData.append('description', form.description);
    if (form.logo) formData.append('logo', form.logo); // إضافة الصورة إذا موجودة

    if (isEditing) {
      // تعديل تاجر موجود
      axios.put(`${process.env.REACT_APP_API_URL}/api/vendors/${editingId}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      })
        .then(() => {
          alert('تم تعديل التاجر بنجاح!');
          resetForm();
          fetchVendors();
        })
        .catch(err => alert('خطأ في التعديل: ' + (err.response?.data?.message || err.message)));
    } else {
      // إنشاء تاجر جديد
      axios.post(`${process.env.REACT_APP_API_URL}/api/vendors`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      })
        .then(() => {
          alert('تم إنشاء التاجر بنجاح!');
          resetForm();
          fetchVendors();
        })
        .catch(err => alert('خطأ في الإنشاء: ' + (err.response?.data?.message || err.message)));
    }
  };

  const handleEdit = (vendor) => {
    setForm({
      name: vendor.name,
      email: vendor.email,
      password: '', // لا نعرض كلمة المرور القديمة
      description: vendor.description || '',
      logo: null // لا نعرض الصورة القديمة، بس يقدر يرفع جديدة
    });
    setIsEditing(true);
    setEditingId(vendor._id);
  };

  const handleDelete = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التاجر؟')) return;

    const token = localStorage.getItem('token');
    axios.delete(`${process.env.REACT_APP_API_URL}/api/vendors/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        alert('تم حذف التاجر بنجاح!');
        fetchVendors();
      })
      .catch(err => alert('خطأ في الحذف: ' + (err.response?.data?.message || err.message)));
  };

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', description: '', logo: null });
    setIsEditing(false);
    setEditingId(null);
  };

  const inputVariants = {
    hover: { scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' },
    focus: { scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
    hover: { scale: 1.03, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)' },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)' },
    tap: { scale: 0.98 },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-2xl font-bold text-center mb-6">{isEditing ? '✍️ تعديل تاجر' : '👤 إنشاء تاجر جديد'}</h1>
      <motion.div className="bg-[#1F1F2E] p-8 rounded-2xl shadow-2xl w-full max-w-md mb-8" initial={{ scale: 0.98 }} animate={{ scale: 1 }}>
        <div className="space-y-4">
          <motion.input
            type="text"
            placeholder="الاسم الكامل"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full p-3 border border-gray-500/50 rounded-xl focus:outline-none bg-[#2A2A3E] text-white placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.input
            type="email"
            placeholder="البريد الإلكتروني"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full p-3 border border-gray-500/50 rounded-xl focus:outline-none bg-[#2A2A3E] text-white placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.input
            type="password"
            placeholder={isEditing ? 'كلمة المرور (اترك فارغًا إذا لا تغيير)' : 'كلمة المرور'}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full p-3 border border-gray-500/50 rounded-xl focus:outline-none bg-[#2A2A3E] text-white placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.textarea
            placeholder="وصف التاجر"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full p-3 border border-gray-500/50 rounded-xl focus:outline-none bg-[#2A2A3E] text-white placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.input
            type="file"
            accept="image/*"
            onChange={e => setForm({ ...form, logo: e.target.files[0] })}
            className="w-full p-3 border border-gray-500/50 rounded-xl focus:outline-none bg-[#2A2A3E] text-white placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.button 
            onClick={handleSubmit} 
            className="w-full bg-green-600/80 text-white py-3 rounded-xl hover:bg-green-600 transition duration-200 font-semibold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isEditing ? '💾 حفظ التعديلات' : '👨‍💼 إنشاء التاجر'}
          </motion.button>
          {isEditing && (
            <motion.button 
              onClick={resetForm} 
              className="w-full bg-red-600/80 text-white py-3 rounded-xl hover:bg-red-600 transition duration-200 font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ❌ إلغاء التعديل
            </motion.button>
          )}
        </div>
      </motion.div>

      <h2 className="text-xl font-semibold mb-4 text-center">قائمة التجار</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {vendors.length === 0 ? (
          <p className="text-gray-400 text-xl col-span-full text-center">لا توجد تجار متاحين حاليًا.</p>
        ) : (
          vendors.map(vendor => (
            <motion.div
              key={vendor._id}
              className="bg-[#1F1F2E] rounded-2xl shadow-2xl p-6 border border-gray-700"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              {vendor.logo ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL}/${vendor.logo}`} 
                  alt={`لوجو ${vendor.name}`} 
                  className="w-24 h-24 object-contain rounded-lg mb-4 mx-auto border border-gray-500" 
                  onError={(e) => {
                    console.error(`فشل تحميل صورة لـ ${vendor.name}: ${e.target.src}`);
                    e.target.src = '/default-logo.png'; // صورة افتراضية
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-gray-600 rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <span className="text-gray-400 text-sm">لا يوجد لوجو</span>
                </div>
              )}
              <h3 className="text-lg font-semibold mb-2 text-right">{vendor.name}</h3>
              <p className="text-gray-300 mb-2 text-right">📧 البريد: {vendor.email}</p>
              <p className="text-gray-300 mb-4 text-right">📝 الوصف: {vendor.description || 'لا يوجد وصف'}</p>
              <div className="flex space-x-2 space-x-reverse">
                <motion.button
                  onClick={() => handleEdit(vendor)}
                  className="flex-1 p-3 rounded-xl text-white font-semibold bg-blue-700/90 hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span>✍️</span> تعديل
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(vendor._id)}
                  className="flex-1 p-3 rounded-xl text-white font-semibold bg-red-600/80 hover:bg-red-600 transition duration-200 flex items-center justify-center gap-2"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span>🗑️</span> حذف
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

export default CreateVendor;
