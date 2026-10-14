"""Render or inventory the bilingual Module 2 documents and their real covers."""
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
OUT = ROOT / "public/assets/lesson-plans/module-2"
RESOURCES = [
    ("shared-lesson-plan-format-en-vi", "format", "Shared Lesson Plan Format", "Mẫu kế hoạch bài dạy dùng chung"),
    ("step-by-step-lesson-planning-guide-en-vi", "guide", "Step by Step Lesson Planning Guide", "Hướng dẫn từng bước xây dựng kế hoạch bài dạy"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--qa-dir", type=Path, required=True)
    parser.add_argument("--reuse-rendered", action="store_true")
    parser.add_argument("--kind", choices=["all", "format", "guide"], default="all")
    args = parser.parse_args()
    entries = []
    for stem, kind, en, vi in RESOURCES:
        qa = args.qa_dir / stem
        if args.kind in {"all", kind}:
            if not args.reuse_rendered:
                subprocess.run([sys.executable, str(args.renderer), str(OUT / f"{stem}.docx"), "--output_dir", str(qa), "--dpi", "120", "--emit_pdf"], check=True)
            shutil.copy2(qa / f"{stem}.pdf", OUT / f"{stem}.pdf")
            with Image.open(qa / "page-1.png") as cover:
                cover.save(OUT / f"{stem}-cover.png", optimize=True)
        with Image.open(OUT / f"{stem}-cover.png") as cover:
            dimensions = list(cover.size)
        files = {}
        for format, suffix in [("docx", ".docx"), ("pdf", ".pdf"), ("cover", "-cover.png")]:
            path = OUT / f"{stem}{suffix}"
            files[format] = {"path": f"/assets/lesson-plans/module-2/{path.name}", "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        entries.append({"kind": kind, "name": en, "vi": vi, "languages": ["en", "vi"], "lessonMinutes": 45, "pages": len(PdfReader(OUT / f"{stem}.pdf").pages), "coverDimensions": dimensions, "files": files})
        print(f"{stem}: {entries[-1]['pages']} pages")
    (ROOT / "lib/module-2-planning-resources.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
