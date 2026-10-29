// Run against your locally running demo. Only fixed, public-source adapters are used.
// Cache data stays in the runtime database; this report contains provenance/counts only.
import fs from 'node:fs/promises';
const base=process.env.TRAVEL_TEST_URL||'http://localhost:3001';
const get=async p=>{const r=await fetch(base+'/api/travel/'+p+'/',{signal:AbortSignal.timeout(40000)});if(!r.ok)throw Error(p+': HTTP '+r.status);return r.json()};
const report={collectedAt:new Date().toISOString(),source:'Travel Estimator public-source adapters',fx:null,destinations:[],notice:'No hotel/airline inventory or reviews were scraped. No ML model trained. FX values are not redistributed in this report.'};
const fx=await get('providers/fx');report.fx={status:fx.status,fetchedAt:fx.fetchedAt,currencies:Object.keys(fx.data?.rates||{}).length,source:fx.source};
for(const d of(await get('catalog')).destinations){const r=await get('providers/destination/'+d.id);report.destinations.push({id:d.id,name:d.name,guide:{status:r.guide.status,fetchedAt:r.guide.fetchedAt,characters:r.guide.data?.text.length||0,source:r.guide.source,license:r.guide.license},nearby:{status:r.nearby.status,places:r.nearby.data?.places.length||0,source:r.nearby.source,fetchedAt:r.nearby.fetchedAt},weather:{status:r.weather.status,fetchedAt:r.weather.fetchedAt,days:r.weather.data?.days.length||0,source:r.weather.source,license:r.weather.license}});console.log(d.name+': guide '+r.guide.status+', weather '+r.weather.status)}
await fs.mkdir('docs/travel',{recursive:true});await fs.writeFile('docs/travel/COLLECTION_REPORT.json',JSON.stringify(report,null,2)+'\n');console.log('Saved provenance report. Runtime cache remains in the private SQLite database.');
