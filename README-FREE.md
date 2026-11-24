# النشر المجاني بالكامل — GitHub Pages + GitHub API

النسخة دي **مجانية 100%**: استضافة GitHub Pages + تخزين البيانات والصور داخل مستودع GitHub.  
مفيش Render، مفيش بطاقة ائتمان، مفيش خطة مدفوعة.

> المطلوب: حساب GitHub مجاني فقط (ولو جديد اعمله من github.com/signup).

---

## 1) اعمل مستودع جديد

1. افتح https://github.com/new
2. الاسم: مثلاً `phone-store`
3. اختر **Public**
4. **ما تضفش** README أو .gitignore (سيبه فاضي)
5. اضغط **Create repository**

---

## 2) ارفع ملفات المشروع

ادخل مجلد المشروع:

```
C:\Users\LENOVO\Documents\Default Project\phone-store-free
```

افتح PowerShell واكتب (بدّل `USERNAME` و`REPO`):

```bash
git init
git add .
git commit -m "Free GitHub Pages store"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

> لو معندكش Git، حمّله من https://git-scm.com ثم أعد فتح PowerShell.

---

## 3) عدّل ملف `config.js`

افتح الملف وبدّل السطرين دول ببياناتك:

```js
window.STORE_CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME',   // ← اسم المستخدم
  repo: 'phone-store',             // ← اسم المستودع
  branch: 'main',
  dataPath: 'data/db.json',
  imagesPath: 'images'
};
```

ثم اعمل commit و push مرة تانية:

```bash
git add config.js
git commit -m "Set GitHub config"
git push
```

---

## 4) فعّل GitHub Pages

1. في المستودع: **Settings**
2. من القائمة الجانبية: **Pages**
3. تحت **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
4. اضغط **Save**

بعد دقائق الموقع هيبقى على:

```
https://USERNAME.github.io/REPO/
```

مثال: `https://ahmedadel.github.io/phone-store/`

---

## 5) اعمل توكن مجاني للوحة التحكم

لوحة التحكم بتكتب في المستودع عن طريق GitHub API، فمحتاجة **Fine-grained token**:

1. افتح https://github.com/settings/personal-access-tokens/new
2. **Token name:** `phone-store-admin`
3. **Resource owner:** اختر حسابك
4. **Repository access:** اختر **Only select repositories** واختار مستودع `phone-store`
5. **Permissions** → **Repository permissions**:
   - **Contents:** اختر **Read and write**
6. اضغط **Generate token** وانسخ التوكن (هيظهر مرة واحدة بس).

---

## 6) سجّل الدخول للوحة التحكم

افتح:

```
https://USERNAME.github.io/REPO/admin.html
```

أدخل:
- اسم المستخدم: `admin`
- كلمة المرور: `mobileshop2026`
- GitHub Token (مرة واحدة فقط — بيُحفظ في المتصفح بعد كده)

> لتغيير بيانات الدخول: عدّل `adminUser` و`adminPassHash` في `config.js`.  
> الـ `adminPassHash` هو SHA-256 لكلمة المرور. ولّده بـ:  
> `node -e "const c=require('crypto');console.log(c.createHash('sha256').update('كلمة_المرور_الجديدة').digest('hex'))"`

بعد كده تقدر:
- تضيف/تعدل المنتجات والأسعار
- ترفع الصور (زر **رفع صورة**)
- تعدّل الفروع والعروض والإعدادات
- تحفظ كل التغييرات على GitHub فوراً

---

## 7) مهم للأمان

- ملف `admin.html` متاح للجميع زي أي صفحة، لكن الدخول محتاج اسم مستخدم/كلمة مرور + التوكن (مرة واحدة).
- اسم المستخدم/كلمة المرور مش حماية حقيقية على موقع ثابت — التوكن هو اللي بيمنع أي حد من التعديل فعلياً.
- التوكن بيتم تخزينه في متصفحك بس (localStorage)، متكتبهوش في ملفات الموقع.
- **ما تشارك التوكن مع حد**، واعمل توكن خاص بالمستودع ده فقط.
- لو حذفت التوكن من GitHub، لوحة التحكم هتوقف لحد ما تعمل توكن جديد.

---

## 8) ملاحظات

- تحديث البيانات بيظهر في الموقع خلال ثوانٍ لدقائق حسب كاش GitHub.
- لو حصل تأخير، اعمل **Hard Refresh** للموقع (Ctrl+F5).
- الصور المرفوعة بتتحفظ جوه مجلد `images/` في المستودع.
- كل حفظ بيعمل Commit تلقائي برسالة `Update store data`.
- لمعاينة الموقع على جهازك قبل النشر: شغّل `python -m http.server 4000` من مجلد المشروع وافتح `http://localhost:4000` — الموقع هيقرأ `data/db.json` تلقائياً بدون تعديل `config.js`.

---

## الملفات

```
phone-store-free/
├── index.html      # الموقع
├── style.css
├── app.js
├── config.js       # اسم المستخدم والمستودع
├── admin.html      # لوحة التحكم
├── admin.css
├── admin.js
├── data/db.json    # البيانات
├── images/         # الصور المرفوعة
└── README-FREE.md
```

**الخلاصة:** حساب GitHub مجاني + توكن مجاني + Pages مجاني = موقع شغال مدى الحياة بدون دفع.
