# نور للاتصالات — النسخة المجانية بالكامل

موقع عربي (RTL) لمحلات الموبايلات والإكسسوارات، يعمل على GitHub Pages **بدون أي دفع أو بطاقة ائتمان**. البيانات والصور تُحفظ داخل مستودع GitHub نفسه، ولوحة التحكم تكتب عبر GitHub API.

> الدليل الكامل خطوة بخطوة: **[README-FREE.md](README-FREE.md)**

## تشغيل سريع للتجربة على جهازك

من هذا المجلد:

```
python -m http.server 4000
```

ثم افتح:

- الموقع: http://localhost:4000
- لوحة التحكم: http://localhost:4000/admin.html

الموقع يقرأ `data/db.json` تلقائياً في الوضع المحلي.

## نشر مجاني

1. اعمل مستودع Public جديد على GitHub.
2. ارفع كل ملفات هذا المجلد إليه.
3. عدّل `config.js` باسم المستخدم واسم المستودع.
4. فعّل **Settings → Pages → Deploy from a branch → main / (root)**.
5. اعمل Fine-grained token بصلاحية **Contents: Read and write** على هذا المستودع فقط.
6. افتح `admin.html` على رابط Pages وسجّل الدخول بالتوكن.

لا يوجد `server.js` في هذه النسخة — لا تحتاج Node.js على الاستضافة.

## الملفات

```
index.html, style.css, app.js       # الموقع
admin.html, admin.css, admin.js     # لوحة التحكم
config.js                           # إعدادات GitHub
data/db.json                        # البيانات
images/                             # الصور المرفوعة
README-FREE.md                      # شرح النشر الكامل
```
