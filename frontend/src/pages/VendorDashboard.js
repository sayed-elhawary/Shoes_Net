// frontend/src/pages/VendorDashboard.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const VendorDashboard = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: '',
    price: '',
    quantityPerCarton: '',
    manufacturer: '',
    description: ''
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState('');

  // جلب المنتجات
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      setError('يرجى تسجيل الدخول');
      return;
    }
    axios.get(`${process.env.REACT_APP_API_URL}/api/products/my-products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        setProducts(res.data.filter(p => {
          if (p.vendor) {
            return typeof p.vendor === 'object' ? p.vendor._id === userId : p.vendor === userId;
          }
          return false;
        }));
        setError('');
      })
      .catch(err => {
        console.error('خطأ في جلب المنتجات:', err);
        setError('فشل جلب المنتجات');
      });
  }, []);

  // إضافة أو تعديل منتج
  const handleAddOrUpdateProduct = () => {
    if (!form.name || !form.type || !form.price || !form.quantityPerCarton || !form.manufacturer) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (videos.length > 0 && images.length === 0) {
      setError('يجب رفع صورة واحدة على الأقل عند رفع فيديو');
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    if (!isEditing) formData.append('vendor', localStorage.getItem('userId'));
    images.forEach(img => formData.append('images', img));
    videos.forEach(vid => formData.append('videos', vid));

    const token = localStorage.getItem('token');
    const url = isEditing
      ? `${process.env.REACT_APP_API_URL}/api/products/${editingProductId}`
      : `${process.env.REACT_APP_API_URL}/api/products`;
    const method = isEditing ? 'put' : 'post';

    axios[method](url, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    })
      .then(res => {
        if (isEditing) {
          setProducts(prev => prev.map(p => p._id === editingProductId ? res.data : p));
          alert('تم تعديل المنتج بنجاح');
        } else {
          setProducts(prev => [...prev, res.data]);
          alert('تم إضافة المنتج بنجاح');
        }
        resetForm();
        setError('');
      })
      .catch(err => {
        const msg = err.response?.data?.message || `خطأ في ${isEditing ? 'تعديل' : 'إضافة'} المنتج`;
        setError(msg);
      });
  };

  const resetForm = () => {
    setForm({ name: '', type: '', price: '', quantityPerCarton: '', manufacturer: '', description: '' });
    setImages([]);
    setVideos([]);
    setIsEditing(false);
    setEditingProductId(null);
    setError('');
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      type: product.type,
      price: product.price,
      quantityPerCarton: product.quantityPerCarton,
      manufacturer: product.manufacturer,
      description: product.description
    });
    setImages([]);
    setVideos([]);
    setIsEditing(true);
    setEditingProductId(product._id);
    setError('');
  };

  const handleImageChange = (e) => {
    const files = [...e.target.files];
    const maxSize = 50 * 1024 * 1024;
    const validFiles = files.filter(f => {
      if (f.size > maxSize) {
        alert(`الملف ${f.name} كبير جدًا! الحد الأقصى 50 ميجابايت.`);
        return false;
      }
      return true;
    });
    setImages(validFiles);
  };

  const handleVideoChange = (e) => {
    const files = [...e.target.files];
    const maxSize = 50 * 1024 * 1024;
    const validFiles = files.filter(f => {
      if (f.size > maxSize) {
        alert(`الملف ${f.name} كبير جدًا! الحد الأقصى 50 ميجابايت.`);
        return false;
      }
      return true;
    });
    setVideos(validFiles);
  };

  const handleDelete = (id) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
    const token = localStorage.getItem('token');
    axios.delete(`${process.env.REACT_APP_API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setProducts(prev => prev.filter(p => p._id !== id));
        alert('تم حذف المنتج بنجاح');
      })
      .catch(err => setError('خطأ في حذف المنتج: ' + err.message));
  };

  const openMedia = (media, type) => setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type });
  const closeMedia = () => setSelectedMedia(null);

  // أنيميشن خفيفة
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    hover: { scale: 1.03, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)', transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-white p-4 relative overflow-hidden">
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-800 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto">

        {/* === العنوان === */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
            لوحة تحكم التاجر
          </h1>
          <p className="text-red-300 mt-2">إدارة منتجاتك بسهولة</p>
        </motion.div>

        {/* === رسالة الخطأ === */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-center text-red-400 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* === نموذج الإضافة/التعديل === */}
        <motion.div
          className="bg-[#242526]/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', placeholder: 'اسم المنتج', type: 'text' },
              { key: 'price', placeholder: 'سعر الكرتونة', type: 'number' },
              { key: 'quantityPerCarton', placeholder: 'الكرتونة (جوز)', type: 'number' },
              { key: 'manufacturer', placeholder: 'المصنع', type: 'text' },
              { key: 'description', placeholder: 'الوصف (اختياري)', type: 'text' },
            ].map(field => (
              <input
                key={field.key}
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
              />
            ))}
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
            >
              <option value="" disabled>اختر النوع</option>
              <option value="رجالي">رجالي</option>
              <option value="حريمي">حريمي</option>
              <option value="أطفال">أطفال</option>
            </select>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white hover:file:bg-red-700"
            />
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={handleVideoChange}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white hover:file:bg-red-700"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <motion.button
              onClick={handleAddOrUpdateProduct}
              className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isEditing ? 'تعديل المنتج' : 'إضافة منتج'}
            </motion.button>
            {isEditing && (
              <motion.button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-md"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                إلغاء التعديل
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* === المنتجات === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <motion.p
              className="col-span-full text-center text-slate-400 text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              لا توجد منتجات بعد. ابدأ بإضافة منتج!
            </motion.p>
          ) : (
            products.map((product, index) => (
              <motion.div
                key={product._id}
                className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                whileHover="hover"
                custom={index}
              >
                {/* الصورة الرئيسية */}
                <div className="p-4">
                  {product.images?.[0] ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[0]}`}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-xl"
                      onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }}
                    />
                  ) : (
                    <img
                      src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`}
                      alt="بديل"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                  )}
                </div>

                {/* المعلومات */}
                <div className="p-5 space-y-2 text-right border-t border-gray-700">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-300">الحالة: {product.approved ? 'موافق' : 'في الانتظار'}</p>
                  <p className="text-sm text-gray-300">سعر الكرتونة: {product.price} جنيه</p>
                  <p className="text-sm text-gray-300">سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                  <p className="text-sm text-gray-300">الكمية: {product.quantityPerCarton} جوز</p>
                  <p className="text-sm text-gray-300">المصنع: {product.manufacturer}</p>
                  <p className="text-sm text-gray-300 line-clamp-2">الوصف: {product.description || 'لا يوجد'}</p>

                  {/* معاينة الوسائط */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-end">
                    {product.images?.map((img, i) => (
                      <img
                        key={i}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${img}`}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-red-500 transition"
                        onClick={() => openMedia(img, 'image')}
                        onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }}
                      />
                    ))}
                    {product.videos?.map((vid, i) => (
                      <video
                        key={i}
                        src={`${process.env.REACT_APP_API_URL}/uploads/${vid}`}
                        className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-red-500 transition"
                        onClick={() => openMedia(vid, 'video')}
                      />
                    ))}
                  </div>

                  {/* الأزرار */}
                  <div className="flex gap-2 mt-4">
                    <motion.button
                      onClick={() => handleEdit(product)}
                      className="flex-1 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      تعديل
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(product._id)}
                      className="flex-1 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      حذف
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* === مودال الوسائط === */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMedia}
          >
            <motion.div
              className="relative max-w-4xl max-h-screen"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} alt="" className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              )}
              <button
                onClick={closeMedia}
                className="absolute top-4 right-4 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-red-700"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorDashboard;
