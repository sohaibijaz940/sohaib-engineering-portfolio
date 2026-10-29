export type ProviderFlight={id:string;total:number;currency:string;updatedAt?:string;itineraries:{duration:string;durationMinutes?:number;stops?:number;segments:{departure:{iataCode:string;at:string;name?:string};arrival:{iataCode:string;at:string;name?:string};carrierCode:string;carrierName?:string;operatingCarrierName?:string;flightNumber?:string;durationMinutes?:number}[]}[];unconfirmed:string[]};
type Row=Record<string,unknown>;
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object') as Row[]:[];
const text=(v:unknown)=>typeof v==='string'?v:'';
const id=(v:unknown)=>String(v??'');
/** Normalise only supplied provider values. Never fill missing prices from sample data. */
export function normaliseFlightAPI(raw:unknown,currency='USD'):ProviderFlight[]{
 if(!raw||typeof raw!=='object')throw Error('Invalid provider response');
 const r=raw as Row,legs=rows(r.legs),segments=rows(r.segments),places=rows(r.places),carriers=rows(r.carriers);
 if(!Array.isArray(r.itineraries))throw Error('Unrecognised provider schema');
 const airport=(value:unknown)=>{const p=places.find(p=>id(p.id)===id(value));return text(p?.iata)||text(p?.display_code)||text(p?.code)||('Airport ref '+id(value))};
 const airline=(value:unknown)=>{const c=carriers.find(c=>id(c.id)===id(value));return text(c?.iata)||text(c?.display_code)||text(c?.name)||('Carrier ref '+id(value))};
 const carrierName=(value:unknown)=>{const c=carriers.find(c=>id(c.id)===id(value));return text(c?.name)||text(c?.display_name)||airline(value)};
 const airportName=(value:unknown)=>{const p=places.find(p=>id(p.id)===id(value));return text(p?.name)||text(p?.display_name)};
 const result:ProviderFlight[]=[];
 for(const item of rows(r.itineraries)){
  const options=rows(item.pricing_options);
  const prices=options.map(o=>o.price as Row|undefined).filter((p):p is Row=>!!p&&Number.isFinite(Number(p.amount))&&Number(p.amount)>0);
  const cheapest=item.cheapest_price as Row|undefined;
  if(cheapest&&Number.isFinite(Number(cheapest.amount))&&Number(cheapest.amount)>0)prices.push(cheapest);
  prices.sort((a,b)=>Number(a.amount)-Number(b.amount));const price=prices[0];if(!price)continue;
  const itineraryIds=Array.isArray(item.leg_ids)?item.leg_ids:[];
  const itineraries=itineraryIds.map(value=>{const leg=legs.find(l=>id(l.id)===id(value));if(!leg)return null;const ids=Array.isArray(leg.segment_ids)?leg.segment_ids:[];const flightSegments=ids.map(value=>segments.find(s=>id(s.id)===id(value))).filter((s):s is Row=>!!s);return{durationMinutes:Number.isFinite(Number(leg.duration))?Number(leg.duration):undefined,stops:Number.isInteger(leg.stop_count)?Number(leg.stop_count):Math.max(0,flightSegments.length-1),duration:Number.isFinite(Number(leg.duration))?String(leg.duration)+' min':'Duration not supplied',segments:flightSegments.map(s=>({departure:{iataCode:airport(s.origin_place_id),name:airportName(s.origin_place_id),at:text(s.departure)},arrival:{iataCode:airport(s.destination_place_id),name:airportName(s.destination_place_id),at:text(s.arrival)},carrierCode:airline(s.marketing_carrier_id),carrierName:carrierName(s.marketing_carrier_id),operatingCarrierName:carrierName(s.operating_carrier_id??s.marketing_carrier_id),flightNumber:text(s.marketing_flight_number),durationMinutes:Number.isFinite(Number(s.duration))?Number(s.duration):undefined}))}}).filter((i):i is NonNullable<typeof i>=>!!i);
  result.push({id:id(item.id),total:Number(price.amount),currency,updatedAt:text(price.last_updated)||undefined,itineraries,unconfirmed:['group-total basis with seller','baggage','change/refund rules','transfers','seller charges and payment fees']});
 }
 const sorted=result.sort((a,b)=>a.total-b.total),chosen=sorted.slice(0,12);
 const names=(offer:ProviderFlight)=>offer.itineraries.flatMap(it=>it.segments.map(s=>s.carrierName||s.carrierCode));
 const seen=new Set(chosen.flatMap(names));
 // Keep cheap options without discarding every option from a higher-priced airline.
 for(const offer of sorted){if(chosen.length>=36)break;if(names(offer).some(name=>!seen.has(name))){chosen.push(offer);names(offer).forEach(name=>seen.add(name))}}
 return chosen.sort((a,b)=>a.total-b.total);
}
