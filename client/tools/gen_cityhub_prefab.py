# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 CityHub.prefab.

Reads spriteFrame uuids from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, or USE_*_PREFAB flags.

Layout matches MainApp.buildCity() on a 720x1280 page (coords from center).
"""
import hashlib
import json
import os
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_PREFAB = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "city", "CityHub.prefab")
OUT_META = OUT_PREFAB + ".meta"

# path under resources/ -> key
SPRITE_FILES = {
    "bg": "ui/city/bg-main-scene.jpg",
    "title_bg": "ui/city/main-city_spr-title-bg.png",
    "mission": "ui/city/main-city_icon-main_mission.png",
    "mail": "ui/city/main-city_btn-mail-1.png",
    "task": "ui/city/main-city_btn-task-1.png",
    "shop": "ui/city/main-city_icon-main_shop.png",
    "backpack": "ui/city/main-scene-lang_spr-backpack.png",
    "btn_blue": "ui/common/button_btn-blue.png",
    "btn_buy": "ui/common/button_btn-buy-1.png",
    "btn_buy_p": "ui/common/button_btn-buy-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
    "btn_green": "ui/common/button_btn-green-big-1.png",
    "btn_green_p": "ui/common/button_btn-green-big-2.png",
    "btn_blue_big": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_big_p": "ui/common/button_btn-blue-big-2.png",
    "btn_peach": "ui/common/buy-gold_btn-peach-1.png",
}

FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")
LAYER_UI = 33554432

objs = []


def fid(seed: str) -> str:
    h = hashlib.md5(seed.encode("utf-8")).digest()
    s = base64.b64encode(h).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (s + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


def add(obj):
    objs.append(obj)
    return len(objs) - 1


def vec3(x=0, y=0, z=0):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


def quat():
    return {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}


def size(w, h):
    return {"__type__": "cc.Size", "width": w, "height": h}


def vec2(x, y):
    return {"__type__": "cc.Vec2", "x": x, "y": y}


def ref(i):
    return {"__id__": i}


def uuid_ref(u):
    return {"__uuid__": u}


def load_sprite_frame(rel: str) -> str:
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as f:
        data = json.load(f)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    u = sub.get("uuid") or ""
    if not u.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    return u


def load_font_uuid() -> str:
    with open(FONT_META, encoding="utf-8") as f:
        data = json.load(f)
    u = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(u) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return u


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
GATE_COLOR = color(170, 190, 170, 255)
NET_COLOR = color(160, 180, 210, 255)


add({
    "__type__": "cc.Prefab",
    "_name": "CityHub",
    "_objFlags": 0,
    "__editorExtras__": {},
    "_native": "",
    "data": {"__id__": 1},
    "optimizationPolicy": 0,
    "persistent": False,
})


def make_node(name, parent_id, x, y, w, h, active=True):
    node = {
        "__type__": "cc.Node",
        "_name": name,
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": None if parent_id is None else ref(parent_id),
        "_children": [],
        "_active": active,
        "_components": [],
        "_prefab": None,
        "_lpos": vec3(x, y, 0),
        "_lrot": quat(),
        "_lscale": vec3(1, 1, 1),
        "_mobility": 0,
        "_layer": LAYER_UI,
        "_euler": vec3(0, 0, 0),
        "_id": "",
    }
    node_id = add(node)

    uit = {
        "__type__": "cc.UITransform",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_contentSize": size(w, h),
        "_anchorPoint": vec2(0.5, 0.5),
        "_id": "",
    }
    uit_id = add(uit)
    cpi = add({"__type__": "cc.CompPrefabInfo", "fileId": fid(name + "@" + str(parent_id) + ":UITransform")})
    uit["__prefab"] = ref(cpi)
    node["_components"].append(ref(uit_id))

    pi = add({
        "__type__": "cc.PrefabInfo",
        "root": ref(1),
        "asset": ref(0),
        "fileId": fid(name + "@" + str(parent_id) + ":Node"),
        "instance": None,
        "targetOverrides": None,
        "nestedPrefabInstanceRoots": None,
    })
    node["_prefab"] = ref(pi)

    if parent_id is not None:
        objs[parent_id]["_children"].append(ref(node_id))
    return node_id


def append_comp(node_id, comp_obj, seed):
    cpi = add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
    comp_obj["__prefab"] = ref(cpi)
    comp_obj["node"] = ref(node_id)
    cid = add(comp_obj)
    objs[node_id]["_components"].append(ref(cid))
    return cid


def add_sprite(node_id, sf_uuid, typ=0, size_mode=0, col=None):
    spr = {
        "__type__": "cc.Sprite",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_customMaterial": None,
        "_srcBlendFactor": 2,
        "_dstBlendFactor": 4,
        "_color": col or WHITE,
        "_spriteFrame": uuid_ref(sf_uuid) if sf_uuid else None,
        "_type": typ,
        "_fillType": 0,
        "_sizeMode": size_mode,
        "_fillCenter": vec2(0, 0),
        "_fillStart": 0,
        "_fillRange": 0,
        "_isTrimmedMode": True,
        "_useGrayscale": False,
        "_atlas": None,
        "_id": "",
    }
    return append_comp(node_id, spr, objs[node_id]["_name"] + "@" + str(node_id) + ":Sprite")


def add_label(node_id, text, font_size, col, overflow=0, h_align=1, v_align=1, wrap=False, outline=False):
    lab = {
        "__type__": "cc.Label",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_customMaterial": None,
        "_srcBlendFactor": 2,
        "_dstBlendFactor": 4,
        "_color": col,
        "_string": text,
        "_horizontalAlign": h_align,
        "_verticalAlign": v_align,
        "_actualFontSize": font_size,
        "_fontSize": font_size,
        "_fontFamily": "Arial",
        "_lineHeight": int(font_size * 1.25),
        "_overflow": overflow,
        "_enableWrapText": wrap,
        "_font": uuid_ref(FONT),
        "_isSystemFontUsed": False,
        "_spacingX": 0,
        "_isItalic": False,
        "_isBold": False,
        "_isUnderline": False,
        "_underlineHeight": 2,
        "_cacheMode": 0,
        "_enableOutline": outline,
        "_outlineColor": color(20, 16, 28, 220),
        "_outlineWidth": 2,
        "_enableShadow": False,
        "_shadowColor": color(0, 0, 0, 255),
        "_shadowOffset": vec2(2, -2),
        "_shadowBlur": 2,
        "_id": "",
    }
    return append_comp(node_id, lab, objs[node_id]["_name"] + "@" + str(node_id) + ":Label")


def add_button(node_id, normal_sf, pressed_sf=None):
    pressed = pressed_sf or normal_sf
    btn = {
        "__type__": "cc.Button",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "clickEvents": [],
        "_interactable": True,
        "_transition": 3,
        "_normalColor": WHITE,
        "_hoverColor": color(211, 211, 211, 255),
        "_pressedColor": color(200, 200, 200, 255),
        "_disabledColor": color(124, 124, 124, 255),
        "_normalSprite": uuid_ref(normal_sf),
        "_hoverSprite": uuid_ref(normal_sf),
        "_pressedSprite": uuid_ref(pressed),
        "_disabledSprite": uuid_ref(normal_sf),
        "_duration": 0.1,
        "_zoomScale": 1.05,
        "_target": ref(node_id),
        "_id": "",
    }
    return append_comp(node_id, btn, objs[node_id]["_name"] + "@" + str(node_id) + ":Button")


def make_label_node(name, parent_id, x, y, w, h, text, font_size, col, overflow=0, wrap=False, outline=False):
    nid = make_node(name, parent_id, x, y, w, h)
    add_label(nid, text, font_size, col, overflow=overflow, wrap=wrap, outline=outline)
    return nid


def make_sprite_node(name, parent_id, x, y, w, h, sf, typ=0, col=None, size_mode=0):
    nid = make_node(name, parent_id, x, y, w, h)
    add_sprite(nid, sf, typ=typ, size_mode=size_mode, col=col)
    return nid


def make_button(name, parent_id, x, y, w, h, text, font_size, bg, pressed=None, icon=None, icon_w=44, icon_h=44):
    """Button node: sliced Sprite + Button, child Label, optional Icon."""
    nid = make_node(name, parent_id, x, y, w, h)
    add_sprite(nid, bg, typ=1, size_mode=0)
    add_button(nid, bg, pressed)
    label_x = 0
    label_w = w - 16
    if icon:
        icon_x = -w / 2 + icon_w / 2 + 10
        make_sprite_node("Icon", nid, icon_x, 0, icon_w, icon_h, icon, typ=0, size_mode=0)
        label_x = icon_w * 0.35
        label_w = w - icon_w - 24
    make_label_node(
        "Label", nid, label_x, 0, label_w, h - 8, text, font_size, WHITE, overflow=1, outline=True
    )
    return nid


# Root matches pageRoot design size. Children use buildCity place() coords.
root = make_node("CityHub", None, 0, 0, 720, 1280)
assert root == 1

# Optional full-page scene. JPG is referenced, not copied.
make_sprite_node("Bg", root, 0, 0, 720, 1280, SF["bg"], typ=0, size_mode=0)

# Title is a Label (font 48) with the city title plaque behind the glyphs.
title = make_node("Title", root, 0, 400, 360, 72)
add_sprite(title, SF["title_bg"], typ=1, size_mode=0)
add_label(title, "主城", 48, TITLE_COLOR, outline=True)

# Wide hub buttons. Colors follow MainApp fill roles via existing button art.
make_button(
    "BtnMainline", root, 0, 280, 420, 76, "主线", 24,
    SF["btn_blue"], icon=SF["mission"], icon_w=56, icon_h=58,
)
make_button(
    "BtnIdle", root, 0, 200, 420, 64, "挂机", 24,
    SF["btn_orange"], SF["btn_orange_p"],
)
make_button(
    "BtnBag", root, 0, 120, 420, 64, "背包", 24,
    SF["btn_green"], SF["btn_green_p"],
    icon=SF["backpack"], icon_w=44, icon_h=44,
)
make_button(
    "BtnMail", root, 0, 40, 420, 64, "邮件", 24,
    SF["btn_blue_big"], SF["btn_blue_big_p"],
    icon=SF["mail"], icon_w=44, icon_h=44,
)

# Four small entries on y=-120. No dedicated art except task + shop icons.
make_button(
    "BtnLogin7", root, -249, -120, 156, 52, "七日登录", 18,
    SF["btn_peach"],
)
make_button(
    "BtnGoal7", root, -83, -120, 156, 52, "七日目标", 18,
    SF["btn_orange"], SF["btn_orange_p"],
    icon=SF["task"], icon_w=32, icon_h=32,
)
make_button(
    "BtnShop", root, 83, -120, 156, 52, "商店", 18,
    SF["btn_blue_big"], SF["btn_blue_big_p"],
    icon=SF["shop"], icon_w=48, icon_h=28,
)
make_button(
    "BtnGift", root, 249, -120, 156, 52, "礼包", 18,
    SF["btn_buy"], SF["btn_buy_p"],
)

make_button(
    "BtnLimited", root, 0, -188, 420, 48, "限时活动", 22,
    SF["btn_orange"], SF["btn_orange_p"],
)

# Utility row sits between mail (y=40) and the small row (y=-120), same as buildCity.
make_button("BtnLog", root, -180, -40, 140, 48, "日志", 20, SF["btn_peach"])
make_button("BtnNotice", root, 0, -40, 140, 48, "公告", 20, SF["btn_peach"])
make_button("BtnNetDrop", root, 190, -40, 160, 48, "模拟断线", 20, SF["btn_peach"])

make_label_node(
    "Hint", root, 0, -248, 640, 28,
    "系统从底栏进入。带「锁」的点开会提示条件",
    18, MUTED, outline=True,
)
make_label_node(
    "Gate", root, 0, -330, 680, 72,
    "网关…",
    20, GATE_COLOR, overflow=1, wrap=True, outline=True,
)
make_label_node(
    "NetState", root, 0, -420, 680, 28,
    "网络 connected",
    20, NET_COLOR, outline=True,
)

objs[0]["data"] = ref(1)

os.makedirs(os.path.dirname(OUT_PREFAB), exist_ok=True)
with open(OUT_PREFAB, "w", encoding="utf-8", newline="\n") as f:
    json.dump(objs, f, ensure_ascii=False, indent=2)
    f.write("\n")

prefab_uuid = str(uuid.uuid4())
meta = {
    "ver": "1.1.50",
    "importer": "prefab",
    "imported": True,
    "uuid": prefab_uuid,
    "files": [".json"],
    "subMetas": {},
    "userData": {"syncNodeName": "CityHub"},
}
with open(OUT_META, "w", encoding="utf-8", newline="\n") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
    f.write("\n")

# --- checks ---
names = [o["_name"] for o in objs if o.get("__type__") == "cc.Node"]
required = [
    "CityHub", "Bg", "Title",
    "BtnMainline", "BtnIdle", "BtnBag", "BtnMail",
    "BtnLogin7", "BtnGoal7", "BtnShop", "BtnGift",
    "BtnLimited", "BtnLog", "BtnNotice", "BtnNetDrop",
    "Hint", "Gate", "NetState",
]
for n in required:
    assert n in names, "missing " + n
for banned in ("Top", "Bottom", "Tab_city", "Tab_hero", "Tab_summon", "Tab_smith", "Tab_plays"):
    assert banned not in names, "CityHub must stay separate from CityChrome: " + banned

file_ids = []
for o in objs:
    if "fileId" in o:
        file_ids.append(o["fileId"])
        assert len(o["fileId"]) == 22, o["fileId"]
assert len(file_ids) == len(set(file_ids)), "duplicate fileId"

known = set(SF.values()) | {FONT}
for o in objs:
    for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
        val = o.get(key)
        if isinstance(val, dict) and "__uuid__" in val:
            assert val["__uuid__"] in known, val["__uuid__"]

expect_pos = {
    "Title": (0, 400),
    "BtnMainline": (0, 280),
    "BtnIdle": (0, 200),
    "BtnBag": (0, 120),
    "BtnMail": (0, 40),
    "BtnLogin7": (-249, -120),
    "BtnGoal7": (-83, -120),
    "BtnShop": (83, -120),
    "BtnGift": (249, -120),
    "BtnLimited": (0, -188),
    "BtnLog": (-180, -40),
    "BtnNotice": (0, -40),
    "BtnNetDrop": (190, -40),
    "Hint": (0, -248),
    "Gate": (0, -330),
    "NetState": (0, -420),
}
for o in objs:
    if o.get("__type__") == "cc.Node" and o["_name"] in expect_pos:
        x, y = expect_pos[o["_name"]]
        assert o["_lpos"]["x"] == x and o["_lpos"]["y"] == y, o["_name"]

root_ui = objs[2]
assert root_ui["__type__"] == "cc.UITransform"
assert root_ui["_contentSize"]["width"] == 720
assert root_ui["_contentSize"]["height"] == 1280

print("Wrote", OUT_PREFAB)
print("UUID", prefab_uuid)
print("Objects", len(objs))
print("NODE_TREE_START")


def walk(nid, indent=0):
    n = objs[nid]
    print("  " * indent + n["_name"])
    for c in n["_children"]:
        walk(c["__id__"], indent + 1)


walk(1)
print("NODE_TREE_END")
print("OK")
