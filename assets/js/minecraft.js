/**
 * MineGuide — minecraft.js v5
 * Moteur biomes Java Edition 1.16–1.21.4
 * ValueNoise avec MurmurHash3 pour seeding rapide
 */
"use strict";

/* ────── Java LCG (structures uniquement) ────── */
function jrSeed(s){return(BigInt(s)^0x5DEECE66Dn)&((1n<<48n)-1n);}
function jrNext(s){return(s*0x5DEECE66Dn+0xBn)&((1n<<48n)-1n);}
function jrInt(s,n){let b,v,ns=s;do{ns=jrNext(ns);b=Number(ns>>17n);v=b%n;}while(b-v+(n-1)<0);return[ns,v];}

/* ────── MurmurHash3 fmix32 — seed mixing ultra-rapide ────── */
function fmix(h){h=Math.imul(h^(h>>>16),0x85ebca6b)|0;h=Math.imul(h^(h>>>13),0xc2b2ae35)|0;return h^(h>>>16);}

/* ────── Value Noise 2D seédé par MurmurHash3 ────── */
class ValueNoise{
  constructor(seed){
    const s=fmix(seed|0);
    this.p=new Uint8Array(512);
    // Génère la table de permutation avec LCG simple (entiers 32-bit)
    let r=fmix(s);
    const perm=new Uint8Array(256);
    for(let i=0;i<256;i++)perm[i]=i;
    for(let i=255;i>0;i--){r=Math.imul(r,1664525)+1013904223|0;const j=((r>>>1)%(i+1)+i+1)%(i+1);const t=perm[i];perm[i]=perm[j];perm[j]=t;}
    for(let i=0;i<256;i++)this.p[i]=this.p[i+256]=perm[i];
    // Table de valeurs aléatoires [0,1]
    this.v=new Float32Array(512);
    r=fmix(s^0xDEADBEEF);
    for(let i=0;i<256;i++){r=Math.imul(r,1664525)+1013904223|0;this.v[i]=this.v[i+256]=((r>>>1)&0x7FFFFF)/8388607;}
  }
  _f(t){return t*t*t*(t*(t*6-15)+10);}
  _r(x,y){
    const X=Math.floor(x)&255,Y=Math.floor(y)&255;
    const xf=x-Math.floor(x),yf=y-Math.floor(y);
    const u=this._f(xf),v=this._f(yf);
    const p=this.p,val=this.v;
    const aa=val[p[p[X]+Y]],ba=val[p[p[(X+1)&255]+Y]];
    const ab=val[p[p[X]+((Y+1)&255)]],bb=val[p[p[(X+1)&255]+((Y+1)&255)]];
    return aa+u*(ba-aa)+v*(ab+u*(bb-ab));
  }
  fbm(x,y,oct,lac,per){
    let v=0,a=1,f=1,m=0;
    for(let o=0;o<oct;o++){v+=this._r(x*f,y*f)*a;m+=a;a*=per;f*=lac;}
    return(v/m)*2-1;
  }
}

const CT={T0:-0.45,T1:-0.15,T2:0.2,T3:0.55};
const CH={H0:-0.35,H1:-0.1,H2:0.1,H3:0.3};
const CC={DEEP:-0.45,OCEAN:-0.19,COAST:-0.11,NEAR:0.03,INLAND:0.3};
const CE={E0:-0.78,E1:-0.375,E2:-0.22,E3:0.05,E4:0.45};
function TI(t){return t<CT.T0?0:t<CT.T1?1:t<CT.T2?2:t<CT.T3?3:4;}
function HI(h){return h<CH.H0?0:h<CH.H1?1:h<CH.H2?2:h<CH.H3?3:4;}

const BM=[
  ['snowy_plains','snowy_plains','snowy_plains','snowy_taiga','taiga'],
  ['plains','plains','forest','taiga','old_growth_spruce_taiga'],
  ['sunflower_plains','flower_forest','forest','birch_forest','dark_forest'],
  ['savanna','savanna','forest','jungle','jungle'],
  ['desert','desert','savanna','jungle','bamboo_jungle'],
];
const BH=[
  ['snowy_plains','snowy_plains','snowy_plains','snowy_taiga','taiga'],
  ['plains','plains','forest','taiga','taiga'],
  ['flower_forest','plains','forest','birch_forest','dark_forest'],
  ['savanna_plateau','savanna_plateau','forest','forest','jungle'],
  ['badlands','badlands','wooded_badlands','wooded_badlands','bamboo_jungle'],
];
const BE=[
  ['snowy_plains','snowy_plains','snowy_plains','snowy_taiga','taiga'],
  ['plains','plains','plains','taiga','taiga'],
  ['plains','plains','plains','old_growth_birch_forest','old_growth_birch_forest'],
  ['savanna','savanna','plains','jungle','jungle'],
  ['desert','desert','desert','desert','jungle'],
];
const BV=[
  ['ice_spikes','snowy_plains','snowy_plains','snowy_taiga','old_growth_pine_taiga'],
  ['plains','plains','plains','old_growth_pine_taiga','old_growth_spruce_taiga'],
  ['plains','flower_forest','forest','old_growth_birch_forest','old_growth_birch_forest'],
  ['savanna','savanna','jungle','jungle','sparse_jungle'],
  ['desert','desert','desert','wooded_badlands','eroded_badlands'],
];

function biome18(temp,hum,cont,eros,weird,rv,version){
  const T=TI(temp),H=HI(hum);
  const cherry=version>='1.20';
  const mang=version>='1.19';
  if(Math.abs(rv)<0.016)return temp<CT.T0?'frozen_river':'river';
  if(cont<CC.DEEP){
    if(temp<CT.T0)return'deep_frozen_ocean';if(temp<CT.T1)return'deep_cold_ocean';
    if(temp>CT.T3)return'deep_lukewarm_ocean';return'deep_ocean';
  }
  if(cont<CC.OCEAN){
    if(temp<CT.T0)return'frozen_ocean';if(temp<CT.T1)return'cold_ocean';
    if(temp>CT.T3)return'warm_ocean';if(temp>CT.T2)return'lukewarm_ocean';return'ocean';
  }
  if(cont<CC.COAST){
    if(temp<CT.T0)return'snowy_beach';if(eros>CE.E4)return'stony_shore';return'beach';
  }
  if(cont>CC.INLAND&&eros<CE.E1){
    if(eros<CE.E0){if(temp<CT.T0)return'jagged_peaks';if(temp<CT.T1)return'frozen_peaks';return'stony_peaks';}
    if(temp<CT.T1)return'snowy_slopes';
    if(cherry&&hum>CH.H2&&weird>0.3)return'cherry_grove';
    return hum>CH.H2?'grove':'windswept_hills';
  }
  if(cont>CC.NEAR&&eros<CE.E2&&cont>0.4){
    if(hum>CH.H2)return'windswept_forest';return'windswept_hills';
  }
  if(eros>CE.E4&&cont>CC.NEAR&&temp>CT.T0&&temp<CT.T3){
    if(cherry&&hum>CH.H2&&weird>0.2)return'cherry_grove';return'meadow';
  }
  if(temp>CT.T3&&hum<CH.H0){
    if(weird>0.4)return'eroded_badlands';if(eros<CE.E2)return'wooded_badlands';return'badlands';
  }
  if(hum>CH.H3&&temp>CT.T0&&temp<CT.T3&&eros>CE.E3){
    return(mang&&temp>CT.T2)?'mangrove_swamp':'swamp';
  }
  if(hum>CH.H3&&temp>CT.T0&&temp<CT.T3&&eros>CE.E2&&weird<-0.3)return'dark_forest';
  if(eros>CE.E4)return BE[T][H];
  if(eros>CE.E3)return(weird>0.4?BV:BM)[T][H];
  if(eros>CE.E2)return BM[T][H];
  return BH[T][H];
}

function makeNewBiomeGen(worldSeed,version){
  const ws=fmix(worldSeed|0);
  const nT=new ValueNoise(fmix(ws^0x1A2B3C)),nH=new ValueNoise(fmix(ws^0x4D5E6F));
  const nC=new ValueNoise(fmix(ws^0x7A8B9C)),nE=new ValueNoise(fmix(ws^0xD1E2F3));
  const nW=new ValueNoise(fmix(ws^0x456789)),nR=new ValueNoise(fmix(ws^0xABCDEF));
  return function(wx,wz){
    const temp =nT.fbm(wx/2500,wz/2500,3,2,0.5);
    const hum  =nH.fbm(wx/1600,wz/1600,3,2,0.5);
    const cont =nC.fbm(wx/5500,wz/5500,4,2,0.48);
    const eros =nE.fbm(wx/2200,wz/2200,3,2,0.5);
    const weird=nW.fbm(wx/900, wz/900, 3,2,0.5);
    const rv   =nR.fbm(wx/280, wz/280, 3,2,0.5);
    return biome18(temp,hum,cont,eros,weird,rv,version);
  };
}

function makeLegacyBiomeGen(worldSeed){
  const ws=fmix(worldSeed|0);
  const nC=new ValueNoise(fmix(ws^0xA1B2C3)),nT=new ValueNoise(fmix(ws^0x1F2E3D));
  const nR=new ValueNoise(fmix(ws^0x5A6B7C)),nH=new ValueNoise(fmix(ws^0xC9D8E7));
  const nRv=new ValueNoise(fmix(ws^0x112233)),nV=new ValueNoise(fmix(ws^0x99AABB));
  const LAND=[['snowy_plains','snowy_taiga'],['plains','taiga'],['forest','forest'],['savanna','jungle'],['desert','desert']];
  const HILLS=[['snowy_plains','snowy_taiga'],['gravelly_mountains','old_growth_spruce_taiga'],['wooded_mountains','birch_forest'],['savanna_plateau','bamboo_jungle'],['badlands','wooded_badlands']];
  return function(wx,wz){
    const cont=nC.fbm(wx/5200,wz/5200,4,2,0.48),temp=nT.fbm(wx/3100,wz/3100,3,2,0.5);
    const rain=nR.fbm(wx/2600,wz/2600,3,2,0.5),hill=nH.fbm(wx/850,wz/850,3,2,0.45);
    const rv=nRv.fbm(wx/270,wz/270,3,2,0.5),vari=nV.fbm(wx/210,wz/210,2,2,0.5);
    if(cont<-0.10){
      const d=cont<-0.40;
      if(temp<-0.70)return d?'deep_frozen_ocean':'frozen_ocean';
      if(temp<-0.20)return d?'deep_cold_ocean':'cold_ocean';
      if(temp>0.60)return d?'deep_lukewarm_ocean':'lukewarm_ocean';
      if(temp>0.80)return d?'deep_lukewarm_ocean':'warm_ocean';
      return d?'deep_ocean':'ocean';
    }
    if(cont<0.0){if(temp<-0.70)return'snowy_beach';if(hill>0.44)return'stony_shore';return'beach';}
    if(Math.abs(rv)<0.022)return temp<-0.64?'frozen_river':'river';
    if(cont>0.50&&hill>0.76&&temp>-0.20&&temp<0.30)return'mushroom_fields';
    if(vari>0.50&&temp>-0.10&&temp<0.20&&rain>0.20)return'flower_forest';
    const ti=Math.min(4,Math.floor((temp+1)*2.5)),ri=rain>0?1:0;
    if(hill>0.46)return HILLS[ti][ri];
    return LAND[ti][ri];
  };
}

const BIOME_COLOR={
  ocean:[9,9,45],deep_ocean:[0,0,32],frozen_ocean:[112,113,214],deep_frozen_ocean:[64,64,144],
  cold_ocean:[32,32,112],deep_cold_ocean:[32,32,56],lukewarm_ocean:[0,64,144],
  deep_lukewarm_ocean:[0,64,80],warm_ocean:[0,120,172],
  river:[0,0,112],frozen_river:[160,160,255],
  beach:[250,222,85],snowy_beach:[250,240,192],stony_shore:[162,162,132],
  plains:[141,179,96],sunflower_plains:[180,200,80],snowy_plains:[255,255,255],
  ice_spikes:[180,220,220],desert:[250,148,24],
  forest:[5,102,33],flower_forest:[20,138,80],birch_forest:[48,116,68],
  old_growth_birch_forest:[48,116,68],dark_forest:[64,81,26],
  jungle:[83,123,9],bamboo_jungle:[118,142,20],sparse_jungle:[98,139,23],
  taiga:[11,102,89],snowy_taiga:[49,85,74],old_growth_spruce_taiga:[13,76,63],
  old_growth_pine_taiga:[13,76,63],swamp:[7,249,178],mangrove_swamp:[44,180,130],
  savanna:[189,178,95],savanna_plateau:[167,157,100],windswept_savanna:[189,178,95],
  badlands:[217,69,21],eroded_badlands:[255,109,61],wooded_badlands:[176,151,56],
  mountains:[89,125,114],wooded_mountains:[80,112,80],gravelly_mountains:[136,136,136],
  meadow:[44,66,5],cherry_grove:[255,142,199],grove:[95,128,64],
  snowy_slopes:[192,216,255],frozen_peaks:[180,220,220],jagged_peaks:[220,220,220],
  stony_peaks:[184,184,160],windswept_hills:[89,125,114],windswept_forest:[80,112,80],
  windswept_gravelly_hills:[136,136,136],mushroom_fields:[255,0,255],
  deep_dark:[18,22,28],lush_caves:[60,150,60],dripstone_caves:[140,110,80],
};
function getBiomeColor(b){return BIOME_COLOR[b]||[128,128,128];}

const BIOME_FR={
  ocean:'Océan',deep_ocean:'Océan profond',frozen_ocean:'Océan gelé',
  deep_frozen_ocean:'Océan gelé profond',cold_ocean:'Océan froid',
  deep_cold_ocean:'Océan froid profond',lukewarm_ocean:'Océan tiède',
  deep_lukewarm_ocean:'Océan tiède profond',warm_ocean:'Océan chaud',
  river:'Rivière',frozen_river:'Rivière gelée',
  beach:'Plage',snowy_beach:'Plage enneigée',stony_shore:'Rivage rocheux',
  plains:'Plaines',sunflower_plains:'Plaines tournesols',snowy_plains:'Plaines enneigées',
  ice_spikes:'Pics de glace',desert:'Désert',
  forest:'Forêt',flower_forest:'Forêt fleurie',birch_forest:'Forêt de bouleaux',
  old_growth_birch_forest:'Grande forêt de bouleaux',dark_forest:'Forêt sombre',
  jungle:'Jungle',bamboo_jungle:'Jungle bambous',sparse_jungle:'Jungle clairsemée',
  taiga:'Taïga',snowy_taiga:'Taïga enneigée',old_growth_spruce_taiga:'Grande taïga épicéas',
  old_growth_pine_taiga:'Grande taïga pins',swamp:'Marais',mangrove_swamp:'Marais de mangroves',
  savanna:'Savane',savanna_plateau:'Plateau de savane',windswept_savanna:'Savane venteuse',
  badlands:'Badlands',eroded_badlands:'Badlands érodées',wooded_badlands:'Badlands boisées',
  mountains:'Montagnes',wooded_mountains:'Montagnes boisées',gravelly_mountains:'Montagnes graveleuses',
  meadow:'Prairie',cherry_grove:'Bosquet de cerisiers',grove:'Bosquet',
  snowy_slopes:'Pentes enneigées',frozen_peaks:'Sommets gelés',
  jagged_peaks:'Sommets déchiquetés',stony_peaks:'Sommets rocheux',
  windswept_hills:'Collines venteuses',windswept_forest:'Forêt venteuse',
  windswept_gravelly_hills:'Collines graveleuses venteuses',
  mushroom_fields:'Champs champignons',deep_dark:'Sombre Profondeur',
  lush_caves:'Grottes luxuriantes',dripstone_caves:'Grottes stalactites',
};
function getBiomeFR(b){return BIOME_FR[b]||b;}

const SC={};
SC['1.16']=[
  {id:'village',name:'Village',icon:'🏘',color:'#8BC34A',spacing:32,sep:8,salt:10387312n},
  {id:'desert_pyramid',name:'Temple Désert',icon:'🏛',color:'#FFC107',spacing:32,sep:8,salt:14357617n},
  {id:'jungle_temple',name:'Temple Jungle',icon:'🗿',color:'#4CAF50',spacing:32,sep:8,salt:14357619n},
  {id:'witch_hut',name:'Cabane Sorcière',icon:'🧙',color:'#9C27B0',spacing:32,sep:8,salt:14357620n},
  {id:'igloo',name:'Igloo',icon:'🧊',color:'#90CAF9',spacing:32,sep:8,salt:14357618n},
  {id:'monument',name:'Monument Océanique',icon:'🔱',color:'#2196F3',spacing:32,sep:5,salt:10387313n},
  {id:'mansion',name:'Manoir Sylvestre',icon:'🏚',color:'#795548',spacing:80,sep:20,salt:10387319n},
  {id:'outpost',name:'Avant-Poste',icon:'🗼',color:'#FF5722',spacing:32,sep:8,salt:165745296n},
  {id:'ruined_portal',name:'Portail en Ruines',icon:'🟣',color:'#7E57C2',spacing:40,sep:15,salt:34222645n},
  {id:'bastion',name:'Bastion',icon:'🏯',color:'#607D8B',spacing:27,sep:4,salt:30084232n},
  {id:'shipwreck',name:'Épave',icon:'⛵',color:'#8D6E63',spacing:24,sep:4,salt:165745295n},
  {id:'buried_treasure',name:'Trésor Enfoui',icon:'💰',color:'#FFD700',spacing:1,sep:0,salt:10387320n},
  {id:'stronghold',name:'Forteresse',icon:'⚔',color:'#F44336',special:'stronghold'},
];
SC['1.17']=[...SC['1.16']];SC['1.18']=[...SC['1.16']];
SC['1.19']=[...SC['1.18'],{id:'ancient_city',name:'Cité Ancienne',icon:'🏙',color:'#37474F',spacing:24,sep:8,salt:20083232n}];
SC['1.20']=[...SC['1.19'],{id:'trail_ruins',name:'Ruines Anciennes',icon:'🏺',color:'#8D6E63',spacing:16,sep:4,salt:83469867n}];
SC['1.21']=[...SC['1.20'],{id:'trial_chambers',name:"Salles d'Épreuve",icon:'⚗',color:'#00BCD4',spacing:34,sep:12,salt:94251327n}];
['1.21.1','1.21.2','1.21.4'].forEach(v=>SC[v]=SC['1.21']);

function _sp(ws,rx,rz,cfg){
  let s=(BigInt(ws)+BigInt(rx)*341873128712n+BigInt(rz)*132897987541n+cfg.salt)&0xFFFFFFFFFFFFFFFFn;
  s=jrSeed(s);const[s2,ox]=jrInt(s,cfg.spacing-cfg.sep);const[,oz]=jrInt(s2,cfg.spacing-cfg.sep);
  return{x:rx*cfg.spacing*16+ox*16+8,z:rz*cfg.spacing*16+oz*16+8};
}
function _sh(ws,n=3){
  let s=jrSeed(BigInt(ws));s=jrNext(s);
  const a0=((Number(s>>17n)&0x7FFF)/32768)*Math.PI*2;
  return Array.from({length:n},(_,i)=>{s=jrNext(s);const d=1280+(Number(s>>17n)&0x7FFF)%1536,a=a0+(2*Math.PI*i)/n;return{x:Math.round(Math.cos(a)*d),z:Math.round(Math.sin(a)*d)};});
}
function getStructuresInRadius(ws,version,radius=26000){
  const cfgs=SC[version]||SC['1.21'],res={};
  for(const cfg of cfgs){
    if(cfg.special==='stronghold'){res[cfg.id]={cfg,positions:_sh(ws)};continue;}
    const rm=Math.ceil(radius/(cfg.spacing*16))+1,pos=[];
    for(let rx=-rm;rx<=rm;rx++)for(let rz=-rm;rz<=rm;rz++){const p=_sp(ws,rx,rz,cfg);if(Math.hypot(p.x,p.z)<=radius)pos.push(p);}
    res[cfg.id]={cfg,positions:pos};
  }
  return res;
}

function parseSeed(input){
  const t=String(input).trim();if(!t)return null;
  const n=parseInt(t,10);if(!isNaN(n)&&String(n)===t&&Math.abs(n)<=2**53)return n;
  let h=0;for(let i=0;i<t.length;i++)h=(Math.imul(31,h)+t.charCodeAt(i))|0;return h;
}
function isNewGen(v){return!['1.16','1.17'].includes(v);}
const VERSION_LIST=[
  {value:'1.21.4',label:'1.21.4 – Bundles of Bravery'},
  {value:'1.21.2',label:'1.21.2 – Bundles of Bravery'},
  {value:'1.21.1',label:'1.21.1 – Tricky Trials'},
  {value:'1.21',  label:'1.21   – Tricky Trials'},
  {value:'1.20',  label:'1.20   – Trails & Tales'},
  {value:'1.19',  label:'1.19   – The Wild Update'},
  {value:'1.18',  label:'1.18   – Caves & Cliffs II'},
  {value:'1.17',  label:'1.17   – Caves & Cliffs I'},
  {value:'1.16',  label:'1.16   – Nether Update'},
];

window.MC={makeLegacyBiomeGen,makeNewBiomeGen,getBiomeColor,getBiomeFR,
  getStructuresInRadius,getStructureConfigs:v=>SC[v]||SC['1.21'],
  parseSeed,isNewGen,VERSION_LIST,BIOME_COLOR,BIOME_FR};
