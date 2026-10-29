import type { Metadata } from 'next';
import TravelApp from '@/components/travel/TravelApp';
import './travel.css';
import './workspace.css';
export const metadata: Metadata = { title: 'Travel Estimator — Go further. Know your budget.', description: 'A cinematic domestic and international trip planning demo with explainable sample budgets, private saved journeys and illustrative accommodation.', robots: { index: false, follow: false } };
export default function TravelPage() { return <TravelApp />; }
