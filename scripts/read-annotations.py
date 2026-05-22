#!/usr/bin/env python3
"""read-annotations.py — Read annotations and extract images for Claude to view.

Reads a .annotations.json file, extracts any base64 images to temp files,
and prints a structured summary that Claude can process.

Usage:
    python read-annotations.py <file.annotations.json> [--images-dir /tmp/ann_images]
    python read-annotations.py <file.annotations.json> --resolve <id-or-index> [<id-or-index> ...]
"""

import argparse
import base64
import json
import os
import re
import sys
import time


def resolve_targets(anns, targets, resolved):
    changed = []
    missing = []

    for target in targets:
        match = None
        if target.isdigit():
            idx = int(target) - 1
            if 0 <= idx < len(anns):
                match = (idx, anns[idx])
        if match is None:
            for idx, ann in enumerate(anns):
                if ann.get("id") == target:
                    match = (idx, ann)
                    break

        if match is None:
            missing.append(target)
            continue

        idx, ann = match
        ann["resolved"] = resolved
        if resolved:
            ann["resolvedAt"] = int(time.time() * 1000)
        else:
            ann["resolvedAt"] = None
        changed.append((idx + 1, ann.get("id", "")))

    return changed, missing


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to .annotations.json")
    parser.add_argument("--images-dir", default="/tmp/ann_images",
                        help="Directory to extract images to (default: /tmp/ann_images)")
    parser.add_argument("--open-only", action="store_true",
                        help="Only show unresolved annotations")
    parser.add_argument("--resolve", nargs="+", metavar="TARGET",
                        help="Mark annotations resolved by 1-based index or annotation id")
    parser.add_argument("--reopen", nargs="+", metavar="TARGET",
                        help="Reopen annotations by 1-based index or annotation id")
    args = parser.parse_args()

    with open(args.json_file, "r", encoding="utf-8") as f:
        all_anns = json.load(f)

    if args.resolve:
        changed, missing = resolve_targets(all_anns, args.resolve, True)
        with open(args.json_file, "w", encoding="utf-8") as f:
            json.dump(all_anns, f, ensure_ascii=False, indent=2)
        for idx, ann_id in changed:
            print(f"Marked resolved: #{idx}" + (f" ({ann_id})" if ann_id else ""))
        for target in missing:
            print(f"Not found: {target}", file=sys.stderr)

    if args.reopen:
        changed, missing = resolve_targets(all_anns, args.reopen, False)
        with open(args.json_file, "w", encoding="utf-8") as f:
            json.dump(all_anns, f, ensure_ascii=False, indent=2)
        for idx, ann_id in changed:
            print(f"Reopened: #{idx}" + (f" ({ann_id})" if ann_id else ""))
        for target in missing:
            print(f"Not found: {target}", file=sys.stderr)

    anns = list(enumerate(all_anns, start=1))
    if args.open_only:
        anns = [(original_idx, a) for original_idx, a in anns if not a.get("resolved", False)]

    file_open_count = sum(1 for a in all_anns if not a.get("resolved", False))
    file_resolved_count = len(all_anns) - file_open_count

    if not anns:
        print("No annotations found.")
        print(f"Total: {len(all_anns)} annotations")
        print(f"Open: {file_open_count}, Resolved: {file_resolved_count}")
        return

    os.makedirs(args.images_dir, exist_ok=True)

    for original_idx, a in anns:
        status = "RESOLVED" if a.get("resolved") else "OPEN"
        print(f"{'='*60}")
        print(f"# Annotation #{original_idx} [{status}]")
        if a.get("id"):
            print(f"ID: {a.get('id')}")
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
                    fname = f"ann{original_idx}_img{j+1}.{ext}"
                    fpath = os.path.join(args.images_dir, fname)
                    with open(fpath, "wb") as imgf:
                        imgf.write(base64.b64decode(b64))
                    print(f"  - {fpath}")
                else:
                    print(f"  - [unrecognized format, length={len(img_data)}]")
        print()

    print(f"{'='*60}")
    print(f"Displayed: {len(anns)} annotations")
    print(f"Total: {len(all_anns)} annotations")
    print(f"Open: {file_open_count}, Resolved: {file_resolved_count}")
    if any(a.get("images") for _, a in anns):
        print(f"Images extracted to: {args.images_dir}/")
        print("Use the Read tool to view each image file.")


if __name__ == "__main__":
    main()
