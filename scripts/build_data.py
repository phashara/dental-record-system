import json
import os

# Helper to format Buddhist year date into YYYY-MM-DD
def parse_date(date_str):
    if not date_str:
        return "2023-01-15"
    s = date_str.strip().replace("*", "")
    parts = s.split("/")
    if len(parts) == 3:
        try:
            d = int(parts[0])
            m = int(parts[1])
            y = int(parts[2])
            if y >= 2500:
                year = y - 543
            elif y >= 60:
                year = 2500 + y - 543
            elif y < 50:
                year = 2000 + y
            else:
                year = 2023
            return f"{year:04d}-{m:02d}-{d:02d}"
        except:
            return "2023-01-15"
    return "2023-01-15"

def format_hn(raw_hn, seq):
    if not raw_hn:
        return f"4900{seq:05d}"
    s = str(raw_hn).strip()
    if "E+" in s or "e+" in s:
        try:
            num = float(s)
            return str(int(round(num)))
        except:
            pass
    clean = "".join(c for c in s if c.isdigit())
    return clean if clean else f"4900{seq:05d}"

print("Script template ready")
