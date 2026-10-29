import { destinations, stays, origins, initialRates } from './travel-data';
export type FlightBudgetQuote={id:string;provider:'FlightAPI';offerId:string;origin:string;destination:string;departure:string;returnDate:string;travellers:number;amount:number;currency:'USD';basis:'group'|'per_person';pkrPerUnit:number;fxSource:'ExchangeRate-API reference'|'Your conversion assumption';fxAt:string;retrievedAt:string;providerUpdatedAt:string;conditions:string};
export type CostOverrides=Partial<Record<'stay'|'tax'|'food'|'local'|'activities',number>>;
export type TripInput = {
    destination: string;
    origin: string;
    departure: string;
    returnDate: string;
    travellers: number;
    rooms: number;
    stayId: string;
    transport: 'flight' | 'car' | 'bus';
    fuelPrice: number;
    efficiency: number;
    dailyScale: number;
    visa: number;
    insurance: number;
    extras: number;
    contingency: number;
    fxRate?: number;
    flightQuote?:FlightBudgetQuote;
    costOverrides?:CostOverrides;
};
export type BudgetLine = {
    key: string;
    label: string;
    amount: number;
    formula: string;
    source?:'Provider quote'|'Your amount'|'Estimate'|'Calculated';
};
export function defaultTrip(id = 'amalfi'): TripInput { const date = new Date(); date.setUTCDate(date.getUTCDate() + 30); const departure = date.toISOString().slice(0, 10); date.setUTCDate(date.getUTCDate() + 6); return { destination: id, origin: 'Lahore', departure, returnDate: date.toISOString().slice(0, 10), travellers: 2, rooms: 1, stayId: id + '-classic', transport: id === 'hunza' ? 'car' : 'flight', fuelPrice: 300, efficiency: 13, dailyScale: 1, visa: 0, insurance: 0, extras: 0, contingency: 10 }; }
function bounded(v: unknown, min: number, max: number, label: string, integer = false) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v)))
    throw Error(label + ' must be ' + (integer ? 'a whole number ' : '') + 'between ' + min + ' and ' + max + '.'); return v; }
function day(s:unknown){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Use valid travel dates.');
 const value=Date.parse(s+'T00:00:00Z');
 if(!Number.isFinite(value)||new Date(value).toISOString().slice(0,10)!==s)throw Error('Use valid travel dates.');
 return value;
}

export function estimate(input: TripInput, rates: Record<string, number> = initialRates, hotelPrices: Record<string, number> = {}) { if (!input || typeof input !== 'object')
    throw Error('Trip details are required.'); const d = destinations.find(d => d.id === input.destination); if (!d)
    throw Error('Choose a supported destination.'); if (!origins.includes(input.origin))
    throw Error('Choose a supported origin.'); const baseStay = stays.find(h => h.id === input.stayId && h.destination_id === d.id); if (!baseStay)
    throw Error('Choose a stay in your destination.'); const h = { ...baseStay, nightly: hotelPrices[baseStay.id] ?? baseStay.nightly }; if (!Number.isFinite(h.nightly) || h.nightly <= 0)
    throw Error('Stay price unavailable.'); const nights = (day(input.returnDate) - day(input.departure)) / 86400000; if (nights < 1 || nights > 30)
    throw Error('Choose a trip of 1–30 nights.'); const travellers = bounded(input.travellers, 1, 8, 'Travellers', true), rooms = bounded(input.rooms, 1, 8, 'Rooms', true); if (rooms * h.capacity < travellers)
    throw Error('Add enough rooms for all travellers (' + h.capacity + ' guests per room).'); if (!['car', 'flight', 'bus'].includes(input.transport))
    throw Error('Choose a supported transport type.'); if (input.transport !== 'flight' && !d.road)
    throw Error('Road and bus estimates are available only for the Hunza sample route.'); const fuel = bounded(input.fuelPrice, 1, 1000, 'Fuel price'), eff = bounded(input.efficiency, 3, 40, 'Fuel efficiency'), dailyScale = bounded(input.dailyScale, .5, 2, 'Daily spending factor'), visa = bounded(input.visa, 0, 500000, 'Visa budget'), insurance = bounded(input.insurance, 0, 100000, 'Insurance budget'), extras = bounded(input.extras, 0, 5000000, 'Other extras'), contingency = bounded(input.contingency, 0, 40, 'Contingency'); const fx = input.fxRate === undefined ? rates[d.currency] : bounded(input.fxRate, .000001, 100000, 'Exchange rate'); if (!Number.isFinite(fx) || fx <= 0)
    throw Error('Exchange rate unavailable.'); const days = nights + 1; const round = (v: number) => Math.round(v); const km = d.road?.[input.origin] ?? 0; const multiplier = input.origin === 'Karachi' ? .93 : input.origin === 'Islamabad' ? 1.03 : 1; const flight = round(d.flight * multiplier); let transport = flight * travellers; let transportFormula = travellers + ' travellers × PKR ' + flight + ' sample return fare. Includes a generic transfer allowance; no live airline quote.'; if (input.transport === 'car') {
    transport = round(km * 2 / eff * fuel);
    transportFormula = km + ' km each way × 2 ÷ ' + eff + ' km/L × PKR ' + fuel + '/L. Fuel only; tolls, rental and parking must be added to extras.';
} if (input.transport === 'bus') {
    transport = round(km * 8 * 2 * travellers);
    transportFormula = km + ' km each way × 2 × PKR 8/sample passenger-km × ' + travellers + '. Not a carrier quote.';
} const q=input.flightQuote;
if(q){if(input.transport!=='flight'||q.provider!=='FlightAPI'||q.currency!=='USD'||q.origin!==input.origin||q.destination!==input.destination||q.departure!==input.departure||q.returnDate!==input.returnDate||q.travellers!==input.travellers)throw Error('Selected flight quote does not match this trip. Remove it or search again.');if(!['group','per_person'].includes(q.basis)||!q.id||!Number.isFinite(Date.parse(q.retrievedAt)))throw Error('Invalid selected flight quote.');bounded(q.amount,.01,1000000,'Provider quote');bounded(q.pkrPerUnit,.000001,100000,'Flight conversion');transport=round(q.amount*q.pkrPerUnit*(q.basis==='per_person'?travellers:1));transportFormula=q.amount+' USD '+(q.basis==='per_person'?'per person × '+travellers+' travellers':'selected as group total')+' × '+q.pkrPerUnit+' PKR/USD. '+q.provider+' retrieved '+q.retrievedAt+'. '+q.fxSource+' ('+q.fxAt+'). Flight fare only; add baggage, transfers and seller fees separately.';}
const lines: BudgetLine[] = [{ key: 'transport', label: 'Transport', amount: transport, formula: transportFormula }, { key: 'stay', label: 'Accommodation', amount: round(h.nightly * nights * rooms * fx), formula: h.nightly + ' ' + d.currency + ' / room / night × ' + nights + ' nights × ' + rooms + ' rooms × ' + fx + ' PKR/' + d.currency }, { key: 'tax', label: 'Stay tax allowance', amount: round(h.nightly * nights * rooms * fx * .08), formula: '8% illustrative accommodation allowance. Actual taxes and fees vary.' }, { key: 'food', label: 'Food & coffee', amount: round(d.daily * days * travellers * fx * dailyScale), formula: d.daily + ' ' + d.currency + ' × ' + days + ' days × ' + travellers + ' travellers × ' + dailyScale + ' spending factor × exchange rate.' }, { key: 'local', label: 'Local transport', amount: round(d.local * days * travellers * fx * dailyScale), formula: d.local + ' ' + d.currency + ' per traveller/day × ' + days + ' days × spending factor × exchange rate.' }, { key: 'activities', label: 'Experiences', amount: round(d.activities * days * travellers * fx * dailyScale), formula: d.activities + ' ' + d.currency + ' per traveller/day × ' + days + ' days × spending factor × exchange rate.' }, { key: 'visa', label: 'Visa & entry budget', amount: round(visa * travellers), formula: 'User-entered PKR ' + visa + ' per person. No visa eligibility or fee advice.' }, { key: 'insurance', label: 'Insurance budget', amount: round(insurance * travellers), formula: 'User-entered PKR ' + insurance + ' per person. No insurance product is sold.' }, { key: 'extras', label: 'Other extras', amount: round(extras), formula: 'User-entered total for baggage, transfers, tolls or other costs.' }];
const overrides=input.costOverrides||{};if(typeof overrides!=='object'||Array.isArray(overrides))throw Error('Invalid entered cost totals.');for(const [key,value]of Object.entries(overrides)){if(!['stay','tax','food','local','activities'].includes(key))throw Error('Unknown entered cost category.');if(value===undefined)continue;bounded(value,0,20000000,'Entered '+key+' total');const line=lines.find(l=>l.key===key)!;line.amount=round(value);line.formula='Your entered whole-trip total in PKR. Confirm inclusions and update it when the trip changes.';line.source='Your amount';}
if(overrides.stay!==undefined&&overrides.tax===undefined){const tax=lines.find(l=>l.key==='tax')!;tax.amount=round(overrides.stay*.08);tax.formula='8% estimated allowance on your entered accommodation total. Actual taxes may differ; enter a tax total to replace it.';}
for(const line of lines)line.source??=line.key==='transport'&&q?'Provider quote':['visa','insurance','extras'].includes(line.key)?'Your amount':'Estimate';
const subtotal = lines.reduce((s, l) => s + l.amount, 0); const buffer = round(subtotal * contingency / 100); lines.push({ key: 'buffer', label: 'Contingency', amount: buffer, formula: contingency + '% × subtotal PKR ' + subtotal, source:'Calculated' }); return { destination: d, stay: h, nights, days, travellers, rooms, fxRate: fx, currency: d.currency, lines, subtotal, buffer, total: subtotal + buffer, perPerson: round((subtotal + buffer) / travellers), sample: true, priceDate: '2026-10-28', method:q?'Mixed-source planning budget: selected provider flight quote, entered amounts and remaining estimates. Not a confirmed booking.':'Planning budget with entered amounts and illustrative estimates. Not a booking quote.', flightQuote:q||null, excluded: ['Visa/insurance are zero unless entered.', q?'Selected flight quote is a dated snapshot, not a reservation.':'Flight fare is estimated; no flight quote selected.', 'Accommodation is estimated unless you enter a total; no hotel availability is confirmed.', 'Local daily allowances are illustrative; validate before travel.'] }; }
export type Estimate = ReturnType<typeof estimate>;
