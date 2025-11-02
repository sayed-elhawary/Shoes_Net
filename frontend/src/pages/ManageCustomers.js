// frontend/src/pages/ManageCustomers.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const ManageCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [form, setForm] = useState({});
  const [blockReason, setBlockReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
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
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditing(customer._id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      newPhone: customer.phone,
      password: '',
    });
  };

  const handleUpdate = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/auth/update-customer`,
        { ...form, phone: customers.find(c => c._id === id).phone },
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
    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
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
    try {
      const token = localStorage.getItem('token');
      const customer = customers.find(c => c._id === id);
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

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-8">إدارة العملاء</h1>

        {error && (
          <motion.div
            className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="text-center text-white">جارٍ تحميل العملاء...</div>
        ) : customers.length === 0 ? (
          <div className="text-center text-gray-400">لا يوجد عملاء حاليًا</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <motion.div
                key={customer._id}
                className={`bg-[#1F1F2E] p-6 rounded-2xl shadow-xl ${
                  customer.isBlocked ? 'border-2 border-red-500' : ''
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {editing === customer._id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                      placeholder="الاسم"
                    />
                    <input
                      type="text"
                      value={form.newPhone}
                      onChange={(e) => setForm({ ...form, newPhone: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                      placeholder="رقم الهاتف الجديد"
                    />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full p-2 bg-[#2A2A3E] text-white rounded-lg text-sm"
                      placeholder="كلمة مرور جديدة (اختياري)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(customer._id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{customer.name}</h3>
                        <p className="text-sm text-gray-400">{customer.phone}</p>
                        {customer.isBlocked && (
                          <p className="text-xs text-red-400 mt-1">
                            سبب الحظر: {customer.blockReason || 'غير محدد'}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          customer.isBlocked ? 'bg-red-600' : 'bg-green-600'
                        } text-white`}
                      >
                        {customer.isBlocked ? 'محظور' : 'نشط'}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm"
                      >
                        تعديل
                      </button>

                      {customer.isBlocked ? (
                        <button
                          onClick={() => handleUnblock(customer._id)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm"
                        >
                          إلغاء الحظر
                        </button>
                      ) : (
                        <button
                          onClick={() => setBlocking(customer._id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm"
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

        {/* نافذة كتابة سبب الحظر */}
        <AnimatePresence>
          {blocking && (
            <motion.div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#1F1F2E] p-6 rounded-2xl max-w-md w-full"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">سبب الحظر</h3>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-3 bg-[#2A2A3E] text-white rounded-lg text-sm resize-none"
                  rows="3"
                  placeholder="اكتب سبب الحظر..."
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleBlock(blocking)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg"
                  >
                    تأكيد الحظر
                  </button>
                  <button
                    onClick={() => {
                      setBlocking(null);
                      setBlockReason('');
                    }}
                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ManageCustomers;
