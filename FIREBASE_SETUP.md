# เปิดใช้ตัวนับผู้เข้าชม (Firebase)

ตัวนับใช้ **Cloud Firestore** ของ Firebase เก็บจำนวนการเข้าชม ใช้แพ็กเกจฟรี (Spark) ได้ ไม่ต้องผูกบัตรเครดิต
ทำครั้งเดียวประมาณ 10 นาที

## 1. สร้างโปรเจกต์ Firebase

1. เข้า <https://console.firebase.google.com> แล้วล็อกอินด้วยบัญชี Google
2. กด **Create a project / เพิ่มโปรเจกต์** ตั้งชื่อ เช่น `laode-stats`
3. ปิด Google Analytics ได้ (ไม่ต้องใช้) แล้วกด Create

## 2. สร้างฐานข้อมูล Firestore

1. เมนูซ้าย **Build → Firestore Database → Create database**
2. เลือก location ใกล้ไทย เช่น `asia-southeast1 (Singapore)`
3. เลือก **Start in production mode** แล้วกด Create

## 3. ใส่ Security rules

1. ในหน้า Firestore เปิดแท็บ **Rules**
2. ลบข้อความเดิมทั้งหมด แล้ว **คัดลอกเนื้อหาจากไฟล์ `firestore.rules`** ในโปรเจกต์นี้ไปวาง
3. กด **Publish**

Rules นี้อนุญาตให้ทุกคนอ่านตัวเลข และ "บวก 1" ได้เท่านั้น ลบหรือแก้ตัวเลขไม่ได้

## 4. สร้าง Web app และคัดลอกค่า config

1. กดไอคอนฟันเฟือง **Project settings → General**
2. ที่หัวข้อ **Your apps** กดไอคอน `</>` (Web) ตั้งชื่อ เช่น `course-site` (ไม่ต้องติ๊ก Firebase Hosting)
3. Firebase จะแสดงโค้ดที่มี `const firebaseConfig = { apiKey: ..., ... }` — คัดลอกเฉพาะส่วนในวงเล็บปีกกา

## 5. ใส่ค่าในเว็บ

เปิดไฟล์ `js/firebase-config.js` แล้วเปลี่ยน

```js
export const firebaseConfig = null;
```

เป็น

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

ค่าเหล่านี้ **ไม่ใช่ความลับ** (Firebase ออกแบบให้ใส่ในหน้าเว็บได้) สิ่งที่ป้องกันข้อมูลคือ Security rules ในข้อ 3

## 6. (แนะนำ) จำกัดโดเมนของ API key

Google Cloud Console → APIs & Services → Credentials → เลือก API key ของโปรเจกต์ →
Application restrictions = **Websites** แล้วเพิ่ม `https://prasanch.github.io/*`
เพื่อไม่ให้เว็บอื่นนำ key ไปใช้

## 7. Push ขึ้น GitHub แล้วทดสอบ

เปิดเว็บบน GitHub Pages สักหน้า แล้วเปิด `stats.html` ควรเห็นยอด 1
(การเปิดไฟล์ในเครื่องแบบ `file://` จะไม่นับ)

---

### ข้อมูลที่เก็บ

- collection `views` มีเอกสารรูปแบบ `{สัปดาห์}__{หน้า}` เช่น `2026-W40__ch05` เก็บแค่ตัวเลข `total`
- **ไม่เก็บข้อมูลส่วนบุคคล** (ไม่มี IP, ชื่อ, คุกกี้ติดตาม) — ใช้ localStorage ในเครื่องผู้ชมเพียงเพื่อกันการนับซ้ำในวันเดียวกัน
- นับ 1 ครั้งต่อเครื่องต่อหน้าต่อวัน จึงใกล้เคียง "จำนวนคน" มากกว่าการนับทุกครั้งที่รีเฟรช

### ค่าใช้จ่าย

แพ็กเกจฟรีให้เขียน 20,000 ครั้ง/วัน และอ่าน 50,000 ครั้ง/วัน การเข้าชม 1 ครั้งใช้ 4 writes + 1–15 reads
พอสำหรับหลายพันการเข้าชมต่อวัน
