import https from 'node:https';
import {createHash} from 'node:crypto';
import type{TripInput}from'../lib/travel-engine';
import{normaliseFlightAPI,type ProviderFlight}from'../lib/travel-flight-provider';
import{travelDb,limit}from'./travel-db';
const origins:Record<string,string>={Lahore:'LHE',Islamabad:'ISB',Karachi:'KHI'};
const destinations:Record<string,string>={amalfi:'NAP',istanbul:'IST',hunza:'GIL',maldives:'MLE',dubai:'DXB',paris:'CDG',bali:'DPS',rome:'FCO'};
type Result={status:string;mode:string;notice:string;offers:ProviderFlight[];fetchedAt?:string;cached?:boolean;provider:string;route?:{origin:string;destination:string;departure:string;returnDate:string;adults:number}};
// The vendor authenticates in its URL path. Use native HTTPS so framework fetch traces
// cannot record credential-bearing URLs. Never return raw errors, URLs or payloads.
function request(path:string):Promise<{status:number;data:unknown}>{return new Promise((resolve,reject)=>{const req=https.get({hostname:'api.flightapi.io',path,headers:{Accept:'application/json','User-Agent':'TravelEstimatorPortfolio/1.0'}},res=>{let size=0;const chunks:Buffer[]=[];res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>6_000_000){res.destroy();reject(Error('Response exceeds limit'));return}chunks.push(chunk)});res.on('error',()=>reject(Error('Provider connection failed')));res.on('end',()=>{try{resolve({status:res.statusCode||502,data:JSON.parse(Buffer.concat(chunks).toString('utf8'))})}catch{reject(Error('Invalid provider JSON'))}})});req.setTimeout(55000,()=>req.destroy(Error('Provider timed out')));req.on('error',()=>reject(Error('Provider connection failed')))})}
export function liveFlightStatus(){return{provider:'FlightAPI',configured:!!process.env.FLIGHTAPI_KEY,mode:'live',legacyAmadeus:'retired',notice:'An account and active provider quota are required. Successful searches are cached for five minutes; provider quotes are not guaranteed bookable prices.'}}
export async function searchLiveFlights(input:TripInput):Promise<Result>{
 const base={provider:'FlightAPI',mode:'live',offers:[]};
 const key=process.env.FLIGHTAPI_KEY?.trim();
 if(!key)return{...base,status:'not_configured',notice:'Live flight search needs a private FlightAPI key. No live fares have been retrieved.'};
 if(!/^[A-Za-z0-9_-]{8,256}$/.test(key))return{...base,status:'configuration_error',notice:'The private provider key has an invalid format. Check your server configuration.'};
 const today=new Date().toISOString().slice(0,10);
 if(input.departure<today)return{...base,status:'invalid_dates',notice:'Live flight searches require a current or future departure date.'};
 const route={origin:origins[input.origin],destination:destinations[input.destination],departure:input.departure,returnDate:input.returnDate,adults:input.travellers};
 if(!route.origin||!route.destination)return{...base,status:'unsupported_route',notice:'This route is not supported by the connected airport catalogue.'};
 const d=travelDb();d.exec('CREATE TABLE IF NOT EXISTS live_flight_cache(key TEXT PRIMARY KEY,data TEXT NOT NULL,expires_at INTEGER NOT NULL)');
 const cacheKey=createHash('sha256').update('airline-details-v2:'+JSON.stringify(route)+':'+createHash('sha256').update(key).digest('hex')).digest('hex');
 const cached=d.prepare('SELECT data FROM live_flight_cache WHERE key=? AND expires_at>?').get(cacheKey,Date.now());
 if(cached)return{...JSON.parse(String(cached.data)),cached:true,notice:'Recently retrieved provider quotes (five-minute cache). Check timestamp and confirm all conditions with the seller.'};
 if(!limit('flightapi-global-daily',5,1440))return{...base,status:'quota_protected',notice:'The demo daily allowance of five upstream searches is used. Existing cached searches remain available. Try again after the quota window resets.'};
 try{
  const path=['roundtrip',key,route.origin,route.destination,route.departure,route.returnDate,String(route.adults),'0','0','Economy','USD'].map(encodeURIComponent).join('/');
  const response=await request('/'+path);
  if(response.status!==200)return{...base,status:response.status===429?'provider_quota':response.status===401||response.status===403?'provider_auth_error':'unavailable',notice:response.status===429?'The provider quota or concurrency limit was reached. Check your provider dashboard.':response.status===401||response.status===403?'The provider rejected these credentials or account permissions. Check your dashboard.':'The provider could not return flight data for this search. No sample fares are presented as live results.'};
  const offers=normaliseFlightAPI(response.data,'USD'),result:Result={...base,route,offers,status:offers.length?'ok':'no_results',fetchedAt:new Date().toISOString(),cached:false,notice:offers.length?'Quotes retrieved from FlightAPI for the requested adults and round trip. Confirm group-total basis, availability and all charges with the seller. These quotes do not automatically replace the sample budget.':'The provider returned no usable priced offers. This does not prove the route has no flights.'};
  d.prepare('INSERT OR REPLACE INTO live_flight_cache VALUES(?,?,?)').run(cacheKey,JSON.stringify(result),Date.now()+300000);
  return result;
 }catch{return{...base,status:'unavailable',notice:'Live flight search timed out, failed or returned an unsupported response. No sample result is substituted.'}}
}
