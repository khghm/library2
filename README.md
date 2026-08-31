# کتابخانهٔ مانا

کتابخانه و کتابخوان حرفه‌ای فارسی برای خوانندگان، پژوهشگران، منتقدان و نویسندگان.

## ویژگی‌ها

- 📚 کتابخانهٔ دیجیتال با پشتیبانی از شعر کلاسیک و نثر معاصر
- 📖 کتابخوان حرفه‌ای با قابلیت برجسته‌سازی و یادداشت‌گذاری
- 🔖 نشانک‌گذاری خودکار و دستی
- 📝 سیستم نقد و بررسی
- ✍️ درگاه نویسندگان برای انتشار کتاب
- 📄 پشتیبانی از PDF، TXT، Markdown، HTML و DOCX
- 🔐 احراز هویت کاربران با Supabase
- ☁️ ذخیره‌سازی ابری داده‌ها
- 🌙 تم‌های خواندن (شب، کاغذ، کهنه)
- 🔍 جستجو و فیلتر پیشرفته

## شروع کار

### پیش‌نیازها

- Node.js ۱۸ یا بالاتر
- npm یا yarn

### نصب و اجرا

```bash
# نصب وابستگی‌ها
npm install

# اجرا در حالت توسعه
npm run dev

# ساخت برای تولید
npm run build
```

### پیکربندی Supabase

۱. پروژه جدیدی در [Supabase](https://supabase.com) بسازید
۲. فایل `.env` را با اطلاعات پروژه خود تکمیل کنید:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

۳. اسکریپت `supabase-schema.sql` را در SQL Editor اجرا کنید.

## ساختار پروژه

```
src/
├── components/          # کامپوننت‌های UI
│   ├── AuthModal.tsx    # مودال ورود/عضویت
│   ├── BookCard.tsx     # کارت کتاب
│   ├── BookEditor.tsx   # ویرایشگر کتاب
│   ├── BookModal.tsx    # مودال جزئیات کتاب
│   ├── Header.tsx       # هدر اصلی
│   ├── LibraryView.tsx  # نمای کتابخانه
│   ├── Reader.tsx       # کتابخوان
│   └── ...
├── lib/
│   ├── api.ts           # لایهٔ دسترسی به داده
│   ├── app-context.tsx  # Context اصلی اپلیکیشن
│   ├── auth.tsx         # Context احراز هویت
│   ├── core.ts          # تایپ‌ها و ابزارهای مشترک
│   ├── database.types.ts # تایپ‌های دیتابیس
│   ├── parsers.ts       # پارسرهای فایل
│   └── supabase.ts      # کلاینت Supabase
├── data/
│   └── library.ts       # داده‌های نمونه
├── App.tsx              # ریشه اپلیکیشن
└── MainApp.tsx          # کامپوننت اصلی
```

## فناوری‌ها

- **React 18** — کتابخانهٔ UI
- **TypeScript** — تایپ‌ایمنی
- **Vite** — ابزار ساخت
- **Tailwind CSS 4** — استایل‌دهی
- **Supabase** — بک‌اند و احراز هویت
- **pdf.js** — پردازش PDF
- **Tesseract.js** — OCR فارسی/عربی

## مجوز

MIT
