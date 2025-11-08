// frontend/src/pages/VendorDashboard.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const VendorDashboard = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '', type: '', price: '', quantityPerCarton: '', manufacturer: '', description: ''
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // === جلب المنتجات ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      showToast('يرجى تسجيل الدخول', 'error');
      return;
    }
    setLoading(true);
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
        showToast('تم تحميل المنتجات بنجاح', 'success');
      })
      .catch(err => {
        console.error('خطأ في جلب المنتجات:', err);
        showToast('فشل جلب المنتجات', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  // === إضافة منتج ===
  const handleAddProduct = () => {
    if (!form.name || !form.type || !form.price || !form.quantityPerCarton || !form.manufacturer) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    if (videos.length > 0 && images.length === 0) {
      showToast('يجب رفع صورة واحدة على الأقل عند رفع فيديو', 'error');
      return;
    }
    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    images.forEach(img => formData.append('images', img));
    videos.forEach(vid => formData.append('videos', vid));
    const token = localStorage.getItem('token');
    setLoading(true);
    axios.post(`${process.env.REACT_APP_API_URL}/api/products`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    })
      .then(res => {
        setProducts(prev => [...prev, res.data]);
        showToast('تم إضافة المنتج بنجاح', 'success');
        resetForm();
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'خطأ في إضافة المنتج';
        showToast(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ name: '', type: '', price: '', quantityPerCarton: '', manufacturer: '', description: '' });
    setImages([]);
    setVideos([]);
  };

  const handleImageChange = (e) => {
    const files = [...e.target.files];
    const maxSize = 50 * 1024 * 1024;
    const validFiles = files.filter(f => {
      if (f.size > maxSize) {
        showToast(`الملف ${f.name} كبير جدًا! الحد الأقصى 50 ميجابايت.`, 'error');
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
        showToast(`الملف ${f.name} كبير جدًا! الحد الأقصى 50 ميجابايت.`, 'error');
        return false;
      }
      return true;
    });
    setVideos(validFiles);
  };

  const handleDelete = (id) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    axios.delete(`${process.env.REACT_APP_API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setProducts(prev => prev.filter(p => p._id !== id));
        showToast('تم حذف المنتج بنجاح', 'success');
      })
      .catch(err => showToast('خطأ في حذف المنتج: ' + err.message, 'error'))
      .finally(() => setLoading(false));
  };

  // === تحديث المنتج بدون رفع ملفات (استخدام /update) ===
  const handleUpdateProduct = () => {
    if (!editingProduct.name || !editingProduct.type || !editingProduct.price || !editingProduct.quantityPerCarton || !editingProduct.manufacturer) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    const token = localStorage.getItem('token');
    setLoading(true);

    // استخدم /update بدل /:id
    axios.put(`${process.env.REACT_APP_API_URL}/api/products/${editingProduct._id}/update`, editingProduct, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setProducts(prev => prev.map(p => p._id === res.data._id ? res.data : p));
        showToast('تم تحديث المنتج وإعادة عرضه كجديد بنجاح', 'success');
        setEditingProduct(null);
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'فشل التحديث';
        showToast(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  const openMedia = (media, type) => setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/uploads/${media}`, type });
  const closeMedia = () => setSelectedMedia(null);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
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

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* === العنوان === */}
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            لوحة تحكم التاجر
          </h1>
          <p className="text-purple-300 mt-2 text-lg">إدارة منتجاتك بسهولة</p>
        </motion.div>

        {/* === Toast === */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              className={`fixed top-6 right-6 px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 z-50 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <span className="font-bold">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === نموذج الإضافة === */}
        <motion.div className="bg-[#242526]/80 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition"
              />
            ))}
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition"
            >
              <option value="" disabled>اختر النوع</option>
              <option value="رجالي">رجالي</option>
              <option value="حريمي">حريمي</option>
              <option value="أطفال">أطفال</option>
            </select>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 transition" />
            <input type="file" multiple accept="video/*" onChange={handleVideoChange} className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 transition" />
          </div>
          <div className="flex gap-3 mt-6">
            <motion.button onClick={handleAddProduct} disabled={loading} className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg disabled:opacity-70 transition" variants={buttonVariants} whileHover="hover" whileTap="tap">
              {loading ? <span className="flex items-center justify-center gap-2"><motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /> جارٍ الإضافة...</span> : 'إضافة منتج'}
            </motion.button>
            <motion.button onClick={resetForm} className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-lg transition" variants={buttonVariants} whileHover="hover" whileTap="tap">
              مسح النموذج
            </motion.button>
          </div>
        </motion.div>

        {/* === المنتجات === */}
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          </div>
        ) : products.length === 0 ? (
          <motion.p className="col-span-full text-center text-slate-400 text-xl py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            لا توجد منتجات بعد. ابدأ بإضافة منتج!
          </motion.p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {products.map((product, index) => (
                <motion.div
                  key={product._id}
                  className="bg-[#242526]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden"
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  whileHover="hover"
                  custom={index}
                  layout
                >
                  <div className="p-4">
                    {product.images?.[0] ? (
                      <img src={`${process.env.REACT_APP_API_URL}/uploads/${product.images[0]}`} alt={product.name} className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition" onClick={() => openMedia(product.images[0], 'image')} onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }} />
                    ) : (
                      <img src={`${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`} alt="بديل" className="w-full h-48 object-cover rounded-xl" />
                    )}
                  </div>
                  <div className="p-5 space-y-2 text-right border-t border-gray-700">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">{product.name}</h3>
                    <p className="text-sm text-gray-300">الحالة: <span className={product.approved ? 'text-green-400' : 'text-yellow-400'}>{product.approved ? 'موافق' : 'في الانتظار'}</span></p>
                    <p className="text-sm text-gray-300">سعر الكرتونة: {product.price} جنيه</p>
                    <p className="text-sm text-gray-300">سعر الجوز: {(product.price / product.quantityPerCarton).toFixed(2)} جنيه</p>
                    <p className="text-sm text-gray-300">الكمية: {product.quantityPerCarton} جوز</p>
                    <p className="text-sm text-gray-300">المصنع: {product.manufacturer}</p>
                    <p className="text-sm text-gray-300 line-clamp-2">الوصف: {product.description || 'لا يوجد'}</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-end">
                      {product.images?.map((img, i) => (
                        <img key={i} src={`${process.env.REACT_APP_API_URL}/uploads/${img}`} alt="" className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-500 transition" onClick={() => openMedia(img, 'image')} onError={e => { e.target.onerror = null; e.target.src = `${process.env.REACT_APP_API_URL}/uploads/placeholder-image.jpg`; }} />
                      ))}
                      {product.videos?.map((vid, i) => (
                        <video key={i} src={`${process.env.REACT_APP_API_URL}/uploads/${vid}`} className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:ring-2 hover:ring-purple-500 transition" onClick={() => openMedia(vid, 'video')} />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <motion.button
                        onClick={() => setEditingProduct(product)}
                        className="flex-1 py-2 rounded-xl text-white font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        تحديث
                      </motion.button>
                      <motion.button
                        onClick={() => handleDelete(product._id)}
                        className="flex-1 py-2 rounded-xl text-white font-medium bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg transition"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        حذف
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* === مودال الوسائط === */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeMedia}>
            <motion.div className="relative max-w-4xl max-h-screen" onClick={e => e.stopPropagation()} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              {selectedMedia.type === 'image' ? (
                <img src={selectedMedia.url} alt="" className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-screen rounded-2xl shadow-2xl" />
              )}
              <button onClick={closeMedia} className="absolute top-4 right-4 bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-purple-700 transition">×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === مودال التحديث === */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingProduct(null)}>
            <motion.div
              className="bg-[#242526]/95 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700/50 max-w-2xl w-full"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
            >
              <h2 className="text-2xl font-bold text-purple-400 mb-6 text-center">تحديث المنتج</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', placeholder: 'اسم المنتج' },
                  { key: 'price', placeholder: 'سعر الكرتونة', type: 'number' },
                  { key: 'quantityPerCarton', placeholder: 'الكرتونة (جوز)', type: 'number' },
                  { key: 'manufacturer', placeholder: 'المصنع' },
                  { key: 'description', placeholder: 'الوصف (اختياري)' },
                ].map(field => (
                  <input
                    key={field.key}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={editingProduct[field.key] || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, [field.key]: e.target.value })}
                    className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                ))}
                <select
                  value={editingProduct.type || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, type: e.target.value })}
                  className="w-full p-4 bg-[#3a3b3c]/60 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition"
                >
                  <option value="" disabled>اختر النوع</option>
                  <option value="رجالي">رجالي</option>
                  <option value="حريمي">حريمي</option>
                  <option value="أطفال">أطفال</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <motion.button
                  onClick={handleUpdateProduct}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg disabled:opacity-70 transition"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {loading ? 'جارٍ التحديث...' : 'تحديث المنتج'}
                </motion.button>
                <motion.button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-lg transition"
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
  );
};

export default VendorDashboard;
