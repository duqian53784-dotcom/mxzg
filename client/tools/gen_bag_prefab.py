# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 Bag prefabs (P1, not wired).

Writes:
  client/assets/prefabs/ui/bag/WireBagPage.prefab
  client/assets/prefabs/ui/bag/BagPage.prefab
and their .meta files, plus ui/bag.meta if it is missing.

WireBagPage is the readonly real-server page (WireBagPage.ts).
BagPage is the Mock page (BagPage.ts). They do not share a root.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, or USE_*_PREFAB flags.
No backpack atlas: page chrome is common win-bg and button art.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "bag")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

BAG_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "BagPage.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireBagPage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireBag.ts")
ITEMS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "bag", "items.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "block": "ui/common/win-bg_block-bg-5.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
    "btn_green": "ui/common/button_btn-green-big-1.png",
    "btn_green_p": "ui/common/button_btn-green-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
VISIBLE_ROWS = 11
# Short Mock list. detailAnchor parks at -40, so the card sits at (0, -60).
MOCK_ROWS = (
    {"name": "小金币袋", "count": 10, "kind": "可使用", "selected": True},
    {"name": "经验药水", "count": 2, "kind": "可使用", "selected": False},
    {"name": "许愿符", "count": 1, "kind": "材料", "selected": False},
)


def fid(seed):
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    text = base64.b64encode(digest).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (text + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


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


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def require_snippet(path, snippet):
    if snippet not in read_text(path):
        raise SystemExit("layout snippet missing from %s: %s" % (path, snippet))


def ts_int(path, name):
    match = re.search(r"(?:export )?const %s = (\d+);" % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return int(match.group(1))


def ts_string(path, name):
    match = re.search(r'export const %s = "([^"]*)";' % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return match.group(1)


def load_sprite_frame(rel):
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    return value


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return value


def format_wire_line(item_type, item_id, num):
    """Same concatenation as formatWireBagLine when the item has no config name."""
    qty = "×%d" % num
    return "类型 %d · id %d %s" % (item_type, item_id, qty)


def bag_row_text(name, count, kind):
    """Same concatenation as bagRowText."""
    return "%s ×%d · %s" % (name, count, kind)


def detail_anchor(count):
    """BagPage.detailAnchor for a list of `count` rows."""
    step = 52
    top = 350
    last = top if count <= 0 else top - (count - 1) * step
    below = last - 90
    parked = below if below < -40 else -40
    return -210 if parked < -210 else parked


def load_copy():
    """Pull the strings and coordinates the prefabs are standing in for."""
    require_snippet(WIRE_TS, "const VISIBLE_ROWS = 11;")
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_BAG_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_BAG_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 410);",
    )
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);',
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_BAG_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_BAG_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(WIRE_TS, "340 - i * 44")
    require_snippet(WIRE_TS, 'align: "left"')
    require_snippet(WIRE_TS, "formatWireBagLine(item, wireBagItemName(item)), 22")
    require_snippet(
        WIRE_TS,
        'createLabel("还有 " + (items.length - visible) + " 件", 20, { color: MUTED, width: 640 })',
    )
    require_snippet(WIRE_TS, "340 - visible * 44")
    require_snippet(WIRE_PROTO, 'const qty = "×" + item.num;')
    require_snippet(WIRE_PROTO, 'return "类型 " + item.itemType + " · id " + item.itemId + " " + qty;')
    require_snippet(WIRE_PROTO, "return null;")

    require_snippet(BAG_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(BAG_TS, "const BODY = new Color(214, 224, 236, 255);")
    require_snippet(BAG_TS, 'place(createLabel("背包", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        BAG_TS,
        'place(createLabel("读取背包…", 20, { color: MUTED, width: 640 }), this.body, 0, 418);',
    )
    require_snippet(BAG_TS, 'count + " 种道具 · 点一项再使用"')
    require_snippet(BAG_TS, "const top = 350;")
    require_snippet(BAG_TS, "const step = 52;")
    require_snippet(BAG_TS, '(selected ? "已选 " : "") + bagRowText(item)')
    require_snippet(BAG_TS, "selected ? SELECT_FILL : ROW_FILL,\n        20")
    require_snippet(
        BAG_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);',
    )
    require_snippet(BAG_TS, 'createRect("card", 640, 150, new Color(16, 28, 48, 255)), detail, 0, anchor - 20')
    require_snippet(BAG_TS, 'createLabel(item.name + " ×" + item.count, 26, { color: TITLE, width: 600 })')
    require_snippet(BAG_TS, "detail, 0, anchor + 16")
    require_snippet(BAG_TS, "createLabel(item.desc, 18, { color: BODY, width: 600, height: 48 })")
    require_snippet(BAG_TS, "detail, 0, anchor - 28")
    require_snippet(BAG_TS, "anchor - 130")
    require_snippet(BAG_TS, "const parked = below < -40 ? below : -40;")
    require_snippet(BAG_TS, "return parked < -210 ? -210 : parked;")
    require_snippet(BAG_TS, "useButtonText(item.usable)")

    require_snippet(ITEMS_TS, 'return item.name + " ×" + item.count + " · " + kindLabel(item.kind);')
    require_snippet(ITEMS_TS, 'if (kind === "consumable") return "可使用";')
    require_snippet(ITEMS_TS, 'return "材料";')
    require_snippet(ITEMS_TS, 'return usable ? "使用" : "不可使用";')
    require_snippet(ITEMS_TS, 'name: "小金币袋"')
    require_snippet(ITEMS_TS, 'name: "经验药水"')
    require_snippet(ITEMS_TS, 'name: WISH_TOKEN_NAME')
    require_snippet(ITEMS_TS, 'desc: "使用后获得 " + GOLD_BAG_GAIN + " 金币"')

    if ts_int(ITEMS_TS, "GOLD_BAG_GAIN") != 50:
        raise SystemExit("GOLD_BAG_GAIN drifted")
    if ts_string(ITEMS_TS, "WISH_TOKEN_NAME") != "许愿符":
        raise SystemExit("wish token name drifted")
    if ts_int(WIRE_TS, "VISIBLE_ROWS") != VISIBLE_ROWS:
        raise SystemExit("VISIBLE_ROWS drifted")

    anchor = detail_anchor(len(MOCK_ROWS))
    if anchor != -40:
        raise SystemExit("sample list no longer parks the detail card at y=-60")

    wire_rows = []
    for i in range(VISIBLE_ROWS):
        wire_rows.append(format_wire_line(1 + i, 1001 + i, 1))
    if wire_rows[0] != "类型 1 · id 1001 ×1":
        raise SystemExit("wire line format drifted: " + wire_rows[0])

    return {
        "wire_title": ts_string(WIRE_PROTO, "WIRE_BAG_READONLY_TITLE"),
        "wire_note": ts_string(WIRE_PROTO, "WIRE_BAG_READONLY_NOTE"),
        "wire_empty": ts_string(WIRE_PROTO, "WIRE_BAG_EMPTY"),
        "wire_unsynced": ts_string(WIRE_PROTO, "WIRE_BAG_UNSYNCED_TOAST"),
        "wire_rows": wire_rows,
        "wire_more": "还有 3 件",
        "mock_count": "%d 种道具 · 点一项再使用" % len(MOCK_ROWS),
        "mock_rows": [
            (("已选 " if row["selected"] else "") + bag_row_text(row["name"], row["count"], row["kind"]))
            for row in MOCK_ROWS
        ],
        "detail_name": "%s ×%d" % (MOCK_ROWS[0]["name"], MOCK_ROWS[0]["count"]),
        "detail_desc": "使用后获得 50 金币",
        "detail_use": "使用",
        "anchor": anchor,
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
BODY = color(214, 224, 236, 255)
PAGE_BG = color(8, 16, 32, 255)
CARD_BG = color(16, 28, 48, 255)


class Builder(object):
    def __init__(self, prefab_name):
        self.prefab_name = prefab_name
        self.objs = []
        self.path_of = {}
        self.add({
            "__type__": "cc.Prefab",
            "_name": prefab_name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        })

    def add(self, obj):
        self.objs.append(obj)
        return len(self.objs) - 1

    def make_node(self, name, parent_id, x, y, w, h, active=True):
        if parent_id is None:
            path = name
        else:
            path = self.path_of[parent_id] + "/" + name
        if path in self.path_of.values():
            raise SystemExit("duplicate node path " + path)
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
        node_id = self.add(node)
        self.path_of[node_id] = path

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
        uit_id = self.add(uit)
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(path + ":UITransform")})
        uit["__prefab"] = ref(cpi)
        node["_components"].append(ref(uit_id))

        pi = self.add({
            "__type__": "cc.PrefabInfo",
            "root": ref(1),
            "asset": ref(0),
            "fileId": fid(path + ":Node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        node["_prefab"] = ref(pi)

        if parent_id is not None:
            self.objs[parent_id]["_children"].append(ref(node_id))
        return node_id

    def append_comp(self, node_id, comp_obj, seed):
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
        comp_obj["__prefab"] = ref(cpi)
        comp_obj["node"] = ref(node_id)
        cid = self.add(comp_obj)
        self.objs[node_id]["_components"].append(ref(cid))
        return cid

    def add_sprite(self, node_id, sf_uuid, typ=1, size_mode=0, col=None):
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
            "_spriteFrame": uuid_ref(sf_uuid),
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
        return self.append_comp(node_id, spr, self.path_of[node_id] + ":Sprite")

    def add_label(self, node_id, text, font_size, col, overflow=1, h_align=1, v_align=1, wrap=False, outline=False):
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
            "_lineHeight": font_size + 8,
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
        return self.append_comp(node_id, lab, self.path_of[node_id] + ":Label")

    def add_button(self, node_id, normal_sf, pressed_sf):
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
            "_pressedSprite": uuid_ref(pressed_sf),
            "_disabledSprite": uuid_ref(normal_sf),
            "_duration": 0.1,
            "_zoomScale": 1.05,
            "_target": ref(node_id),
            "_id": "",
        }
        return self.append_comp(node_id, btn, self.path_of[node_id] + ":Button")

    def make_label_node(
        self, name, parent_id, x, y, w, h, text, font_size, col,
        h_align=1, v_align=1, wrap=False, outline=False, active=True,
    ):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
        self.add_label(
            nid, text, font_size, col,
            h_align=h_align, v_align=v_align, wrap=wrap, outline=outline,
        )
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, col=col)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg)
        self.add_button(nid, bg, pressed)
        self.make_label_node("Label", nid, 0, 0, w - 16, h - 8, text, font_size, WHITE, outline=True)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def label_comp(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Label":
                return comp
        for cref in node["_children"]:
            child = self.objs[cref["__id__"]]
            if child.get("_name") != "Label":
                continue
            for crefc in child["_components"]:
                comp = self.objs[crefc["__id__"]]
                if comp.get("__type__") == "cc.Label":
                    return comp
        raise SystemExit("missing label on " + path)

    def label_of(self, path):
        return self.label_comp(path)["_string"]

    def size_of(self, path):
        node = self.objs[self.id_of(path)]
        uit = self.objs[node["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        box = uit["_contentSize"]
        return box["width"], box["height"]

    def sprite_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Sprite":
                return comp
        raise SystemExit("missing sprite on " + path)

    def expect(self, path, x, y, w, h, text=None, active=True):
        node = self.objs[self.id_of(path)]
        pos = node["_lpos"]
        if pos["x"] != x or pos["y"] != y:
            raise SystemExit("%s position %s,%s != %s,%s" % (path, pos["x"], pos["y"], x, y))
        aw, ah = self.size_of(path)
        if aw != w or ah != h:
            raise SystemExit("%s size %s,%s != %s,%s" % (path, aw, ah, w, h))
        if bool(node["_active"]) != bool(active):
            raise SystemExit("%s active=%s" % (path, node["_active"]))
        if text is not None and self.label_of(path) != text:
            raise SystemExit("%s text %r" % (path, self.label_of(path)))

    def expect_align(self, path, h_align, v_align=1):
        lab = self.label_comp(path)
        if lab["_horizontalAlign"] != h_align or lab["_verticalAlign"] != v_align:
            raise SystemExit(
                "%s align %s,%s" % (path, lab["_horizontalAlign"], lab["_verticalAlign"])
            )

    def expect_tint(self, path, tint):
        got = self.sprite_of(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s tint %s" % (path, got))

    def expect_sprite(self, path, sf_uuid):
        got = self.sprite_of(path)["_spriteFrame"]["__uuid__"]
        if got != sf_uuid:
            raise SystemExit("%s sprite %s" % (path, got))


def label_box(font_size, width):
    return width, font_size + 16


def build_wire(copy):
    b = Builder("WireBagPage")
    root = b.make_node("WireBagPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Deep-blue page fill. The code paints a rect; the prefab tints common win-bg.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, copy["wire_title"], 40, TITLE_COLOR, outline=True)
    note_w, note_h = label_box(22, 640)
    b.make_label_node("Note", root, 0, 410, note_w, note_h, copy["wire_note"], 22, MUTED)

    # Hosts sit at the page origin so child y matches place() on the code page.
    # Runtime render() destroys and rebuilds the rows node; these children are a preview.
    list_host = b.make_node("ListHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", list_host, 0, 0, PAGE_W, PAGE_H)
    state_w, state_h = label_box(28, 640)
    b.make_label_node(
        "Empty", rows, 0, 280, state_w, state_h, copy["wire_empty"], 28, TITLE_COLOR, active=False,
    )
    b.make_label_node(
        "Unsynced", rows, 0, 280, state_w, state_h, copy["wire_unsynced"], 28, TITLE_COLOR, active=True,
    )
    row_w, row_h = label_box(22, 640)
    for i, text in enumerate(copy["wire_rows"]):
        b.make_label_node(
            "Row_%d" % i, rows, 0, 340 - i * 44, row_w, row_h, text, 22, TITLE_COLOR,
            h_align=0, active=False,
        )
    more_w, more_h = label_box(20, 640)
    b.make_label_node(
        "More", rows, 0, 340 - VISIBLE_ROWS * 44, more_w, more_h, copy["wire_more"], 20, MUTED, active=False,
    )
    b.make_button(
        "BtnBack", root, 0, -460, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def build_bag(copy):
    b = Builder("BagPage")
    root = b.make_node("BagPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, "背包", 40, TITLE_COLOR, outline=True)
    count_w, count_h = label_box(20, 640)
    b.make_label_node("Count", root, 0, 418, count_w, count_h, copy["mock_count"], 20, MUTED)

    rows_host = b.make_node("RowsHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", rows_host, 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        selected = MOCK_ROWS[i]["selected"]
        bg = SF["btn_orange"] if selected else SF["btn_blue"]
        pressed = SF["btn_orange_p"] if selected else SF["btn_blue_p"]
        b.make_button(
            "Row_%d" % i, rows, 0, 350 - i * 52, 640, 46, text, 20, bg, pressed,
        )

    anchor = copy["anchor"]
    detail_host = b.make_node("DetailHost", root, 0, 0, PAGE_W, PAGE_H)
    detail = b.make_node("Detail", detail_host, 0, 0, PAGE_W, PAGE_H)
    b.make_sprite_node("Card", detail, 0, anchor - 20, 640, 150, SF["block"], col=CARD_BG)
    name_w, name_h = label_box(26, 600)
    b.make_label_node(
        "Name", detail, 0, anchor + 16, name_w, name_h, copy["detail_name"], 26, TITLE_COLOR,
    )
    b.make_label_node(
        "Desc", detail, 0, anchor - 28, 600, 48, copy["detail_desc"], 18, BODY,
        v_align=0, wrap=True,
    )
    b.make_button(
        "BtnUse", detail, 0, anchor - 130, 420, 56, copy["detail_use"], 24,
        SF["btn_green"], SF["btn_green_p"],
    )
    b.make_button(
        "BtnBack", root, 0, -430, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_bag(b, copy)
    return b


def check_wire(b, copy):
    b.expect("WireBagPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireBagPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("WireBagPage/Bg", PAGE_BG)
    b.expect_sprite("WireBagPage/Bg", SF["win_bg"])
    b.expect("WireBagPage/Title", 0, 470, 680, 56, copy["wire_title"])
    b.expect("WireBagPage/Note", 0, 410, 640, 38, copy["wire_note"])
    b.expect("WireBagPage/ListHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireBagPage/ListHost/Rows", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireBagPage/ListHost/Rows/Empty", 0, 280, 640, 44, copy["wire_empty"], active=False)
    b.expect("WireBagPage/ListHost/Rows/Unsynced", 0, 280, 640, 44, copy["wire_unsynced"], active=True)
    for i, text in enumerate(copy["wire_rows"]):
        path = "WireBagPage/ListHost/Rows/Row_%d" % i
        b.expect(path, 0, 340 - i * 44, 640, 38, text, active=False)
        b.expect_align(path, 0, 1)
    b.expect(
        "WireBagPage/ListHost/Rows/More",
        0, 340 - VISIBLE_ROWS * 44, 640, 36, copy["wire_more"], active=False,
    )
    b.expect("WireBagPage/BtnBack", 0, -460, 240, 48, "返回")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("PanelList", "Top", "Bottom", "RowsHost", "DetailHost"):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
    check_common(b)


def check_bag(b, copy):
    anchor = copy["anchor"]
    b.expect("BagPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("BagPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("BagPage/Bg", PAGE_BG)
    b.expect("BagPage/Title", 0, 470, 680, 56, "背包")
    b.expect("BagPage/Count", 0, 418, 640, 36, copy["mock_count"])
    b.expect("BagPage/RowsHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("BagPage/RowsHost/Rows", 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        path = "BagPage/RowsHost/Rows/Row_%d" % i
        b.expect(path, 0, 350 - i * 52, 640, 46, text, active=True)
        if MOCK_ROWS[i]["selected"]:
            b.expect_sprite(path, SF["btn_orange"])
        else:
            b.expect_sprite(path, SF["btn_blue"])
    b.expect("BagPage/DetailHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("BagPage/DetailHost/Detail", 0, 0, PAGE_W, PAGE_H)
    b.expect("BagPage/DetailHost/Detail/Card", 0, anchor - 20, 640, 150)
    b.expect_tint("BagPage/DetailHost/Detail/Card", CARD_BG)
    b.expect_sprite("BagPage/DetailHost/Detail/Card", SF["block"])
    b.expect("BagPage/DetailHost/Detail/Name", 0, anchor + 16, 600, 42, copy["detail_name"])
    b.expect("BagPage/DetailHost/Detail/Desc", 0, anchor - 28, 600, 48, copy["detail_desc"])
    b.expect_align("BagPage/DetailHost/Detail/Desc", 1, 0)
    b.expect("BagPage/DetailHost/Detail/BtnUse", 0, anchor - 130, 420, 56, copy["detail_use"])
    b.expect_sprite("BagPage/DetailHost/Detail/BtnUse", SF["btn_green"])
    b.expect("BagPage/BtnBack", 0, -430, 240, 48, "返回")
    if anchor - 20 != -60:
        raise SystemExit("card is not at y=-60")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("ListHost", "Unsynced", "Top", "Bottom"):
        if banned in names:
            raise SystemExit("mock page picked up " + banned)
    check_common(b)


def check_common(b):
    file_ids = []
    known = set(SF.values()) | {FONT}
    for obj in b.objs:
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId " + obj["fileId"])
        if obj.get("__type__") == "cc.Button":
            if obj.get("clickEvents") != []:
                raise SystemExit("button clickEvents must stay empty")
            if obj.get("_transition") != 3:
                raise SystemExit("button transition is not scale")
        if obj.get("__type__") == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics; use a spriteFrame")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
                if key != "_font" and not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite uuid is not @f9941: " + val["__uuid__"])
        if obj.get("__type__") == "cc.Node" and obj["_parent"] is not None:
            parent = b.objs[obj["_parent"]["__id__"]]
            child_ids = [c["__id__"] for c in parent["_children"]]
            if b.objs.index(obj) not in child_ids:
                raise SystemExit("parent missing child " + obj["_name"])
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId in " + b.prefab_name)
    n = len(b.objs)
    for obj in b.objs:
        walk_refs(obj, n)


def walk_refs(obj, n):
    if isinstance(obj, dict):
        if set(obj.keys()) == {"__id__"}:
            if not isinstance(obj["__id__"], int) or obj["__id__"] < 0 or obj["__id__"] >= n:
                raise SystemExit("dangling __id__")
        for value in obj.values():
            walk_refs(value, n)
    elif isinstance(obj, list):
        for value in obj:
            walk_refs(value, n)


def write_prefab(builder):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    if ".png" in text or "resources/" in text or "USE_" in text:
        raise SystemExit("prefab embedded a file path or a load flag")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = str(uuid.uuid4())
    meta = {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": prefab_uuid,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": builder.prefab_name},
    }
    with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", path)
    print("UUID", prefab_uuid)
    print("Objects", len(builder.objs))
    print("NODE_TREE_START")
    walk(builder, 1, 0)
    print("NODE_TREE_END")
    return prefab_uuid


def walk(builder, nid, indent):
    node = builder.objs[nid]
    flag = "" if node.get("_active", True) else " [inactive]"
    print("  " * indent + node["_name"] + flag)
    for child in node["_children"]:
        walk(builder, child["__id__"], indent + 1)


def write_dir_meta():
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": str(uuid.uuid4()),
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def main():
    copy = load_copy()
    if copy["wire_title"] != "背包（真服只读）":
        raise SystemExit("wire title drifted: " + copy["wire_title"])
    if copy["wire_note"] != "只读。不使用，不写金币":
        raise SystemExit("wire note drifted: " + copy["wire_note"])
    if copy["wire_empty"] != "空背包":
        raise SystemExit("wire empty drifted: " + copy["wire_empty"])
    if copy["wire_unsynced"] != "真服背包未同步":
        raise SystemExit("wire unsynced drifted: " + copy["wire_unsynced"])
    if len(copy["wire_rows"]) != VISIBLE_ROWS:
        raise SystemExit("wire row count drifted")
    wire = build_wire(copy)
    bag = build_bag(copy)
    write_dir_meta()
    write_prefab(wire)
    write_prefab(bag)
    print("OK")
    print("MOCK_COUNT", copy["mock_count"])
    print("DETAIL", copy["detail_name"], copy["detail_desc"], "anchor", copy["anchor"])


if __name__ == "__main__":
    main()
