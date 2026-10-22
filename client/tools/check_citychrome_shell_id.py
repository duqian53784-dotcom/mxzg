# -*- coding: utf-8 -*-
"""Keep CityChromeShell's class id on the 22-char form the prefab already uses.

compressUuid(uuid, true)  -> 22 chars, prefab __type__ and _RF.push class id.
compressUuid(uuid, false) -> 23 chars, library filename only.

Engine decodeUuid returns any string that is not 22 chars unchanged, so a
chunk that registers the 23-char form never matches the prefab. That shows
up as Missing class, and the inspector copy says the script failed to compile.
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHELL_META = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChromeShell.ts.meta")
SHELL_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChromeShell.ts")
PREFAB = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "city", "CityChrome.prefab")
ASSETS = os.path.join(ROOT, "client", "assets")

BASE64_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
HEX_CHARS = "0123456789abcdef"
TEXT_EXT = {".ts", ".js", ".meta", ".prefab", ".scene", ".json"}

# Locked pair. Do not retarget the prefab onto the 23-char library form.
EXPECTED_UUID = "c4e8a1d2-7b63-4e90-8f15-6a2d9c0b47e3"
EXPECTED_CLASS_ID = "c46KHSe2NOkI8Vai2cC0fj"
EXPECTED_LIBRARY_ID = "c4e8aHSe2NOkI8Vai2cC0fj"


def hex_of(value):
    hex_str = value.replace("-", "").lower()
    if len(hex_str) != 32 or any(ch not in HEX_CHARS for ch in hex_str):
        raise SystemExit("script uuid is not a canonical uuid: " + value)
    return hex_str


def compress_hex(hex_str, reserved):
    chars = [hex_str[:reserved]]
    index = reserved
    while index < len(hex_str):
        h1 = int(hex_str[index], 16)
        h2 = int(hex_str[index + 1], 16)
        h3 = int(hex_str[index + 2], 16)
        chars.append(BASE64_KEYS[(h1 << 2) | (h2 >> 2)])
        chars.append(BASE64_KEYS[((h2 & 3) << 4) | h3])
        index += 3
    return "".join(chars)


def class_id(value):
    """22-char id. This is what prefab __type__ and _RF.push must share."""
    return compress_hex(hex_of(value), 2)


def library_id(value):
    """23-char library filename. Not a class id."""
    return compress_hex(hex_of(value), 5)


def iter_asset_text():
    for dirpath, dirnames, filenames in os.walk(ASSETS):
        dirnames[:] = [name for name in dirnames if name != ".git"]
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in TEXT_EXT:
                continue
            yield os.path.join(dirpath, name)


def main():
    if class_id(EXPECTED_UUID) != EXPECTED_CLASS_ID or len(EXPECTED_CLASS_ID) != 22:
        raise SystemExit("22-char class id drifted from " + EXPECTED_UUID)
    if library_id(EXPECTED_UUID) != EXPECTED_LIBRARY_ID or len(EXPECTED_LIBRARY_ID) != 23:
        raise SystemExit("23-char library id drifted from " + EXPECTED_UUID)

    with open(SHELL_META, encoding="utf-8") as handle:
        meta = json.load(handle)
    uuid = meta.get("uuid") or ""
    if meta.get("importer") != "typescript":
        raise SystemExit("CityChromeShell.ts.meta importer is not typescript")
    if uuid != EXPECTED_UUID:
        raise SystemExit(
            "CityChromeShell.ts.meta uuid must stay %s (got %s). "
            "A non-36-char uuid is returned unchanged by compressUuid and "
            "lands in _RF.push as-is." % (EXPECTED_UUID, uuid)
        )

    with open(SHELL_TS, encoding="utf-8") as handle:
        source = handle.read()
    if EXPECTED_LIBRARY_ID in source or EXPECTED_CLASS_ID in source:
        raise SystemExit("CityChromeShell.ts must not embed a compressed id")

    with open(PREFAB, encoding="utf-8") as handle:
        prefab = handle.read()
    if EXPECTED_LIBRARY_ID in prefab:
        raise SystemExit(
            "CityChrome.prefab contains library id %s. __type__ must stay %s"
            % (EXPECTED_LIBRARY_ID, EXPECTED_CLASS_ID)
        )
    needle = '"__type__": "%s"' % EXPECTED_CLASS_ID
    if prefab.count(needle) != 1:
        raise SystemExit("CityChrome.prefab must reference class id %s once" % EXPECTED_CLASS_ID)

    hits = []
    for path in iter_asset_text():
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        if EXPECTED_LIBRARY_ID in text:
            hits.append(os.path.relpath(path, ROOT))
    if hits:
        raise SystemExit(
            "23-char library id %s is not a class id; found in:\n%s"
            % (EXPECTED_LIBRARY_ID, "\n".join(hits))
        )

    print("class id %s" % EXPECTED_CLASS_ID)
    print("meta uuid %s" % EXPECTED_UUID)
    print("library filename %s must not be passed to _RF.push" % EXPECTED_LIBRARY_ID)
    return 0


if __name__ == "__main__":
    sys.exit(main())
