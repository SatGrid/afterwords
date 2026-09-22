"""Add an approved GitHub issue's word to the published constellation."""
import datetime
import json
import os
import re
from pathlib import Path

data_path = Path(__file__).resolve().parents[1] / "words.json"
title = os.environ["ISSUE_TITLE"]
issue = int(os.environ["ISSUE_NUMBER"])
body = os.environ.get("ISSUE_BODY", "")

match = re.fullmatch(r"Word:\s*(\w+)", title.strip(), re.UNICODE)
if not match or not match.group(1).isalpha() or not 2 <= len(match.group(1)) <= 18:
    raise SystemExit("Issue title must be 'Word: ' followed by 2–18 letters.")

word = match.group(1).lower()
entries = json.loads(data_path.read_text(encoding="utf-8"))
parent_match = re.search(r"Beside:\s*\*\*([^*]+)\*\*", body, re.IGNORECASE)
if not parent_match:
    raise SystemExit("The issue must identify an existing word after 'Beside:'.")
parent = parent_match.group(1).strip().lower()
if not any(item["word"].casefold() == parent.casefold() for item in entries):
    raise SystemExit(f"The related word '{parent}' is not in the constellation.")
if any(item.get("issue") == issue for item in entries):
    print("This issue is already in the constellation.")
    raise SystemExit(0)
if any(item["word"].casefold() == word.casefold() for item in entries):
    print("This word is already in the constellation.")
    raise SystemExit(0)

entries.append({"word": word, "parent": parent, "date": datetime.date.today().isoformat(), "issue": issue})
data_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Added {word} from issue #{issue}.")
