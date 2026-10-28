#!/usr/bin/env python3
"""Build a standalone 1:1 HeroList prefab from the imported CCBI layers.

The legacy HeroList screen is assembled at runtime from:
  * map-bg-role-1.jpg (HeroListLayer.lua)
  * HeroListLayer.ccbi
  * HeroListHeroLayer.ccbi

The migrated project keeps the latter two as separate prefabs because
screenFill mounts the list board dynamically. This generator composes them
without changing the production prefab, so the complete shell can be opened
and edited directly in Creator.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
HERO_DIR = ROOT / "client/assets/prefabs/ui/hero"
OUT = HERO_DIR / "HeroListGptLayer.prefab"
OUT_META = HERO_DIR / "HeroListGptLayer.prefab.meta"
OUT_UUID = "2efba8ce-b41a-49a0-b4bb-791129f6865e"
BACKGROUND_UUID = "4e49da4f-d5e5-4340-b7ce-22256ee81e7c@f9941"
UI_LAYER = 33554432


def ref(index: int) -> dict[str, int]:
    return {"__id__": index}


def remap_refs(value: Any, mapping: dict[int, int]) -> Any:
    if isinstance(value, dict):
        if set(value) == {"__id__"}:
            old = value["__id__"]
            return ref(mapping[old])
        return {key: remap_refs(item, mapping) for key, item in value.items()}
    if isinstance(value, list):
        return [remap_refs(item, mapping) for item in value]
    return value


def append_background(data: list[dict[str, Any]], root_id: int) -> int:
    node_id = len(data)
    ui_id = node_id + 1
    ui_info_id = node_id + 2
    prefab_info_id = node_id + 3
    sprite_id = node_id + 4
    sprite_info_id = node_id + 5

    data.extend(
        [
            {
                "__type__": "cc.Node",
                "_name": "RoleCaveBackground",
                "_objFlags": 0,
                "__editorExtras__": {},
                "_parent": ref(root_id),
                "_children": [],
                "_active": True,
                "_components": [ref(ui_id), ref(sprite_id)],
                "_prefab": ref(prefab_info_id),
                "_lpos": {"__type__": "cc.Vec3", "x": 320, "y": 460, "z": 0},
                "_lrot": {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1},
                "_lscale": {"__type__": "cc.Vec3", "x": 1, "y": 1, "z": 1},
                "_mobility": 0,
                "_layer": UI_LAYER,
                "_euler": {"__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0},
                "_id": "",
            },
            {
                "__type__": "cc.UITransform",
                "_name": "",
                "_objFlags": 0,
                "__editorExtras__": {},
                "node": ref(node_id),
                "_enabled": True,
                "__prefab": ref(ui_info_id),
                "_contentSize": {"__type__": "cc.Size", "width": 640, "height": 960},
                "_anchorPoint": {"__type__": "cc.Vec2", "x": 0.5, "y": 0.5},
                "_id": "",
            },
            {"__type__": "cc.CompPrefabInfo", "fileId": "5c2fQ8lDLJI84iCvpvO6XQ"},
            {
                "__type__": "cc.PrefabInfo",
                "root": ref(root_id),
                "asset": ref(0),
                "fileId": "37IvbcoYmSE1VFsSiGFWyA",
                "instance": None,
                "targetOverrides": None,
                "nestedPrefabInstanceRoots": None,
            },
            {
                "__type__": "cc.Sprite",
                "_name": "",
                "_objFlags": 0,
                "__editorExtras__": {},
                "node": ref(node_id),
                "_enabled": True,
                "__prefab": ref(sprite_info_id),
                "_customMaterial": None,
                "_srcBlendFactor": 2,
                "_dstBlendFactor": 4,
                "_color": {"__type__": "cc.Color", "r": 255, "g": 255, "b": 255, "a": 255},
                "_spriteFrame": {"__uuid__": BACKGROUND_UUID},
                "_type": 0,
                "_fillType": 0,
                "_sizeMode": 0,
                "_fillCenter": {"__type__": "cc.Vec2", "x": 0, "y": 0},
                "_fillStart": 0,
                "_fillRange": 0,
                "_isTrimmedMode": False,
                "_useGrayscale": False,
                "_atlas": None,
                "_id": "",
            },
            {"__type__": "cc.CompPrefabInfo", "fileId": "eVxsOcIIV6iT7YTJVSJYuQ"},
        ]
    )
    return node_id


def compose() -> list[dict[str, Any]]:
    outer = json.loads((HERO_DIR / "HeroListLayer.prefab").read_text(encoding="utf-8"))
    inner = json.loads((HERO_DIR / "HeroListHeroLayer.prefab").read_text(encoding="utf-8"))
    data = copy.deepcopy(outer)

    data[0]["_name"] = "HeroListGptLayer"
    data[1]["_name"] = "HeroListGptLayer"
    root_id = 1

    mapping = {0: 0}
    for old_id in range(1, len(inner)):
        mapping[old_id] = len(data) + old_id - 1
    imported = [remap_refs(copy.deepcopy(item), mapping) for item in inner[1:]]
    inner_root_id = mapping[1]
    imported[0]["_name"] = "HeroListBoard"
    imported[0]["_parent"] = ref(root_id)
    imported[0]["_lpos"] = {"__type__": "cc.Vec3", "x": 0, "y": 0, "z": 0}
    data.extend(imported)

    background_id = append_background(data, root_id)
    children = data[root_id]["_children"]
    # Background first. The list board sits directly below the tab menu, as in
    # screenFill's setSiblingIndex(menu.getSiblingIndex()) production path.
    children.insert(0, ref(background_id))
    menu_index = next(
        index
        for index, child in enumerate(children)
        if data[child["__id__"]].get("_name") == "UIMenu_1"
    )
    children.insert(menu_index, ref(inner_root_id))
    return data


def validate(data: list[dict[str, Any]]) -> None:
    names = [item.get("_name") for item in data if item.get("__type__") == "cc.Node"]
    required = {
        "HeroListGptLayer",
        "RoleCaveBackground",
        "HeroListBoard",
        "btn_hero",
        "btn_illustrat",
        "btn_dragon",
        "btn_lineup",
        "btn_astrolabe",
        "HeroScroll",
        "btn_elem0",
        "btn_elem5",
    }
    missing = sorted(required.difference(names))
    if missing:
        raise SystemExit("missing nodes: " + ", ".join(missing))

    maximum = len(data) - 1

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            if set(value) == {"__id__"}:
                index = value["__id__"]
                if not isinstance(index, int) or index < 0 or index > maximum:
                    raise SystemExit(f"dangling reference: {index}")
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(data)
    root_children = [data[item["__id__"]]["_name"] for item in data[1]["_children"]]
    if root_children[0] != "RoleCaveBackground":
        raise SystemExit("background is not the first sibling")
    if root_children.index("HeroListBoard") + 1 != root_children.index("UIMenu_1"):
        raise SystemExit("hero board is not directly below the tab menu")


def main() -> None:
    data = compose()
    validate(data)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    meta = {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": OUT_UUID,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": "HeroListGptLayer"},
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(data)} objects)")


if __name__ == "__main__":
    main()
