import{searchPlaces,placeDetails,placePhoto,cityEvents,discoveryStatus}from'@/server/travel-discovery';
import{withFlightSelections,selectFlight,validateFlightSelection}from'@/server/travel-flight-budget';
import{searchLiveFlights}from'@/server/travel-live-flights';
import{WorkspaceAccessError,workspaceDb,boards,boardDetail,workspaceAction}from'@/server/travel-workspace';
import{providerStatus,referenceRates,destinationData,localGuide}from'@/server/travel-providers';
import{findAffordable,flightScenarios,experiences}from'@/lib/travel-planning';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { travelDb, findUser, createSession, hashPassword, checkPassword, digest, pricing, hotelPricing, limit } from '@/server/travel-db';
import { destinations, stays } from '@/lib/travel-data';
import { estimate, type TripInput } from '@/lib/travel-engine';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const fail = (message: string, status = 400) => json({ error: message }, status);
function session(data: unknown, uid: string) { const r = json(data); r.cookies.set('travel_session', createSession(uid), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 }); return r; }
export async function GET(req: NextRequest, { params }: {
    params: Promise<{
        path: string[];
    }>;
}) { try {
    const parts = (await params).path;
    const route = parts.join('/');
    const u = findUser(req.cookies.get('travel_session')?.value || '');
    if (route === 'catalog')
        return json({ destinations, stays: stays.map(h => ({ ...h, nightly: hotelPricing()[h.id] ?? h.nightly })), hotelPrices: hotelPricing(), rates: pricing(), sample: true, priceDate: '2026-10-28' });
    if(route==='providers/discovery/status')return json(discoveryStatus());
    if(parts[0]==='providers'&&parts[1]==='local-guide'&&parts[2])return json(await localGuide(parts[2]));
    if(route==='providers/status')return json(providerStatus());
    if(route==='providers/fx')return json(await referenceRates());
    if(parts[0]==='providers'&&parts[1]==='destination'&&parts[2])return json(await destinationData(parts[2]));
    if(route==='experiences')return json({experiences,notice:'Curated activity ideas and sample allowances. Source guide links are reference material, not confirmation of fees.'});
    if (route === 'me')
        return json({ user: u });
    if (!u)
        return fail('Start a demo session or sign in first.', 401);
    const d = travelDb();
    if(route==='boards')return json({boards:boards(u)});
    if(parts[0]==='board'&&parts[1])return json({board:boardDetail(parts[1],u)});
    if(route==='offers'){const d=workspaceDb();return json({offers:d.prepare('SELECT id,title,data,created_at FROM travel_user_offers WHERE user_id=? ORDER BY created_at DESC').all(u.id).map(r=>({...r,data:JSON.parse(String(r.data))}))})}
    if(route==='watches'){const d=workspaceDb();return json({watches:d.prepare('SELECT * FROM travel_watches WHERE user_id=? ORDER BY created_at DESC').all(u.id).map(r=>{const input=JSON.parse(String(r.input));const current=Math.min(...flightScenarios(input).map(f=>f.total));return{...r,user_id:undefined,input,current,change:current-Number(r.baseline),sample:true,notice:'Sample scenario recalculated on request. Not a live fare alert or background monitor.'}})})}
    if (route === 'trips')
        return json({ trips: d.prepare('SELECT id,title,destination_id,input,estimate,total,created_at FROM trips WHERE user_id=? ORDER BY created_at DESC LIMIT 40').all(u.id).map(r => ({ ...r, input: JSON.parse(String(r.input)), estimate: JSON.parse(String(r.estimate)) })) });
    if (route === 'admin') {
        if (u.role !== 'Admin')
            return fail('Pricing editor access required.', 403);
        return json({ rates: d.prepare('SELECT * FROM pricing').all(), hotels: d.prepare('SELECT * FROM hotels ORDER BY destination_id,name').all(), audit: d.prepare('SELECT action,note,created_at FROM audit ORDER BY id DESC LIMIT 30').all() });
    }
    return fail('Unknown travel resource.', 404);
}
catch(e) {
    if(e instanceof WorkspaceAccessError)return fail(e.message,e.status);
    return fail('Travel data is temporarily unavailable.', 500);
} }
export async function POST(req: NextRequest, { params }: {
    params: Promise<{
        path: string[];
    }>;
}) { try {
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        return fail('Cross-origin request rejected.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json'))
        return fail('JSON is required.', 415);
    if (Number(req.headers.get('content-length') || 0) > 20000)
        return fail('Request too large.', 413);
    const raw = await req.text();
    if (raw.length > 20000)
        return fail('Request too large.', 413);
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object' || Array.isArray(b))
        return fail('Invalid request.');
    const route = (await params).path.join('/');
    const d = travelDb();
    const u = findUser(req.cookies.get('travel_session')?.value || '');
    if (route === 'estimate') {
        validateFlightSelection(b as TripInput,u);
        if (!limit('estimate:' + digest(u?.id || req.headers.get('x-forwarded-for') || 'anonymous'), 90, 1))
            return fail('Please wait before calculating again.', 429);
        return json({ estimate: estimate(b as TripInput, pricing(), hotelPricing()) });
    }
    if(route==='discover'){if(!limit('discover:'+digest(u?.id||'public'),40,1))return fail('Please wait before searching again.',429);return json({plans:findAffordable(b,pricing(),hotelPricing()),sample:true})}
    if (route === 'session') {
        if (u)
            return json({ user: u });
        if (!limit('guest:' + digest(req.headers.get('x-forwarded-for') || 'local'), 30, 60))
            return fail('Demo session limit reached. Please return later.', 429);
        const id = randomUUID();
        d.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id, 'Guest explorer', null, null, 'Guest', new Date().toISOString());
        return session({ user: { id, name: 'Guest explorer', role: 'Guest' } }, id);
    }
    if (route === 'auth/logout') {
        if (u)
            d.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(req.cookies.get('travel_session')!.value));
        const r = json({ ok: true });
        r.cookies.delete('travel_session');
        return r;
    }
    if (route === 'auth/register' || route === 'auth/login') {
        if (typeof b.email !== 'string' || typeof b.password !== 'string' || b.password.length > 128)
            return fail('Enter email and password.');
        const email = b.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180)
            return fail('Enter a valid email address.');
        if (!limit('login:' + digest(email), 10, 15))
            return fail('Too many attempts. Try again in 15 minutes.', 429);
        if (route.endsWith('register')) {
            if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.length > 80 || b.password.length < 12)
                return fail('Use a name and a password of at least 12 characters.');
            if (d.prepare('SELECT id FROM users WHERE email=?').get(email))
                return fail('Unable to create this account. Try signing in.', 409);
            if (!limit('registrations', 100, 60))
                return fail('Registration limit reached.', 429);
            const id = randomUUID();
            d.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id, b.name.trim(), email, hashPassword(b.password), 'Traveller', new Date().toISOString());
            return session({ user: { id, name: b.name.trim(), role: 'Traveller' } }, id);
        }
        const account = d.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (!account || !checkPassword(b.password, String(account.password)))
            return fail('Email or password is incorrect.', 401);
        return session({ user: { id: account.id, name: account.name, role: account.role } }, String(account.id));
    }
    if (!u)
        return fail('Start a demo session or sign in first.', 401);
    if(route==='providers/places/search')return json(await searchPlaces(String(b.destination),String(b.category)));
    if(route==='providers/places/details')return json(await placeDetails(String(b.id)));
    if(route==='providers/places/photo')return json(await placePhoto(String(b.name)));
    if(route==='providers/events'){estimate({...b.input,flightQuote:undefined} as TripInput,pricing(),hotelPricing());return json(await cityEvents(b.input as TripInput))}
    if(route==='providers/flights/select'){const input={...b.input,flightQuote:undefined} as TripInput;estimate(input,pricing(),hotelPricing());return json(await selectFlight({...b,input},u))}
    if(b.input&&route!=='providers/flights')validateFlightSelection(b.input as TripInput,u);
    if(route.startsWith('workspace/'))return json(workspaceAction(route.slice(10),b,u));
    if(route==='providers/flights'){estimate({...b.input,flightQuote:undefined} as TripInput,pricing(),hotelPricing());if(!limit('flight-search:'+u.id,12,60))return fail('Flight provider demo limit reached.',429);return json(withFlightSelections(await searchLiveFlights(b.input as TripInput),b.input as TripInput,u))}
    if(route==='offers/save'){if(typeof b.title!=='string'||b.title.trim().length<2||b.title.length>100||typeof b.source!=='string')return fail('Enter a title and optional source link.');let source='';if(b.source){const url=new URL(b.source);if(url.protocol!=='https:'||url.username||url.password)return fail('Use an HTTPS source link.');source=url.href.slice(0,500)}for(const k of ['base','mandatory','optional'])if(typeof b[k]!=='number'||!Number.isInteger(b[k])||b[k]<0||b[k]>20000000)return fail('Enter whole non-negative PKR costs.');if(typeof b.unknown!=='boolean')return fail('Confirm whether any required costs remain unknown.');const perks=typeof b.perks==='string'?b.perks.slice(0,1000):'';const id=randomUUID(),d=workspaceDb();if(Number(d.prepare('SELECT count(*) n FROM travel_user_offers WHERE user_id=?').get(u.id)!.n)>=30)return fail('Maximum 30 saved offers.');d.prepare('INSERT INTO travel_user_offers VALUES(?,?,?,?,?)').run(id,u.id,b.title.trim(),JSON.stringify({base:b.base,mandatory:b.mandatory,optional:b.optional,unknown:b.unknown,perks,source,verified:false}),new Date().toISOString());return json({id})}
    if(route==='offers/remove'){workspaceDb().prepare('DELETE FROM travel_user_offers WHERE id=? AND user_id=?').run(String(b.id),u.id);return json({ok:true})}
    if(route==='watches/add'){estimate(b.input as TripInput,pricing(),hotelPricing());const input=b.input as TripInput;const baseline=Math.min(...flightScenarios(input).map(f=>f.total)),id=randomUUID(),d=workspaceDb();if(Number(d.prepare('SELECT count(*) n FROM travel_watches WHERE user_id=?').get(u.id)!.n)>=20)return fail('Maximum 20 sample watches.');d.prepare('INSERT INTO travel_watches VALUES(?,?,?,?,?,?)').run(id,u.id,input.origin+' to '+destinations.find(d=>d.id===input.destination)!.name,JSON.stringify(input),baseline,new Date().toISOString());return json({id,notice:'Sample watch saved. Refresh manually; no background notifications are sent.'})}
    if(route==='watches/remove'){workspaceDb().prepare('DELETE FROM travel_watches WHERE id=? AND user_id=?').run(String(b.id),u.id);return json({ok:true})}
    if (route === 'trips/save') {
        if (d.prepare('SELECT count(*) n FROM trips WHERE user_id=?').get(u.id)!.n as number >= 40)
            return fail('You can save up to 40 demo trips.');
        const result = estimate(b.input as TripInput, pricing(), hotelPricing());
        const title = typeof b.title === 'string' ? b.title.trim().slice(0, 80) : result.destination.name + ' escape';
        if (!title)
            return fail('Give the trip a title.');
        const id = randomUUID();
        d.prepare('INSERT INTO trips VALUES(?,?,?,?,?,?,?,?,?)').run(id, u.id, result.destination.id, result.stay.id, title, JSON.stringify(b.input), JSON.stringify(result), result.total, new Date().toISOString());
        return json({ id, message: 'Journey saved with its current sample price snapshot.' });
    }
    if (route === 'trips/delete') {
        if (typeof b.id !== 'string')
            return fail('Choose a journey.');
        const result = d.prepare('DELETE FROM trips WHERE id=? AND user_id=?').run(b.id, u.id);
        return result.changes ? json({ ok: true }) : fail('Journey not found.', 404);
    }
    if (route === 'admin/hotels') {
        if (u.role !== 'Admin')
            return fail('Pricing editor access required.', 403);
        if (typeof b.id !== 'string' || !stays.some(h => h.id === b.id) || typeof b.value !== 'number' || !Number.isFinite(b.value) || b.value <= 0 || b.value > 10000000 || typeof b.note !== 'string' || b.note.trim().length < 10 || b.note.length > 300)
            return fail('Choose a stay, positive nightly price and an audit note.');
        d.exec('BEGIN IMMEDIATE');
        try {
            const before = d.prepare('SELECT nightly FROM hotels WHERE id=?').get(b.id)!.nightly;
            d.prepare('UPDATE hotels SET nightly=? WHERE id=?').run(b.value, b.id);
            d.prepare('INSERT INTO audit(actor_id,action,note,created_at) VALUES(?,?,?,?)').run(u.id, 'Sample stay price updated', b.id + ': ' + before + ' to ' + b.value + '. ' + b.note, new Date().toISOString());
            d.exec('COMMIT');
        }
        catch (e) {
            d.exec('ROLLBACK');
            throw e;
        }
        return json({ ok: true });
    }
    if (route === 'admin/rates') {
        if (u.role !== 'Admin')
            return fail('Pricing editor access required.', 403);
        if (typeof b.currency !== 'string' || !(b.currency in pricing()) || b.currency === 'PKR' || typeof b.value !== 'number' || !Number.isFinite(b.value) || b.value <= 0 || b.value > 100000 || typeof b.note !== 'string' || b.note.trim().length < 10 || b.note.length > 300)
            return fail('Provide a supported currency, positive rate and an audit note of 10–300 characters.');
        d.exec('BEGIN IMMEDIATE');
        try {
            const before = pricing()[b.currency];
            d.prepare('UPDATE pricing SET pkr_per_unit=?,updated_at=? WHERE currency=?').run(b.value, new Date().toISOString(), b.currency);
            d.prepare('INSERT INTO audit(actor_id,action,note,created_at) VALUES(?,?,?,?)').run(u.id, 'Sample rate updated', b.currency + ': ' + before + ' → ' + b.value + '. ' + b.note, new Date().toISOString());
            d.exec('COMMIT');
        }
        catch (e) {
            d.exec('ROLLBACK');
            throw e;
        }
        return json({ ok: true });
    }
    return fail('Unknown travel action.', 404);
}
catch (e) {
    if(e instanceof WorkspaceAccessError)return fail(e.message,e.status);
    if (e instanceof SyntaxError)
        return fail('Invalid JSON.');
    if (e instanceof Error && e.message.startsWith('UNIQUE'))
        return fail('Request conflicts with an existing record.', 409);
    return fail(e instanceof Error && !/SQLITE|database|constraint|table|column/i.test(e.message) ? e.message : 'The request could not be completed.');
} }
