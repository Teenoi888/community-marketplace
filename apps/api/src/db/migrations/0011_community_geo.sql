ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "lat" double precision;
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "lng" double precision;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.7563, "lng" = 100.5018 WHERE "province" = 'กรุงเทพมหานคร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 8.0863, "lng" = 98.9063 WHERE "province" = 'กระบี่' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.0227, "lng" = 99.5328 WHERE "province" = 'กาญจนบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.4322, "lng" = 103.5060 WHERE "province" = 'กาฬสินธุ์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.4827, "lng" = 99.5226 WHERE "province" = 'กำแพงเพชร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.4322, "lng" = 102.8236 WHERE "province" = 'ขอนแก่น' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 12.6113, "lng" = 102.1039 WHERE "province" = 'จันทบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.6904, "lng" = 101.0779 WHERE "province" = 'ฉะเชิงเทรา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.3611, "lng" = 100.9847 WHERE "province" = 'ชลบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.1851, "lng" = 100.1251 WHERE "province" = 'ชัยนาท' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.8068, "lng" = 102.0317 WHERE "province" = 'ชัยภูมิ' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 10.4930, "lng" = 99.1800 WHERE "province" = 'ชุมพร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 19.9105, "lng" = 99.8406 WHERE "province" = 'เชียงราย' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.7883, "lng" = 98.9853 WHERE "province" = 'เชียงใหม่' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 7.5645, "lng" = 99.6240 WHERE "province" = 'ตรัง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 12.2428, "lng" = 102.5178 WHERE "province" = 'ตราด' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.8840, "lng" = 99.1258 WHERE "province" = 'ตาก' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.2069, "lng" = 101.2130 WHERE "province" = 'นครนายก' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.8199, "lng" = 100.0620 WHERE "province" = 'นครปฐม' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.4008, "lng" = 104.7825 WHERE "province" = 'นครพนม' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.9799, "lng" = 102.0977 WHERE "province" = 'นครราชสีมา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 8.4304, "lng" = 99.9633 WHERE "province" = 'นครศรีธรรมราช' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.7038, "lng" = 100.1372 WHERE "province" = 'นครสวรรค์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.8590, "lng" = 100.5215 WHERE "province" = 'นนทบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 6.4264, "lng" = 101.8230 WHERE "province" = 'นราธิวาส' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.7756, "lng" = 100.7730 WHERE "province" = 'น่าน' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.3609, "lng" = 103.6465 WHERE "province" = 'บึงกาฬ' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.9930, "lng" = 103.1029 WHERE "province" = 'บุรีรัมย์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.0208, "lng" = 100.5250 WHERE "province" = 'ปทุมธานี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 11.8126, "lng" = 99.7957 WHERE "province" = 'ประจวบคีรีขันธ์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.0508, "lng" = 101.3730 WHERE "province" = 'ปราจีนบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 6.8697, "lng" = 101.2500 WHERE "province" = 'ปัตตานี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.3532, "lng" = 100.5680 WHERE "province" = 'พระนครศรีอยุธยา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 19.1664, "lng" = 99.9020 WHERE "province" = 'พะเยา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 8.4510, "lng" = 98.5310 WHERE "province" = 'พังงา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 7.6167, "lng" = 100.0742 WHERE "province" = 'พัทลุง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.4429, "lng" = 100.3487 WHERE "province" = 'พิจิตร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.8211, "lng" = 100.2659 WHERE "province" = 'พิษณุโลก' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.1119, "lng" = 99.9420 WHERE "province" = 'เพชรบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.4193, "lng" = 101.1592 WHERE "province" = 'เพชรบูรณ์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.1445, "lng" = 100.1405 WHERE "province" = 'แพร่' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 7.8804, "lng" = 98.3923 WHERE "province" = 'ภูเก็ต' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.1852, "lng" = 103.3010 WHERE "province" = 'มหาสารคาม' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.5449, "lng" = 104.7241 WHERE "province" = 'มุกดาหาร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 19.3020, "lng" = 97.9654 WHERE "province" = 'แม่ฮ่องสอน' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.7920, "lng" = 104.1450 WHERE "province" = 'ยโสธร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 6.5410, "lng" = 101.2810 WHERE "province" = 'ยะลา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 16.0538, "lng" = 103.6520 WHERE "province" = 'ร้อยเอ็ด' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 9.9528, "lng" = 98.6084 WHERE "province" = 'ระนอง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 12.6813, "lng" = 101.2816 WHERE "province" = 'ระยอง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.5282, "lng" = 99.8134 WHERE "province" = 'ราชบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.7995, "lng" = 100.6534 WHERE "province" = 'ลพบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.2854, "lng" = 99.5122 WHERE "province" = 'ลำปาง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 18.5744, "lng" = 99.0087 WHERE "province" = 'ลำพูน' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.4860, "lng" = 101.7223 WHERE "province" = 'เลย' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.1186, "lng" = 104.3220 WHERE "province" = 'ศรีสะเกษ' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.1545, "lng" = 104.1450 WHERE "province" = 'สกลนคร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 7.1897, "lng" = 100.5951 WHERE "province" = 'สงขลา' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 6.6238, "lng" = 100.0673 WHERE "province" = 'สตูล' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.5991, "lng" = 100.5998 WHERE "province" = 'สมุทรปราการ' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.4098, "lng" = 99.9950 WHERE "province" = 'สมุทรสงคราม' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.5475, "lng" = 100.2740 WHERE "province" = 'สมุทรสาคร' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 13.8241, "lng" = 102.0645 WHERE "province" = 'สระแก้ว' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.5289, "lng" = 100.9110 WHERE "province" = 'สระบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.8907, "lng" = 100.3970 WHERE "province" = 'สิงห์บุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.0072, "lng" = 99.8232 WHERE "province" = 'สุโขทัย' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.4744, "lng" = 100.1177 WHERE "province" = 'สุพรรณบุรี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 9.1382, "lng" = 99.3215 WHERE "province" = 'สุราษฎร์ธานี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.8818, "lng" = 103.4936 WHERE "province" = 'สุรินทร์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.8783, "lng" = 102.7420 WHERE "province" = 'หนองคาย' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.2044, "lng" = 102.4260 WHERE "province" = 'หนองบัวลำภู' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 14.5896, "lng" = 100.4549 WHERE "province" = 'อ่างทอง' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.8656, "lng" = 104.6259 WHERE "province" = 'อำนาจเจริญ' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.4139, "lng" = 102.7859 WHERE "province" = 'อุดรธานี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 17.6200, "lng" = 100.0993 WHERE "province" = 'อุตรดิตถ์' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.3835, "lng" = 100.0248 WHERE "province" = 'อุทัยธานี' AND "lat" IS NULL;
--> statement-breakpoint
UPDATE "communities" SET "lat" = 15.2287, "lng" = 104.8567 WHERE "province" = 'อุบลราชธานี' AND "lat" IS NULL;
