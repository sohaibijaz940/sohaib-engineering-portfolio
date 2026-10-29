import type {Metadata} from 'next';
import CareIndexInvoiceDocument from '@/components/CareIndexInvoiceDocument';
import '../../patient.css';
import './invoice.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Demo Invoice | CareIndex',robots:{index:false,follow:false}};
export default async function InvoicePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CareIndexInvoiceDocument id={id}/>;}
