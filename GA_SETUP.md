# เปิดใช้สถิติการเข้าชม (Google Analytics 4)

เว็บนี้เตรียมโค้ด Google Analytics 4 (GA4) พร้อมแบนเนอร์ขอความยินยอมตาม PDPA ไว้แล้ว
เหลือแค่ใส่ **Measurement ID** ใช้เวลาประมาณ 5 นาที

## 1. สร้าง property ใน Google Analytics

1. เข้า <https://analytics.google.com> ล็อกอินด้วยบัญชี Google
2. **Admin (ฟันเฟือง) → Create → Property** ตั้งชื่อ เช่น `Linear Algebra & ODE`
   เลือก Time zone = **Thailand**, Currency = THB
3. เลือกประเภท **Web** แล้วใส่ URL `https://prasanch.github.io/LinearAlgebra-ODE/`
4. จะได้ **Measurement ID** รูปแบบ `G-XXXXXXXXXX`

## 2. ใส่ ID ในเว็บ

เปิดไฟล์ `js/analytics.js` แก้บรรทัด

```js
var GA_ID = '';
```

เป็น

```js
var GA_ID = 'G-XXXXXXXXXX';
```

แล้ว push ขึ้น GitHub — เมื่อเปิดเว็บครั้งแรกจะเห็นแบนเนอร์ขอความยินยอมด้านล่าง

## 3. ตรวจว่าทำงาน

เปิดเว็บจริง กด "ยอมรับ" แล้วใน GA ไปที่ **Reports → Realtime** ควรเห็นผู้ใช้ 1 คนภายในไม่กี่วินาที
(สถิติในรายงานอื่นอาจใช้เวลา 24–48 ชั่วโมงกว่าจะขึ้น)

---

## ดูสถิติรายสัปดาห์

**Reports → Life cycle → Engagement → Overview** (หรือ Reports snapshot)

- มุมขวาบนเลือกช่วงวันที่ เช่น **Last 7 days** หรือกำหนดเองเป็นสัปดาห์การสอน
- ติ๊ก **Compare** เพื่อเทียบกับสัปดาห์ก่อน
- กราฟ Users / Views over time กดเปลี่ยนเป็นรายสัปดาห์ได้ (Day → Week)

## ดูสถิติแยกตามบท (สัปดาห์การสอน)

**Reports → Life cycle → Engagement → Pages and screens**

- เปลี่ยนคอลัมน์แรกเป็น **Page title and screen class** — ชื่อหน้าขึ้นต้นด้วยหมายเลขบท เช่น
  `5 · Eigenvalues & Eigenvectors — Linear Algebra & ODE` จึงเรียงดูง่าย
- คอลัมน์ **Views** = จำนวนครั้งที่เปิด, **Users** = จำนวนคน, **Average engagement time** = เวลาอ่านเฉลี่ย
- ใช้ช่วงวันที่ร่วมกับตารางนี้เพื่อดูว่าสัปดาห์ไหนนักศึกษาเปิดบทไหน (เช่นก่อนสอบ)

> ถ้าอยากได้ตารางบท × สัปดาห์ในหน้าเดียว ใช้ **Explore → Free form**:
> Rows = *Page title*, Columns = *Week*, Values = *Views*

## หมายเหตุเรื่อง PDPA

- ใช้ **Consent Mode v2**: ค่าเริ่มต้นคือ "ไม่ยินยอม" — Google ได้รับแค่สัญญาณแบบไม่ใช้คุกกี้และไม่ระบุตัวตน
  จนกว่าผู้ชมจะกด "ยอมรับ"
- ฟีเจอร์โฆษณาปิดไว้เสมอ (`ad_storage`, `ad_user_data`, `ad_personalization` = denied)
- ผู้ชมเปลี่ยนใจได้ผ่านปุ่ม **ตั้งค่าคุกกี้** (ท้ายเมนูด้านข้างของแต่ละบท และท้ายหน้าหลัก)
- ตัวเลขใน GA อาจน้อยกว่าความจริงเล็กน้อย เพราะผู้ที่กด "ไม่ยอมรับ" จะไม่ถูกนับเป็นผู้ใช้แยกคน
