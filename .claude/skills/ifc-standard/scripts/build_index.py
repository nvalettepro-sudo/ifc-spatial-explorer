#!/usr/bin/env python3
"""
build_index.py — Construit l'index JSON interrogeable a partir des sources brutes.

Sources (dans ../raw/) :
  - IFC2x3.exp, IFC4_ADD2_TC1.exp, IFC4X3.exp   (schemas EXPRESS, buildingSMART)
  - Pset_IFC2X3.ifc, Pset_IFC4_ADD2.ifc, Pset_IFC4X3.ifc  (templates de Psets)

Sortie (dans ../data/) : un fichier <SCHEMA>.json par version.

A relancer uniquement si les sources brutes changent.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
DATA = ROOT / "data"

SCHEMAS = {
    "IFC2X3": {"exp": "IFC2x3.exp", "pset": "Pset_IFC2X3.ifc"},
    "IFC4": {"exp": "IFC4_ADD2_TC1.exp", "pset": "Pset_IFC4_ADD2.ifc"},
    "IFC4X3": {"exp": "IFC4X3.exp", "pset": "Pset_IFC4X3.ifc"},
}


# ---------------------------------------------------------------- EXPRESS ---
def strip_comments(text):
    """Retire les commentaires EXPRESS (* ... *) hors chaines."""
    return re.sub(r"\(\*.*?\*\)", "", text, flags=re.S)


def parse_express(path):
    text = strip_comments(path.read_text(encoding="utf-8", errors="replace"))
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    schema_name = None
    m = re.search(r"^\s*SCHEMA\s+([A-Za-z0-9_]+)\s*;", text, re.M)
    if m:
        schema_name = m.group(1)

    entities, types, functions, rules = {}, {}, {}, {}

    def blocks(kw, endkw):
        pattern = re.compile(
            r"^\s*%s\s+([A-Za-z0-9_]+)(.*?)^\s*%s\s*;" % (kw, endkw),
            re.S | re.M | re.I,
        )
        for mm in pattern.finditer(text):
            yield mm.group(1), mm.group(0).strip()

    # --- TYPE ---
    for name, body in blocks("TYPE", "END_TYPE"):
        rec = {"name": name, "kind": "type", "express": body}
        # enumeration
        me = re.search(r"=\s*ENUMERATION\s+OF\s*\((.*?)\)\s*;", body, re.S | re.I)
        if me:
            rec["kind"] = "enumeration"
            rec["values"] = [v.strip() for v in me.group(1).split(",") if v.strip()]
        else:
            ms = re.search(r"=\s*SELECT\s*\((.*?)\)\s*;", body, re.S | re.I)
            if ms:
                rec["kind"] = "select"
                rec["values"] = [v.strip() for v in ms.group(1).split(",") if v.strip()]
            else:
                md = re.search(r"=\s*(.*?)\s*;", body, re.S)
                if md:
                    rec["kind"] = "defined"
                    rec["underlying"] = " ".join(md.group(1).split())
        types[name.upper()] = rec

    # --- ENTITY ---
    for name, body in blocks("ENTITY", "END_ENTITY"):
        rec = {"name": name, "express": body}
        rec["abstract"] = bool(re.search(r"\bABSTRACT\s+SUPERTYPE\b", body, re.I))

        msup = re.search(r"\bSUBTYPE\s+OF\s*\(\s*([A-Za-z0-9_]+)\s*\)", body, re.I)
        rec["supertype"] = msup.group(1) if msup else None

        msub = re.search(
            r"\bSUPERTYPE\s+OF\s*\((?:\s*ONEOF\s*\()?(.*?)\)\s*\)?\s*(?:SUBTYPE|;)",
            body,
            re.S | re.I,
        )
        if msub:
            raw = re.sub(r"ANDOR|ONEOF|[()]", ",", msub.group(1))
            rec["subtypes_declared"] = sorted(
                {t.strip() for t in raw.split(",") if t.strip() and t.strip().lower() != "andor"}
            )
        else:
            rec["subtypes_declared"] = []

        # corps : attributs jusqu'a INVERSE / WHERE / DERIVE / UNIQUE
        after = body.split(";", 1)[1] if ";" in body else ""
        head = re.split(r"^\s*(INVERSE|WHERE|DERIVE|UNIQUE)\s*$", after, flags=re.M | re.I)[0]
        attrs = []
        for am in re.finditer(r"^\s*([A-Za-z0-9_]+)\s*:\s*(.*?);", head, re.S | re.M):
            aname, atype = am.group(1), " ".join(am.group(2).split())
            if aname.upper() in ("SELF", "END_ENTITY"):
                continue
            attrs.append(
                {
                    "name": aname,
                    "type": atype.replace("OPTIONAL ", "", 1),
                    "optional": atype.upper().startswith("OPTIONAL"),
                }
            )
        rec["attributes"] = attrs

        # INVERSE
        inv = []
        minv = re.search(r"^\s*INVERSE\s*$(.*?)(?=^\s*(WHERE|DERIVE|UNIQUE|END_ENTITY)\s*)",
                         body, re.S | re.M | re.I)
        if minv:
            for im in re.finditer(r"^\s*([A-Za-z0-9_]+)\s*:\s*(.*?);", minv.group(1), re.S | re.M):
                inv.append({"name": im.group(1), "type": " ".join(im.group(2).split())})
        rec["inverse"] = inv

        # WHERE rules
        wr = []
        mw = re.search(r"^\s*WHERE\s*$(.*?)(?=^\s*END_ENTITY)", body, re.S | re.M | re.I)
        if mw:
            for wm in re.finditer(r"^\s*([A-Za-z0-9_]+)\s*:\s*(.*?);", mw.group(1), re.S | re.M):
                wr.append({"name": wm.group(1), "rule": " ".join(wm.group(2).split())})
        rec["where_rules"] = wr

        entities[name.upper()] = rec

    for name, body in blocks("FUNCTION", "END_FUNCTION"):
        functions[name.upper()] = {"name": name, "express": body}
    for name, body in blocks("RULE", "END_RULE"):
        rules[name.upper()] = {"name": name, "express": body}

    # subtypes reels (par remontee des SUBTYPE OF)
    for e in entities.values():
        e["subtypes"] = []
    for e in entities.values():
        sup = e.get("supertype")
        if sup and sup.upper() in entities:
            entities[sup.upper()]["subtypes"].append(e["name"])
    for e in entities.values():
        e["subtypes"].sort()

    return schema_name, entities, types, functions, rules


# ------------------------------------------------------------------- PSET ---
def parse_spf(path):
    """Parse minimaliste d'un fichier STEP physical file -> {id: (TYPE, [args])}."""
    text = path.read_text(encoding="utf-8", errors="replace")
    data = {}
    for m in re.finditer(r"#(\d+)\s*=\s*([A-Z0-9_]+)\s*\((.*?)\);\s*(?=#|ENDSEC)", text, re.S):
        data[int(m.group(1))] = (m.group(2), split_args(m.group(3)))
    return data


def split_args(s):
    """Decoupe les arguments STEP au niveau 0 de parenthese, en respectant les chaines."""
    out, buf, depth, in_str = [], [], 0, False
    i = 0
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "'":
                if i + 1 < len(s) and s[i + 1] == "'":
                    buf.append("''")
                    i += 2
                    continue
                in_str = False
            buf.append(c)
        else:
            if c == "'":
                in_str = True
                buf.append(c)
            elif c == "(":
                depth += 1
                buf.append(c)
            elif c == ")":
                depth -= 1
                buf.append(c)
            elif c == "," and depth == 0:
                out.append("".join(buf).strip())
                buf = []
            else:
                buf.append(c)
        i += 1
    if buf:
        out.append("".join(buf).strip())
    return out


def unstr(v):
    v = v.strip()
    if v in ("$", "*", ""):
        return None
    if v.startswith("'") and v.endswith("'"):
        return v[1:-1].replace("''", "'").replace("\\X\\", "")
    if v.startswith(".") and v.endswith("."):
        return v[1:-1]
    return v


def refs(v):
    return [int(x) for x in re.findall(r"#(\d+)", v or "")]


def parse_psets(path):
    """Extrait les IfcPropertySetTemplate -> structure exploitable."""
    spf = parse_spf(path)
    psets = {}
    for _id, (typ, args) in spf.items():
        if typ != "IFCPROPERTYSETTEMPLATE":
            continue
        name = unstr(args[2]) if len(args) > 2 else None
        if not name:
            continue
        applicable = unstr(args[5]) if len(args) > 5 else None
        props = []
        for pid in refs(args[6] if len(args) > 6 else ""):
            if pid not in spf:
                continue
            ptyp, pargs = spf[pid]
            if ptyp != "IFCSIMPLEPROPERTYTEMPLATE":
                continue
            props.append(
                {
                    "name": unstr(pargs[2]) if len(pargs) > 2 else None,
                    "description": unstr(pargs[3]) if len(pargs) > 3 else None,
                    "template_type": unstr(pargs[4]) if len(pargs) > 4 else None,
                    "data_type": unstr(pargs[5]) if len(pargs) > 5 else None,
                    "secondary_type": unstr(pargs[6]) if len(pargs) > 6 else None,
                    # arg 7 = Enumerators -> IfcPropertyEnumeration
                    "enum_ref": (refs(pargs[7])[0] if len(pargs) > 7 and refs(pargs[7]) else None),
                }
            )
        # resoudre les enums P_ENUMERATEDVALUE
        for p in props:
            eid = p.pop("enum_ref", None)
            if eid and eid in spf:
                etyp, eargs = spf[eid]
                if etyp == "IFCPROPERTYENUMERATION" and len(eargs) > 1:
                    vals = re.findall(r"IFC[A-Z]+\('(.*?)'\)", eargs[1])
                    if not vals:
                        vals = re.findall(r"'(.*?)'", eargs[1])
                    if vals:
                        p["enum_name"] = unstr(eargs[0])
                        p["enum_values"] = vals
        psets[name.upper()] = {
            "name": name,
            "description": unstr(args[3]) if len(args) > 3 else None,
            "template_type": unstr(args[4]) if len(args) > 4 else None,
            "applicable_entity": applicable,
            "properties": props,
        }
    return psets


# ------------------------------------------------------------------- MAIN ---
def main():
    DATA.mkdir(exist_ok=True)
    summary = {}
    for key, src in SCHEMAS.items():
        exp_path = RAW / src["exp"]
        pset_path = RAW / src["pset"]
        if not exp_path.exists():
            print(f"[!] manquant : {exp_path}", file=sys.stderr)
            continue
        print(f"[*] {key} : parsing {exp_path.name} ...", file=sys.stderr)
        schema_name, entities, types, functions, rules = parse_express(exp_path)

        psets = {}
        if pset_path.exists():
            print(f"[*] {key} : parsing {pset_path.name} ...", file=sys.stderr)
            psets = parse_psets(pset_path)

        # index inverse : entite -> psets applicables
        ent_to_psets = {}
        for pname, p in psets.items():
            for target in re.split(r"[,;]", p.get("applicable_entity") or ""):
                t = target.strip().split("/")[0].upper()
                if t:
                    ent_to_psets.setdefault(t, []).append(p["name"])
        for k in ent_to_psets:
            ent_to_psets[k] = sorted(set(ent_to_psets[k]))

        out = {
            "schema_key": key,
            "schema_name_in_file": schema_name,
            "source_file": src["exp"],
            "pset_source_file": src["pset"] if psets else None,
            "entities": entities,
            "types": types,
            "functions": functions,
            "rules": rules,
            "psets": psets,
            "entity_to_psets": ent_to_psets,
        }
        (DATA / f"{key}.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
        summary[key] = {
            "schema": schema_name,
            "entities": len(entities),
            "types": len(types),
            "functions": len(functions),
            "rules": len(rules),
            "psets": len(psets),
        }
        print(f"    -> {summary[key]}", file=sys.stderr)

    (DATA / "_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
