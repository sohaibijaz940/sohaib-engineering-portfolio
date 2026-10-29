import type {Metadata} from 'next';
import CareIndexBooking from '@/components/CareIndexBooking';
import './booking.css';
export const metadata:Metadata={title:'CareIndex — Booking Engine & Engineering Walkthrough'};
export const dynamic='force-dynamic';
export default function Page(){return <CareIndexBooking/>}
