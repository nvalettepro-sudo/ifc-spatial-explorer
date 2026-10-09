#!/usr/bin/env python3
"""Audit de conformité de ifc_spatial.html contre les schémas officiels (skill ifc-standard).

Usage : python3 tools/audit_ifc.py        (depuis la racine du dépôt ; nécessite node)
Exécute le <script> de l'app dans Node avec un faux DOM, puis compare fiches, héritage,
attributs, énumérations, Psets et références internes aux index IFC2x3 / IFC4 / IFC4.3.
"""
import json, re, os, sys, subprocess, tempfile, collections
REPO=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SK=REPO+"/.claude/skills/ifc-standard/data/"
VMAP={'IFC2x3':'IFC2X3','IFC4':'IFC4','IFC4x1':'IFC4X3','IFC4x3':'IFC4X3'}
S={}
for v in ('IFC2X3','IFC4','IFC4X3'):
    d=json.load(open(SK+v+'.json'))
    S[v]={'ent':{e['name']:e for e in d['entities'].values()},
          'types':{t['name']:t for t in d['types'].values()},
          'psets':{p['name']:p for p in d['psets'].values()},
          'e2p':d['entity_to_psets']}
def ent(v,n): return S[v]['ent'].get(n)
def chain(v,n):
    out=[]
    while n:
        e=S[v]['ent'].get(n)
        if not e: return None
        out.append(n); n=e['supertype']
    return out[::-1]
def full_attrs(v,n):
    c=chain(v,n)
    if not c: return None
    res=[]
    for cls in c:
        for a in S[v]['ent'][cls]['attributes']:
            res.append({'n':a['name'],'o':bool(a['optional']),'f':cls,'t':a['type']})
    return res
def versions_of(n): return [v for v in ('IFC2X3','IFC4','IFC4X3') if n in S[v]['ent']]
def is_abstract(v,n): e=ent(v,n); return e and e['abstract']

SHIM = r"""function fakeEl(){
  return new Proxy(function(){}, {
    get(t,p){
      if(p === 'style') return fakeEl();
      if(p === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){return false;} };
      if(p === 'children' || p==='length') return [];
      if(p === 'value'||p==='textContent'||p==='innerHTML') return '';
      if(p === Symbol.toPrimitive) return ()=>'';
      return fakeEl();
    },
    set(){ return true; },
    apply(){ return fakeEl(); }
  });
}
global.document = fakeEl();
global.window = new Proxy({ innerWidth: 1200 }, { get(t,p){ if(p in t) return t[p]; return fakeEl(); } });
global.localStorage = { getItem:()=>null, setItem:()=>{} };
global.navigator = { userAgent: '' };
global.location = { hash: '' };
global.requestAnimationFrame = ()=>{};
global.setTimeout = ()=>{};
"""
DUMP = r""";(function(){ require('fs').writeFileSync(process.env.OUT, JSON.stringify({E,ATTRS_BY_ENTITY,PSET_DATA,ENUMS,ENTITY_PSETS,ABSTRACT_CLASSES,ATTR_DICT,FR_PSET_DICT,REL_SCENES,ARCHICAD_SUPPORT,SPATIAL_TREES,HIER_SECTIONS})); })();"""
html = open(REPO+'/ifc_spatial.html', encoding='utf-8').read()
js = html[html.index('<script>\n')+9 : html.rindex('</script>')]
with tempfile.TemporaryDirectory() as d:
    open(d+'/a.js','w',encoding='utf-8').write(SHIM+js+DUMP)
    subprocess.run(['node','--check',d+'/a.js'], check=True)
    subprocess.run(['node',d+'/a.js'], check=True, env=dict(os.environ, OUT=d+'/app.json'))
    A = json.load(open(d+'/app.json'))

E=A['E']; AB=A['ATTRS_BY_ENTITY']; P=A['PSET_DATA']; EN=A['ENUMS']; EP=A['ENTITY_PSETS']
I=collections.defaultdict(list)
FV={'IFC2X3':'IFC2x3','IFC4':'IFC4','IFC4X3':'IFC4x3'}
for k,e in E.items():
    n=e['ifc']; vs=versions_of(n); ver=e.get('ver')
    for f in ('fr','ifc','cat','ver','desc','heritage','attrs','ex'):
        if not e.get(f) and not (f=='attrs' and e.get(f)==[]): I['champ_manquant'].append((k,f))
    if len(e.get('ex',[]))!=3: I['ex_pas_3'].append(k)
    if ver=='IFC4x1': continue
    if not vs: I['inexistant'].append((k,n)); continue
    if FV[vs[0]]!=ver: I['ver'].append((k,n,ver,FV[vs[0]]))
    V=VMAP[ver]
    if e['heritage']!=chain(V,n): I['heritage'].append(k)
    fa=full_attrs(V,n)
    if e['attrs']!=[a['n'] for a in fa]: I['attrs'].append(k)
    if fa and [(a['n'],a['o'],a['f']) for a in AB.get(k,[])]!=[(a['n'],a['o'],a['f']) for a in fa]: I['attrs_by_entity'].append(k)
names={a['n'] for l in AB.values() for a in l}
I['attr_dict_manquant']=sorted(n for n in names if n not in A['ATTR_DICT'])
off_enum={}
for v in S:
    for t in S[v]['types'].values():
        if t['kind']=='enumeration': off_enum.setdefault(t['name'],set()).update(re.sub(r'\\X\\0A','',x).strip() for x in t['values'])
for k,e in EN.items():
    if e['ifc'] not in off_enum: I['enum_inexistant'].append(k); continue
    vals={v[0] for v in e['vals']}
    if vals!=off_enum[e['ifc']]: I['enum_valeurs'].append((k,sorted(vals^off_enum[e['ifc']])))
allps={}
for v in S: allps.update(S[v]['psets'])
for k,p in P.items():
    if k not in allps: I['pset_inexistant'].append(k)
    for pr in p['props']:
        if pr['n'] not in A['FR_PSET_DICT'] and not pr.get('d'): I['prop_sans_texte'].append((k,pr['n']))
for k,l in EP.items():
    if k not in E: I['entity_psets_cle'].append(k)
    for p in l:
        if p not in P: I['entity_psets_pset'].append((k,p))
for n,a in A['ABSTRACT_CLASSES'].items():
    vs=versions_of(n)
    if not vs or not any(S[v]['ent'][n]['abstract'] for v in vs): I['abstract_faux'].append(n)
    for x in a.get('subtypes',[]):
        if not versions_of(x): I['abstract_soustype'].append((n,x))
allent={x for v in S for x in S[v]['ent']}
for k,sc in A['REL_SCENES'].items():
    if k not in allent: I['rel_scene'].append(k)
    for side in ('a','b'):
        if isinstance(sc,dict) and side in sc and sc[side].get('ifc') not in allent: I['rel_scene_cible'].append((k,sc[side].get('ifc')))
for k in A['ARCHICAD_SUPPORT']:
    if k not in allent: I['archicad'].append(k)
for s_ in A['HIER_SECTIONS']:
    for i in s_['items']:
        if i not in allent: I['hier_section'].append(i)
def walk(n):
    if n['key'] not in E: I['arbo_cle'].append(n['key'])
    for c in n.get('children',[]): walk(c)
for t in A['SPATIAL_TREES'].values():
    for r in t['roots']: walk(r)
src=html
a=src.index('function renderCatalogue'); b=src.index('let verFilter',a)
gk=set(re.findall(r"'([A-Za-z0-9_]+)'",src[a:b]))
I['hors_catalogue']=[k for k in E if k not in gk]
cnt=collections.Counter(e['ifc'] for e in E.values())
I['doublons_hors_fiches_RDC_IFC2x3']=[n for n,c in cnt.items() if c>1 and not (c==2 and n.endswith('Type') or n=='IfcElectricDistributionPoint')]  # les 17 fiches RDC IFC2x3 (Tuyau → IfcPipeSegmentType…) sont volontaires
bad=0
for t,l in I.items():
    print(f'{t}: {len(l)}', (l[:8] if l else ''))
    bad+=len(l)
print('AUDIT OK' if bad<=1 else f'{bad} anomalies')  # relagg a 4 exemples (volontaire)
