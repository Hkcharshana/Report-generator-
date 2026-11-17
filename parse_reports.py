import json
import re

transcript_path = r"C:\Users\Admin\.gemini\antigravity\brain\29d51bf5-991b-4e03-b1df-79d8124c834d\.system_generated\logs\transcript_full.jsonl"

last_user_content = ""
with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if obj.get("type") == "USER_INPUT":
                content = obj.get("content", "")
                if "URINE DRUG SCREENING TEST" in content:
                    last_user_content = content
        except Exception:
            pass

print(f"Found user content length: {len(last_user_content)}")

# Now parse all reports in last_user_content
# Split on "Laboratory Report" or "Ref.No"
# Let's see how each section is formatted
blocks = re.split(r"(?:Laboratory\s+(?:Test\s+)?Report|\bRef\.No\b)", last_user_content)
print(f"Total blocks split: {len(blocks)}")

# Let's save last_user_content to a text file for inspection
with open(r"c:\Users\Admin\Desktop\neosys-local-generator\backend\user_reports_raw.txt", "w", encoding="utf-8") as f:
    f.write(last_user_content)

print("Saved user_reports_raw.txt")
