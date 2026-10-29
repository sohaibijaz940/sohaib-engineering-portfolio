import type {Metadata} from 'next';
import CareIndexPatientPortal from '@/components/CareIndexPatientPortal';
import './patient.css';
export const metadata:Metadata={title:'Patient Portal | CareIndex',description:'Fictional clinic patient booking application and engineering lab. Synthetic data only.'};
export default function PatientPage(){return <CareIndexPatientPortal/>;}
