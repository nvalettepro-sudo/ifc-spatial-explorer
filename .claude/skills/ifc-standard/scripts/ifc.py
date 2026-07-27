#!/usr/bin/env python3
"""
ifc.py — Interrogation du schema IFC (2x3 / 4 / 4.3) et des Property Sets.

Toutes les sorties proviennent directement des fichiers normatifs buildingSMART.
Aucune donnee n'est generee ou interpretee : ce qui est affiche est ce qui est
ecrit dans le schema EXPRESS ou dans les templates de Pset officiels.

Usage :
  ifc.py entity  IfcWall            [-s 4X3] [--express]
  ifc.py type    IfcWallTypeEnum    [-s 4X3]
  ifc.py pset    Pset_WallCommon    [-s 4X3]
  ifc.py psets   IfcWall            [-s 4X3]
  ifc.py tree    IfcWall            [-s 4X3] [--depth 3]
  ifc.py attrs   IfcWall            [-s 4X3]        # attributs herites inclus
  ifc.py search  wall               [-s all]
  ifc.py diff    IfcWall                            # comparaison 2x3 / 4 / 4.3
  ifc.py list    entities|types|enums|psets [-s 4X3] [--filter Ifc]
  ifc.py schemas

Schemas : 2X3 | 4 | 4X3 | all   (defaut : 4X3 pour la consultation,
                                 all pour search / diff)
"""
import argparse
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

ALIASES = {
    "2X3": "IFC2X3", "IFC2X3": "IFC2X3", "2x3": "IFC2X3", "IFC2x3": "IFC2X3",
    "4": "IFC4", "IFC4": "IFC4",
    "4X3": "IFC4X3", "IFC4X3": "IFC4X3", "4.3": "IFC4X3", "IFC4.3": "IFC4X3",
}
ORDER = ["IFC2X3", "IFC4", "IFC4X3"]
_cache = {}


def load(key):
    if key not in _cache:
        p = DATA / f"{key}.json"
        if not p.exists():
            sys.exit(f"Index absent : {p}. Lancer scripts/build_index.py.")
        _cache[key] = json.loads(p.read_text(encoding="utf-8"))
    return _cache[key]


def resolve(s, default="IFC4X3"):
    if s is None:
        return [default]
    if s.lower() == "all":
        return list(ORDER)
    k = ALIASES.get(s) or ALIASES.get(s.upper())
    if not k:
        sys.exit(f"Schema inconnu : {s}. Valeurs : 2X3, 4, 4X3, all")
    return [k]


def label(key):
    d = load(key)
    return f"{key} ({d['schema_name_in_file']})"


def where_present(name, kind="entities"):
    return [k for k in ORDER if name.upper() in load(k)[kind]]


# ------------------------------------------------------------------ output ---
def h(title):
    print(f"\n=== {title} ===")


def cmd_entity(a):
    for key in resolve(a.schema):
        d = load(key)
        e = d["entities"].get(a.name.upper())
        if not e:
            t = d["types"].get(a.name.upper())
            if t:
                print(f"[{key}] '{e or a.name}' n'est pas une ENTITY mais un TYPE. "
                      f"Utiliser : ifc.py type {a.name} -s {a.schema or '4X3'}")
            else:
                print(f"[{key}] introuvable : {a.name}")
                near = [x["name"] for x in d["entities"].values()
                        if a.name.lower() in x["name"].lower()][:8]
                if near:
                    print("  proches :", ", ".join(near))
            continue

        h(f"{e['name']} — {label(key)}")
        print(f"Abstrait          : {'oui' if e['abstract'] else 'non'}")
        print(f"Supertype         : {e['supertype'] or '(aucun — racine)'}")
        print(f"Sous-types directs: {len(e['subtypes'])}"
              + (f" — {', '.join(e['subtypes'][:12])}" if e["subtypes"] else ""))
        if len(e["subtypes"]) > 12:
            print(f"                    (... {len(e['subtypes']) - 12} autres, voir `tree`)")

        if e["attributes"]:
            h("Attributs directs")
            for at in e["attributes"]:
                flag = "OPTIONAL " if at["optional"] else ""
                print(f"  {at['name']:<28} : {flag}{at['type']}")
        if e["inverse"]:
            h("Attributs INVERSE")
            for at in e["inverse"]:
                print(f"  {at['name']:<28} : {at['type']}")
        if e["where_rules"]:
            h("Regles WHERE")
            for w in e["where_rules"]:
                print(f"  {w['name']} : {w['rule']}")

        ps = d["entity_to_psets"].get(e["name"].upper(), [])
        if ps:
            h(f"Property Sets applicables ({len(ps)})")
            print("  " + ", ".join(ps))

        if a.express:
            h("Source EXPRESS (verbatim)")
            print(e["express"])

        others = [k for k in where_present(a.name) if k != key]
        print(f"\nPresent aussi dans : {', '.join(others) if others else '(cette version seulement)'}")


def cmd_type(a):
    for key in resolve(a.schema):
        d = load(key)
        t = d["types"].get(a.name.upper())
        if not t:
            print(f"[{key}] introuvable : {a.name}")
            near = [x["name"] for x in d["types"].values()
                    if a.name.lower() in x["name"].lower()][:8]
            if near:
                print("  proches :", ", ".join(near))
            continue
        h(f"{t['name']} — {label(key)}  [{t['kind'].upper()}]")
        if t["kind"] == "enumeration":
            print(f"{len(t['values'])} valeurs :")
            for v in t["values"]:
                print(f"  {v}")
        elif t["kind"] == "select":
            print(f"{len(t['values'])} types selectionnables :")
            for v in t["values"]:
                print(f"  {v}")
        else:
            print(f"Type sous-jacent : {t.get('underlying')}")
        if a.express:
            h("Source EXPRESS (verbatim)")
            print(t["express"])
        others = [k for k in where_present(a.name, "types") if k != key]
        print(f"\nPresent aussi dans : {', '.join(others) if others else '(cette version seulement)'}")


def cmd_pset(a):
    for key in resolve(a.schema):
        d = load(key)
        p = d["psets"].get(a.name.upper())
        if not p:
            print(f"[{key}] introuvable : {a.name}")
            near = [x["name"] for x in d["psets"].values()
                    if a.name.lower() in x["name"].lower()][:10]
            if near:
                print("  proches :", ", ".join(near))
            continue
        h(f"{p['name']} — {label(key)}")
        print(f"Type       : {p['template_type']}")
        print(f"S'applique : {p['applicable_entity']}")
        if p["description"]:
            print(f"Definition : {p['description']}")
        h(f"Proprietes ({len(p['properties'])})")
        for pr in p["properties"]:
            print(f"  {pr['name']:<32} {pr['template_type'] or '':<22} {pr['data_type'] or ''}")
            if pr.get("enum_values"):
                print(f"      valeurs : {', '.join(pr['enum_values'])}")
            if a.verbose and pr.get("description"):
                print(f"      {pr['description']}")
        others = [k for k in ORDER if a.name.upper() in load(k)["psets"] and k != key]
        print(f"\nPresent aussi dans : {', '.join(others) if others else '(cette version seulement)'}")


def cmd_psets(a):
    for key in resolve(a.schema):
        d = load(key)
        ent = a.name.upper()
        direct = d["entity_to_psets"].get(ent, [])
        # heritage : psets declares sur les supertypes
        inherited = {}
        cur = d["entities"].get(ent, {}).get("supertype")
        while cur:
            got = d["entity_to_psets"].get(cur.upper(), [])
            if got:
                inherited[cur] = got
            cur = d["entities"].get(cur.upper(), {}).get("supertype")
        h(f"Psets pour {a.name} — {label(key)}")
        print(f"Directs ({len(direct)}) :")
        for x in direct:
            print(f"  {x}")
        if not direct:
            print("  (aucun declare directement)")
        for sup, lst in inherited.items():
            print(f"\nHerites de {sup} ({len(lst)}) :")
            for x in lst:
                print(f"  {x}")


def cmd_tree(a):
    for key in resolve(a.schema):
        d = load(key)
        ent = d["entities"].get(a.name.upper())
        if not ent:
            print(f"[{key}] introuvable : {a.name}")
            continue
        chain = []
        cur = ent
        while cur:
            chain.append(cur["name"])
            sup = cur.get("supertype")
            cur = d["entities"].get(sup.upper()) if sup else None
        h(f"Hierarchie de {ent['name']} — {label(key)}")
        for i, n in enumerate(reversed(chain)):
            print("  " * i + ("+- " if i else "") + n)
        base = len(chain)

        def walk(name, depth, indent):
            if depth <= 0:
                return
            e = d["entities"].get(name.upper())
            if not e:
                return
            for s in e["subtypes"]:
                print("  " * indent + "+- " + s)
                walk(s, depth - 1, indent + 1)

        if ent["subtypes"]:
            print(f"\nSous-types (profondeur {a.depth}) :")
            walk(ent["name"], a.depth, base)


def cmd_attrs(a):
    for key in resolve(a.schema):
        d = load(key)
        ent = d["entities"].get(a.name.upper())
        if not ent:
            print(f"[{key}] introuvable : {a.name}")
            continue
        chain = []
        cur = ent
        while cur:
            chain.append(cur)
            sup = cur.get("supertype")
            cur = d["entities"].get(sup.upper()) if sup else None
        h(f"Attributs complets de {ent['name']} (ordre STEP) — {label(key)}")
        idx = 1
        for e in reversed(chain):
            for at in e["attributes"]:
                flag = "OPT " if at["optional"] else "    "
                print(f"  {idx:>2}. {flag}{at['name']:<28} {at['type']:<40} <- {e['name']}")
                idx += 1
        inv = [(e["name"], x) for e in reversed(chain) for x in e["inverse"]]
        if inv:
            h("INVERSE (herites inclus)")
            for owner, x in inv:
                print(f"  {x['name']:<28} {x['type']:<45} <- {owner}")


def cmd_search(a):
    term = a.term.lower()
    rx = re.compile(a.term, re.I) if a.regex else None

    def hit(s):
        return rx.search(s) if rx else term in s.lower()

    for key in resolve(a.schema, default=None) if a.schema else ORDER:
        d = load(key)
        ents = sorted(x["name"] for x in d["entities"].values() if hit(x["name"]))
        typs = sorted(x["name"] for x in d["types"].values() if hit(x["name"]))
        pss = sorted(x["name"] for x in d["psets"].values() if hit(x["name"]))
        props = sorted({f"{p['name']}.{pr['name']}"
                        for p in d["psets"].values() for pr in p["properties"]
                        if pr["name"] and hit(pr["name"])})
        h(f"'{a.term}' dans {label(key)}")
        for lbl, lst in (("Entites", ents), ("Types", typs),
                         ("Psets", pss), ("Proprietes", props)):
            if lst:
                shown = lst[: a.limit]
                print(f"{lbl} ({len(lst)}) : {', '.join(shown)}"
                      + (f" ... +{len(lst)-len(shown)}" if len(lst) > len(shown) else ""))
        if not (ents or typs or pss or props):
            print("(aucun resultat)")


def cmd_diff(a):
    n = a.name.upper()
    h(f"{a.name} — comparaison inter-versions")
    kind = None
    for key in ORDER:
        d = load(key)
        if n in d["entities"]:
            kind = "entity"
        elif n in d["types"] and kind is None:
            kind = "type"
        elif n in d["psets"] and kind is None:
            kind = "pset"

    for key in ORDER:
        d = load(key)
        if kind == "entity" and n in d["entities"]:
            e = d["entities"][n]
            print(f"\n[{key}] PRESENT — supertype {e['supertype']}, "
                  f"{len(e['attributes'])} attr. directs, "
                  f"{len(e['subtypes'])} sous-types, "
                  f"{len(e['where_rules'])} regles WHERE")
            for at in e["attributes"]:
                print(f"     {'OPT ' if at['optional'] else '    '}{at['name']:<26} {at['type']}")
        elif kind == "type" and n in d["types"]:
            t = d["types"][n]
            print(f"\n[{key}] PRESENT — {t['kind']}"
                  + (f", {len(t['values'])} valeurs" if t.get("values") else ""))
            if t.get("values"):
                print("     " + ", ".join(t["values"]))
            elif t.get("underlying"):
                print(f"     = {t['underlying']}")
        elif kind == "pset" and n in d["psets"]:
            p = d["psets"][n]
            print(f"\n[{key}] PRESENT — s'applique a {p['applicable_entity']}, "
                  f"{len(p['properties'])} proprietes")
            print("     " + ", ".join(x["name"] for x in p["properties"] if x["name"]))
        else:
            print(f"\n[{key}] ABSENT")

    if kind in ("entity", "type"):
        sets = {}
        for key in ORDER:
            d = load(key)
            if kind == "entity" and n in d["entities"]:
                sets[key] = {x["name"] for x in d["entities"][n]["attributes"]}
            elif kind == "type" and n in d["types"]:
                sets[key] = set(d["types"][n].get("values") or [])
        keys = [k for k in ORDER if k in sets]
        for i in range(len(keys) - 1):
            a_, b_ = keys[i], keys[i + 1]
            added, removed = sets[b_] - sets[a_], sets[a_] - sets[b_]
            if added or removed:
                print(f"\nDelta {a_} -> {b_}")
                if added:
                    print("  + " + ", ".join(sorted(added)))
                if removed:
                    print("  - " + ", ".join(sorted(removed)))


def cmd_list(a):
    for key in resolve(a.schema):
        d = load(key)
        if a.kind == "entities":
            items = sorted(x["name"] for x in d["entities"].values())
        elif a.kind == "types":
            items = sorted(x["name"] for x in d["types"].values())
        elif a.kind == "enums":
            items = sorted(x["name"] for x in d["types"].values() if x["kind"] == "enumeration")
        elif a.kind == "psets":
            items = sorted(x["name"] for x in d["psets"].values())
        else:
            sys.exit("kind : entities|types|enums|psets")
        if a.filter:
            items = [x for x in items if a.filter.lower() in x.lower()]
        h(f"{a.kind} — {label(key)} ({len(items)})")
        for x in items:
            print(x)


def cmd_schemas(a):
    s = json.loads((DATA / "_summary.json").read_text())
    h("Schemas indexes")
    for k, v in s.items():
        print(f"{k:<8} {v['schema']:<24} entites {v['entities']:>4} | types {v['types']:>4} | "
              f"fonctions {v['functions']:>3} | psets {v['psets']:>4}")


# -------------------------------------------------------------------- CLI ---
def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    def add(name, fn, needs_name=True):
        sp = sub.add_parser(name)
        if needs_name:
            sp.add_argument("name")
        sp.add_argument("-s", "--schema", default=None)
        sp.set_defaults(func=fn)
        return sp

    sp = add("entity", cmd_entity); sp.add_argument("--express", action="store_true")
    sp = add("type", cmd_type); sp.add_argument("--express", action="store_true")
    sp = add("pset", cmd_pset); sp.add_argument("-v", "--verbose", action="store_true")
    add("psets", cmd_psets)
    sp = add("tree", cmd_tree); sp.add_argument("--depth", type=int, default=2)
    add("attrs", cmd_attrs)

    sp = sub.add_parser("search"); sp.add_argument("term")
    sp.add_argument("-s", "--schema", default=None)
    sp.add_argument("--regex", action="store_true")
    sp.add_argument("--limit", type=int, default=40)
    sp.set_defaults(func=cmd_search)

    sp = sub.add_parser("diff"); sp.add_argument("name"); sp.set_defaults(func=cmd_diff)

    sp = sub.add_parser("list"); sp.add_argument("kind")
    sp.add_argument("-s", "--schema", default=None)
    sp.add_argument("--filter", default=None)
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("schemas"); sp.set_defaults(func=cmd_schemas)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
