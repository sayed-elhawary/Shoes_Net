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

# بناء التطبيق للإنتاج
RUN npm run build

# تثبيت خادم لخدمة الملفات الثابتة
RUN npm install -g serve

# تعيين الأمر لتشغيل التطبيق
CMD ["serve", "-s", "build", "-l", "3000"]

# تعريض المنفذ
EXPOSE 3000
