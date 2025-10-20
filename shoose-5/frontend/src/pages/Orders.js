import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${process.env.REACT_APP_API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => setOrders(res.data))
        .catch(err => console.error(err));
    }
  }, []);

  const handleDeleteOrder = (id) => {
    if (window.confirm('هل تريد حذف هذا الطلب؟')) {
      const token = localStorage.getItem('token');
      axios.delete(`${process.env.REACT_APP_API_URL}/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => setOrders(orders.filter(o => o._id !== id)))
        .catch(err => alert('خطأ: ' + err.message));
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.1,
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    tap: {
      scale: 0.9,
      transition: { duration: 0.1, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-900 to-gray-800 p-4 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ willChange: 'opacity' }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">📋 قائمة الطلبات</h1>
      <AnimatePresence>
        {orders.length === 0 ? (
          <motion.p
            className="text-center text-gray-400 text-xl py-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            لا توجد طلبات حالياً.
          </motion.p>
        ) : (
          <motion.div
            className="w-full max-w-6xl overflow-x-auto shadow-2xl rounded-2xl border border-gray-700"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
          >
            <table className="min-w-full bg-[#1F1F2E] border border-gray-700">
              <thead className="bg-blue-600/50 text-white">
                <tr>
                  <th className="py-3 px-4 text-right font-semibold">👤 اسم العميل</th>
                  <th className="py-3 px-4 text-right font-semibold">📞 رقم الهاتف</th>
                  <th className="py-3 px-4 text-right font-semibold">📍 العنوان</th>
                  <th className="py-3 px-4 text-right font-semibold">📦 المنتج</th>
                  <th className="py-3 px-4 text-right font-semibold">⚙️ إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <motion.tr
                    key={order._id}
                    className="hover:bg-gray-700/30 transition duration-200 border-b border-gray-700"
                    variants={rowVariants}
                  >
                    <td className="py-3 px-4 font-medium text-right">{order.customerName}</td>
                    <td className="py-3 px-4 text-right">{order.phone}</td>
                    <td className="py-3 px-4 text-right">{order.address}</td>
                    <td className="py-3 px-4 text-right">{order.productId?.name || 'غير معروف'}</td>
                    <td className="py-3 px-4 flex space-x-2 space-x-reverse justify-end">
                      <motion.button
                        className="text-blue-400 hover:text-blue-300 p-1"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        ✏️
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteOrder(order._id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        🗑️
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Orders;
