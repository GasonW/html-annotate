#!/usr/bin/env python3
"""read-annotations.py — Read annotations and extract images for Claude to view.

Reads a .annotations.json file, extracts any base64 images to temp files,
and prints a structured summary that Claude can process.

Usage:
    python read-annotations.py <file.annotations.json> [--images-dir /tmp/ann_images]
"""

import argparse
import base64
import json
import os
import re
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to .annotations.json")
    parser.add_argument("--images-dir", default="/tmp/ann_images",
                        help="Directory to extract images to (default: /tmp/ann_images)")
    parser.add_argument("--open-only", action="store_true",
                        help="Only show unresolved annotations")
    args = parser.parse_args()

    with open(args.json_file, "r", encoding="utf-8") as f:
        anns = json.load(f)

    if args.open_only:
        anns = [a for a in anns if not a.get("resolved", False)]

    if not anns:
        print("No annotations found.")
        return

    os.makedirs(args.images_dir, exist_ok=True)

    for i, a in enumerate(anns):
        idx = i + 1
        status = "RESOLVED" if a.get("resolved") else "OPEN"
        print(f"{'='*60}")
        print(f"# Annotation #{idx} [{status}]")
        print(f"Selected text: {a.get('selectedText', '')[:200]}")
        print(f"Comment: {a.get('comment', '')}")

        images = a.get("images", [])
        if images:
            print(f"Images ({len(images)}):")
            for j, img_data in enumerate(images):
                match = re.match(r"data:image/(\w+);base64,(.*)", img_data, re.DOTALL)
                if match:
                    ext = match.group(1)
                    if ext == "jpeg":
                        ext = "jpg"
                    b64 = match.group(2)
                    fname = f"ann{idx}_img{j+1}.{ext}"
                    fpath = os.path.join(args.images_dir, fname)
                    with open(fpath, "wb") as imgf:
                        imgf.write(base64.b64decode(b64))
                    print(f"  - {fpath}")
                else:
                    print(f"  - [unrecognized format, length={len(img_data)}]")
        print()

    print(f"{'='*60}")
    print(f"Total: {len(anns)} annotations")
    open_count = sum(1 for a in anns if not a.get("resolved", False))
    print(f"Open: {open_count}, Resolved: {len(anns) - open_count}")
    if any(a.get("images") for a in anns):
        print(f"Images extracted to: {args.images_dir}/")
        print("Use the Read tool to view each image file.")


if __name__ == "__main__":
    main()
