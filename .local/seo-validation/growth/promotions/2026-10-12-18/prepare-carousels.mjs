import fs from 'node:fs/promises';
import sharp from 'sharp';
const base='growth/.generated/weekly/2026-10-12-18';
const packages=JSON.parse(await fs.readFile('growth/promotions/2026-10-12-18/carousels.json','utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const txt=(x,y,s,v,c='#eef5ff')=>`<text x="${x}" y="${y}" font-size="${s}" fill="${c}" font-weight="700">${esc(v)}</text>`;
const logo=(await sharp('public/Horizontal Logo.png').resize(355).png().toBuffer()).toString('base64');
for(const p of packages){
 const photo=await sharp(`${base}/sources/${p.photo}.jpg`).resize(936,490,{fit:'cover'}).png().toBuffer();
 for(const [i,s] of p.slides.entries()){
  let diagram='';
  const box=(y,label,color='#136dc1')=>`<rect x="100" y="${y}" width="880" height="100" rx="18" fill="${color}"/>${txt(135,y+65,34,label)}`;
  if(s.visual==='mix') diagram=`<rect x="80" y="700" width="420" height="140" rx="18" fill="#136dc1"/><rect x="540" y="700" width="460" height="140" rx="18" fill="#425d75"/>${txt(110,775,32,'OUTDOOR AIR')}${txt(565,760,29,'RECIRCULATED')}${txt(565,802,29,'RETURN AIR')}<path d="M290 850 V910 H540 M770 850 V910 H540 V980" fill="none" stroke="#80beff" stroke-width="10"/>${txt(520,985,40,'↓')}${box(1010,'MIXED SUPPLY')}`;
  if(s.visual==='ach') diagram=txt(140,810,155,'6', '#72bdff')+txt(140,895,50,'NOMINAL SUPPLY ACH')+box(980,'FLOW × 60 ÷ ROOM VOLUME');
  if(s.visual==='split') diagram=`<rect x="100" y="720" width="880" height="160" rx="16" fill="#425d75"/><rect x="100" y="720" width="176" height="160" fill="#136dc1"/>${txt(100,940,35,'100 CFM outdoor + 400 CFM recirculated')}${txt(100,1050,65,'1.2 OUTDOOR ACH')}`;
  if(s.visual==='order') diagram=box(690,'DEW POINT')+txt(500,830,50,'≤')+box(865,'WET BULB')+txt(500,1005,50,'≤')+box(1040,'DRY BULB');
  if(s.visual==='modes') diagram=box(690,'DRY BULB + RELATIVE HUMIDITY')+box(835,'DRY BULB + WET BULB')+box(980,'DRY BULB + DEW POINT');
  if(s.visual==='dew') diagram=`<rect x="155" y="720" width="720" height="105" rx="52" fill="#90bbd6"/><path d="M520 880 Q430 1000 520 1060 Q610 1000 520 880" fill="#48acfa"/>${txt(140,1140,35,'CONCEPT: COOLING TO SATURATION')}`;
  if(s.visual==='check') diagram=box(700,'01  DEFINE THE FLOW')+box(850,'02  VERIFY THE OUTDOOR SHARE')+box(1000,'03  CHECK PROJECT REQUIREMENTS');
  if(s.visual==='cta') diagram=box(750,'FREE TOOLS. PRACTICAL CHECKS.')+txt(105,960,74,'anyhvac.net')+txt(105,1050,34,'INPUTS BEFORE CONCLUSIONS');
  if(!diagram) diagram=`<image x="72" y="650" width="936" height="490" href="data:image/png;base64,${photo.toString('base64')}"/>`;
  const hs=s.headline.length===3?57:Math.min(67,Math.floor(920/Math.max(...s.headline.map(x=>x.length))/.61));
  const credit=p.photo==='rooftop-tokyo'?'Photo: Marek Ślusarczyk / CC BY 3.0 / cropped':'Photo: CambridgeBayWeather / public domain / cropped';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#091e30"/><g font-family="Arial,sans-serif"><rect width="1080" height="120" fill="#f6f8fb"/><image x="72" y="24" width="355" height="72" href="data:image/png;base64,${logo}"/>${txt(72,165,24,'INPUTS BEFORE CONCLUSIONS')}${s.headline.map((x,k)=>txt(72,270+k*76,hs,x)).join('')}${s.body.map((x,k)=>txt(72,510+k*46,35,x,'#cddfed')).join('')}${diagram}${txt(72,1210,22,s.visual==='photo'?'EQUIPMENT CONTEXT; NOT MEASURED DATA':'ILLUSTRATIVE CONCEPT / VERIFY PROJECT REQUIREMENTS','#9bb7cd')}${txt(72,1260,20,credit,'#9bb7cd')}${txt(930,1310,26,`${i+1} / 6`,'#80beff')}</g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${base}/media/${p.id}-${String(i+1).padStart(2,'0')}.png`);
 }
}
console.log('Rendered 12 original photographic/diagram carousel slides.');
