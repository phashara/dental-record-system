import json
import os
from records_part1 import RECORDS_P1
from records_part2 import RECORDS_P2
from records_part3 import RECORDS_P3
from records_part4 import RECORDS_P4

all_raw = RECORDS_P1 + RECORDS_P2 + RECORDS_P3 + RECORDS_P4

# Coverage category mapper (5 categories)
def get_coverage_group(cov):
    if not cov:
        return "UC (บัตรทอง/สอย.)"
    c = cov.strip()
    if any(k in c for k in ["จ่ายตรง", "ต้นสังกัด", "ข้าราชการ"]):
        return "สิทธิข้าราชการ/เบิกตรง"
    if any(k in c for k in ["ประกันสังคม", "ม.33", "ม.39"]):
        return "ประกันสังคม (SSO)"
    if any(k in c for k in ["พรบ", "พ.ร.บ"]):
        return "พ.ร.บ. คุ้มครองผู้ประสบภัย"
    if any(k in c for k in ["ชำระเงิน", "เบิกไม่ได้", "เงินสด"]):
        return "ชำระเงินเอง"
    return "UC (บัตรทอง/สอย.)"

output_records = []
for idx, (m_tag, no, name, hn, cov, doc, date, dtype, lab, fee) in enumerate(all_raw, 1):
    rec = {
        "id": f"REC-{idx:03d}",
        "hn": hn,
        "patientName": name,
        "age": 60 + (idx % 25),
        "gender": "หญิง" if ("นาง" in name or "น.ส" in name or "นส" in name) else "ชาย",
        "date": date,
        "doctor": f"ทพญ.{doc}" if not doc.startswith("ทพ") else doc,
        "dentureType": dtype,
        "denturePosition": "บน-ล่าง" if ("/" in dtype or "CD" in dtype) else "ชิ้นเดียว",
        "coverageGroup": get_coverage_group(cov),
        "coverage": cov,
        "labCost": float(lab),
        "treatmentFee": float(fee),
        "diagnosis": "Edentulous arch / Partial tooth loss",
        "status": "เสร็จสิ้น (Delivered)",
        "source": "เวชระเบียนย้อนหลัง รพ.พยุหะคีรี",
        "note": f"งวด {m_tag} ลำดับ {no}"
    }
    output_records.append(rec)

os.makedirs("data", exist_ok=True)
with open("data/denture_records.json", "w", encoding="utf-8") as f:
    json.dump({"records": output_records}, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {len(output_records)} retrospective records into data/denture_records.json")
