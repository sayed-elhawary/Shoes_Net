// frontend/src/services/authService.js
import { Preferences } from '@capacitor/preferences';

// حفظ بيانات الدخول
export const saveAuthData = async (token, role, userId, emailOrPhone, password) => {
  await Preferences.set({ key: 'auth_token', value: token });
  await Preferences.set({ key: 'auth_role', value: role });
  await Preferences.set({ key: 'auth_userId', value: userId });
  await Preferences.set({ key: 'auth_emailOrPhone', value: emailOrPhone });
  await Preferences.set({ key: 'auth_password', value: password }); // تحذير: مؤقت فقط
  window.dispatchEvent(new Event('authChange'));
};

// جلب البيانات
export const getAuthData = async () => {
  const token = await Preferences.get('auth_token');
  const role = await Preferences.get('auth_role');
  const userId = await Preferences.get('auth_userId');
  const emailOrPhone = await Preferences.get('auth_emailOrPhone');
  const password = await Preferences.get('auth_password');

  return {
    token: token.value,
    role: role.value,
    userId: userId.value,
    emailOrPhone: emailOrPhone.value,
    password: password.value,
  };
};

// تسجيل الخروج
export const clearAuthData = async () => {
  await Preferences.remove({ key: 'auth_token' });
  await Preferences.remove({ key: 'auth_role' });
  await Preferences.remove({ key: 'auth_userId' });
  await Preferences.remove({ key: 'auth_emailOrPhone' });
  await Preferences.remove({ key: 'auth_password' });
  localStorage.clear();
  window.dispatchEvent(new Event('authChange'));
};

// فحص الدخول
export const isLoggedIn = async () => {
  const { token } = await getAuthData();
  return !!token;
};
