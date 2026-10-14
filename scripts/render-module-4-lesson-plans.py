"""Render and inventory the Module 4 Word resources using the packaged renderer."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/assets/lesson-plans/module-4"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--qa-dir", type=Path, required=True)
    parser.add_argument("--subject")
    args = parser.parse_args()
    data = json.loads((ROOT / "scripts/data/module-4-lesson-plans.json").read_text())
    entries = []
    for s in data["subjects"]:
        for kind in ["template", "example"]:
            stem = f"{s['key']}-{kind}-en-vi"
            docx = OUT / (stem + ".docx")
            qa = args.qa_dir / stem
            if not args.subject or args.subject == s["key"]:
                subprocess.run([sys.executable, str(args.renderer), str(docx), "--output_dir", str(qa), "--dpi", "110", "--emit_pdf"], check=True)
                shutil.copy2(qa / (stem + ".pdf"), OUT / (stem + ".pdf"))
                image = Image.open(qa / "page-1.png")
                image.save(OUT / (stem + "-cover.png"), optimize=True)
            pdf = OUT / (stem + ".pdf")
            if not pdf.exists():
                continue
            reader = PdfReader(pdf)
            files = {}
            for format, suffix in [("docx", ".docx"), ("pdf", ".pdf"), ("cover", "-cover.png")]:
                asset = OUT / (stem + suffix)
                files[format] = {"path": f"/assets/lesson-plans/module-4/{asset.name}", "bytes": asset.stat().st_size, "sha256": hashlib.sha256(asset.read_bytes()).hexdigest()}
            entries.append({"subject": s["key"], "name": s["name"], "vi": s["vi"], "kind": kind, "topic": s["topic"], "book": s["book"], "chapter": s["chapter"], "bookId": s["bookId"], "syllabusBased": bool(s.get("syllabusBased")), "lessonMinutes": data["lessonMinutes"], "pages": len(reader.pages), "guidance": data["guidance"], "files": files})
            print(f"{stem}: {len(reader.pages)} pages", flush=True)
    (ROOT / "lib/subject-lesson-plans.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
