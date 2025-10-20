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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
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
      })
      .catch(err => console.error('خطأ في جلب المنتجات:', err));
  }, []);

  const handleAddOrUpdateProduct = () => {
    if (!form.name || !form.type || !form.price || !form.quantityPerCarton || !form.manufacturer) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    if (!isEditing) {
      formData.append('vendor', localStorage.getItem('userId'));
    }
    images.forEach(image => formData.append('images', image));
    videos.forEach(video => formData.append('videos', video));

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
          setProducts(products.map(p => p._id === editingProductId ? res.data : p));
          alert('تم تعديل المنتج بنجاح');
        } else {
          setProducts([...products, res.data]);
          alert('تم إضافة المنتج بنجاح');
        }
        resetForm();
      })
      .catch(err => alert(`خطأ في ${isEditing ? 'تعديل' : 'إضافة'} المنتج: ` + err.message));
  };

  const resetForm = () => {
    setForm({ name: '', type: '', price: '', quantityPerCarton: '', manufacturer: '', description: '' });
    setImages([]);
    setVideos([]);
    setIsEditing(false);
    setEditingProductId(null);
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
  };

  const handleImageChange = (e) => setImages([...e.target.files]);
  const handleVideoChange = (e) => setVideos([...e.target.files]);
  const handleDelete = (id) => {
    if (window.confirm('هل تريد حذف هذا المنتج؟')) {
      const token = localStorage.getItem('token');
      axios.delete(`${process.env.REACT_APP_API_URL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => {
          setProducts(products.filter(p => p._id !== id));
          alert('تم حذف المنتج بنجاح');
        })
        .catch(err => alert('خطأ في حذف المنتج: ' + err.message));
    }
  };

  const openMedia = (media, type) => {
    setSelectedMedia({ url: `${process.env.REACT_APP_API_URL}/${media}`, type });
  };

  const closeMedia = () => setSelectedMedia(null);

  const formVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
  };

  const inputVariants = {
    hover: {
      scale: 1.02,
      borderColor: 'rgba(59, 130, 246, 0.5)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    focus: {
      scale: 1.02,
      borderColor: 'rgba(59, 130, 246, 0.5)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
    hover: {
      scale: 1.03,
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const deleteButtonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'rgba(220, 38, 38, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  const editButtonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">🏪 لوحة تحكم التاجر</h1>
      <motion.div
        className="bg-[#1F1F2E] p-6 rounded-2xl shadow-2xl mb-8 border border-gray-700 w-full max-w-4xl"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['name', 'type', 'price', 'quantityPerCarton', 'manufacturer', 'description'].map(field => (
            <motion.input
              key={field}
              type={field === 'price' || field === 'quantityPerCarton' ? 'number' : 'text'}
              placeholder={
                field === 'name' ? 'اسم المنتج' :
                field === 'type' ? 'النوع' :
                field === 'price' ? 'السعر' :
                field === 'quantityPerCarton' ? 'الكرتونة (جوز)' :
                field === 'manufacturer' ? 'المصنع' :
                'الوصف'
              }
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
              className="w-full p-3 border border-gray-200/30 rounded-xl focus:outline-none transition-all duration-300 bg-[#2A2A3E] text-white text-sm shadow-sm text-right placeholder-gray-400"
              variants={inputVariants}
              whileHover="hover"
              whileFocus="focus"
            />
          ))}
          <motion.input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-3 border border-gray-200/30 rounded-xl focus:outline-none transition-all duration-300 bg-[#2A2A3E] text-white text-sm shadow-sm text-right placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
          <motion.input
            type="file"
            multiple
            accept="video/*"
            onChange={handleVideoChange}
            className="w-full p-3 border border-gray-200/30 rounded-xl focus:outline-none transition-all duration-300 bg-[#2A2A3E] text-white text-sm shadow-sm text-right placeholder-gray-400"
            variants={inputVariants}
            whileHover="hover"
            whileFocus="focus"
          />
        </div>
        <motion.button
          onClick={handleAddOrUpdateProduct}
          className="mt-4 w-full p-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          {isEditing ? '✏️ تعديل منتج' : '➕ إضافة منتج'}
        </motion.button>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {products.map(product => (
          <motion.div
            key={product._id}
            className="bg-[#1F1F2E] rounded-2xl shadow-2xl p-4 border border-gray-700"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
          >
            <h2 className="text-xl font-semibold mb-2 text-right">{product.name}</h2>
            {product.images?.length > 0 ? (
              <img
                src={`${process.env.REACT_APP_API_URL}/${product.images[0]}`}
                className="w-full h-48 object-cover rounded-xl mb-2"
                alt={product.name}
                onError={(e) => {
                  console.error('خطأ في تحميل الصورة الرئيسية:', e);
                  e.target.src = `${process.env.REACT_APP_API_URL}/placeholder-image.jpg`;
                }}
              />
            ) : (
              <img
                src={`${process.env.REACT_APP_API_URL}/placeholder-image.jpg`}
                className="w-full h-48 object-cover rounded-xl mb-2"
                alt="صورة بديلة"
                onError={(e) => console.error('خطأ في تحميل الصورة البديلة:', e)}
              />
            )}
            <p className="text-gray-300 text-right">📋 الحالة: {product.approved ? '✅ موافق' : '⏳ انتظار'}</p>
            <p className="text-gray-300 text-right">💰 السعر: {product.price}</p>
            <p className="text-gray-300 text-right">📦 الكمية لكل كرتونة: {product.quantityPerCarton}</p>
            <p className="text-gray-300 text-right">💼 سعر الكرتونة: {product.price * product.quantityPerCarton}</p>
            <p className="text-gray-300 text-right">🏭 المصنع: {product.manufacturer}</p>
            <p className="text-gray-300 text-right">📝 الوصف: {product.description}</p>
            <div className="flex flex-wrap mt-2 space-x-2 space-x-reverse justify-end">
              {product.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={`${process.env.REACT_APP_API_URL}/${img}`}
                  className="w-16 h-16 object-cover rounded-xl cursor-pointer"
                  alt={`صورة ${idx + 1}`}
                  onClick={() => openMedia(img, 'image')}
                  onError={(e) => {
                    console.error('خطأ في تحميل الصورة:', e);
                    e.target.src = `${process.env.REACT_APP_API_URL}/placeholder-image.jpg`;
                  }}
                />
              ))}
              {product.videos?.map((vid, idx) => (
                <video
                  key={idx}
                  src={`${process.env.REACT_APP_API_URL}/${vid}`}
                  className="w-16 h-16 object-cover rounded-xl cursor-pointer"
                  onClick={() => openMedia(vid, 'video')}
                  onError={(e) => console.error('خطأ في تحميل الفيديو:', e)}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <motion.button
                onClick={() => handleEdit(product)}
                className="w-1/2 mr-2 p-2 rounded-xl text-white font-semibold"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}
                variants={editButtonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                ✏️ تعديل
              </motion.button>
              <motion.button
                onClick={() => handleDelete(product._id)}
                className="w-1/2 p-2 rounded-xl text-white font-semibold"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.5)' }}
                variants={deleteButtonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                🗑️ حذف
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal لفتح الصورة/الفيديو */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={closeMedia}
          >
            <motion.div className="relative" onClick={(e) => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  className="max-w-full max-h-screen rounded-xl"
                  alt="صورة كاملة"
                  onError={(e) => {
                    console.error('خطأ في تحميل الصورة في المودال:', e);
                    e.target.src = `${process.env.REACT_APP_API_URL}/placeholder-image.jpg`;
                  }}
                />
              ) : (
                <video src={selectedMedia.url} className="max-w-full max-h-screen rounded-xl" controls autoPlay />
              )}
              <button className="absolute top-2 right-2 text-white text-2xl" onClick={closeMedia}>×</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VendorDashboard;
