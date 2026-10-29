/** Minimal readiness endpoint; no sensitive records or infrastructure paths returned. */
import {NextResponse} from 'next/server';
import {db} from '@/server/careindex-db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{const row=db().prepare('SELECT 1 AS value').get() as {value:number}|undefined;if(row?.value!==1)throw new Error('db not ready');return NextResponse.json({status:'ready',dataMode:'synthetic'},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
