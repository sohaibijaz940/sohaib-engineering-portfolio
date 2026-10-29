import type {Metadata} from 'next';
import CareIndexDemoTour from '@/components/CareIndexDemoTour';
import './tour.css';
export const metadata:Metadata={title:'Explore CareIndex — Guided Product Tour',description:'Explore the complete CareIndex synthetic-data clinic software demo through patient, doctor, staff, and algorithm learning journeys.'};
export default function CareIndexTourPage(){return <CareIndexDemoTour/>;}
