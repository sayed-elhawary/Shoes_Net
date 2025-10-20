# استخدام صورة Node.js الرسمية
FROM node:18-alpine

# تحديد مجلد العمل
WORKDIR /app

# نسخ ملفات package.json و package-lock.json
COPY package*.json ./

# تثبيت التبعيات
RUN npm install

# نسخ باقي ملفات المشروع
COPY . .

# تعيين الأمر لتشغيل التطبيق
CMD ["node", "server.js"]

# تعريض المنفذ
EXPOSE 5000
