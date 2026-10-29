import {NextRequest} from 'next/server';
import {db,transaction} from '@/server/careindex-db';
import {trace,step,requireAccess,mutationOrigin,finish,failure,jsonBody} from '@/server/careindex-trace';
import {getDoctorsForAdmin,createDoctor,updateDoctor} from '@/server/careindex-clinic';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const t=trace(req,'clinic','DOCTOR SCHEDULES');try{requireAccess(req,t,'manage');const doctors=getDoctorsForAdmin(db());step(t,'SQL','Loaded doctor profiles, working hours and future booking counts');return finish(t,200,{doctors,syntheticOnly:true});}catch(e){return failure(t,e);}}
export async function POST(req:NextRequest){const t=trace(req,'clinic','REGISTER DOCTOR');try{mutationOrigin(req,t);requireAccess(req,t,'manage');const input=await jsonBody(req,t);const id=transaction(()=>createDoctor(db(),input));step(t,'TRANSACTION','Created synthetic clinician profile and validated schedule atomically');return finish(t,201,{ok:true,id});}catch(e){return failure(t,e);}}
export async function PATCH(req:NextRequest){const t=trace(req,'clinic','UPDATE DOCTOR SCHEDULE');try{mutationOrigin(req,t);requireAccess(req,t,'manage');const input=await jsonBody(req,t);const id=transaction(()=>updateDoctor(db(),input));step(t,'SCHEDULE VALIDATION','Checked all future reservations against proposed working hours');step(t,'TRANSACTION','Saved synthetic doctor profile and working hours together');return finish(t,200,{ok:true,id});}catch(e){return failure(t,e);}}
