import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const records=[];
for(const item of [
 {id:'rooftop-tokyo',title:'File:012 Rooftop HVAC systems and roof ventilation ducts in Tokyo, Japan.jpg',license:'CC BY 3.0',author:'Marek Ślusarczyk (Tupungato)',credit:'Photo: Marek Ślusarczyk (Tupungato), Wikimedia Commons, CC BY 3.0. Cropped and annotated.'},
 {id:'sling-psychrometer',title:'File:Sling psychrometer.JPG',license:'Public domain',author:'CambridgeBayWeather',credit:'Photo: CambridgeBayWeather, Wikimedia Commons (public domain). Cropped.'},
]){
 const q=new URLSearchParams({action:'query',format:'json',titles:item.title,prop:'imageinfo',iiprop:'url|extmetadata|size'});
 const data=await(await fetch('https://commons.wikimedia.org/w/api.php?'+q)).json();
 const info=Object.values(data.query.pages)[0].imageinfo[0];
 if(info.extmetadata.LicenseShortName.value!==item.license)throw Error('Unexpected image license');
 const download=info.url.split('?')[0],page=info.descriptionurl;
 const response=await fetch(download);if(!response.ok)throw Error('Photo unavailable');
 const bytes=Buffer.from(await response.arrayBuffer());
 const path=`growth/.generated/weekly/2026-10-12-18/sources/${item.id}.jpg`;
 await writeFile(path,bytes);
 await writeFile(`growth/promotions/2026-10-12-18/evidence/${item.id}-metadata.json`,JSON.stringify(data,null,2));
 const pageResponse=await fetch(page);if(!pageResponse.ok)throw Error('License page unavailable');
 await writeFile(`growth/promotions/2026-10-12-18/evidence/${item.id}-page.html`,await pageResponse.text());
 records.push({...item,path,page,download,width:info.width,height:info.height,sha256:createHash('sha256').update(bytes).digest('hex'),commercialUse:true,attributionRequired:item.license==='CC BY 3.0',acquiredAt:new Date().toISOString(),releases:'No model/property release supplied; equipment-context use only, no endorsement.'});
}
await writeFile('growth/promotions/2026-10-12-18/carousel-photo-provenance.json',JSON.stringify(records,null,2));
const license=await fetch('https://creativecommons.org/licenses/by/3.0/');if(!license.ok)throw Error('CC BY evidence unavailable');
await writeFile('growth/promotions/2026-10-12-18/evidence/cc-by-3-deed.html',await license.text());
console.log(JSON.stringify(records));
