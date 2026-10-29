export type Destination = {
    id: string;
    name: string;
    country: string;
    region: string;
    currency: string;
    tag: string;
    line: string;
    description: string;
    image: string;
    lat: number;
    lng: number;
    flight: number;
    night: number;
    daily: number;
    local: number;
    activities: number;
    highlights: string[];
    palette: string;
    days: number;
    road?: Record<string, number>;
};
export const destinations: Destination[] = [
    { id: 'amalfi', name: 'Amalfi Coast', country: 'Italy', region: 'Europe', currency: 'EUR', tag: 'THE ART OF SLOW DAYS', line: 'A little closer to la dolce vita.', description: 'Cliffside villages, sea-facing terraces and long afternoons on the Mediterranean. Build a coastal escape at your own pace.', image: 'amalfi', lat: 40.634, lng: 14.602, flight: 245000, night: 140, daily: 38, local: 15, activities: 22, highlights: ['Coastal village walk', 'A day by the water', 'Terrace dinner'], palette: '#c89c76', days: 6 },
    { id: 'istanbul', name: 'Istanbul', country: 'Türkiye', region: 'Europe', currency: 'TRY', tag: 'BETWEEN TWO WORLDS', line: 'Follow the water. Find a new story.', description: 'Ferry crossings, layered skylines and neighbourhood cafés. A city made for wandering between the familiar and the unexpected.', image: 'istanbul', lat: 41.008, lng: 28.978, flight: 155000, night: 2300, daily: 850, local: 260, activities: 420, highlights: ['Bosphorus waterfront', 'Old-city architecture', 'Neighbourhood food walk'], palette: '#caa87b', days: 5 },
    { id: 'hunza', name: 'Hunza', country: 'Pakistan', region: 'Pakistan', currency: 'PKR', tag: 'TAKE THE HIGH ROAD', line: 'More sky. Less ordinary.', description: 'A mountain journey through broad valleys and lakeside stops. Leave space in the plan for slower road days.', image: 'hunza', lat: 36.316, lng: 74.65, flight: 54000, night: 12000, daily: 2600, local: 1700, activities: 1200, highlights: ['Lakeside pause', 'Karimabad walk', 'Mountain viewpoints'], palette: '#a4b9b5', days: 5, road: { Lahore: 1000, Islamabad: 600, Karachi: 2200 } },
    { id: 'maldives', name: 'Maldives', country: 'Maldives', region: 'Asia', currency: 'USD', tag: 'ANOTHER SHADE OF BLUE', line: 'Let the ocean set the pace.', description: 'Salt air, clear water and island days. Remember to budget for transfers as well as the stay.', image: 'maldives', lat: 4.175, lng: 73.509, flight: 180000, night: 160, daily: 38, local: 25, activities: 35, highlights: ['Island shoreline', 'Lagoon time', 'Sunset by the sea'], palette: '#73bbb6', days: 5 },
    { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', region: 'Asia', currency: 'AED', tag: 'CITY LIGHTS / DESERT NIGHTS', line: 'A city with a different horizon.', description: 'A skyline escape with waterside walks, contemporary culture and room in the plan for desert adventures.', image: 'dubai', lat: 25.204, lng: 55.27, flight: 95000, night: 320, daily: 110, local: 45, activities: 75, highlights: ['Waterfront evening', 'City architecture', 'Desert-inspired day'], palette: '#bba589', days: 4 },
    { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', currency: 'EUR', tag: 'A CITY TO SAVOUR', line: 'Find your own kind of Paris.', description: 'Riverside walks and café mornings, with iconic architecture around the next corner. Plan a few highlights and leave room to explore.', image: 'paris', lat: 48.857, lng: 2.352, flight: 265000, night: 135, daily: 42, local: 14, activities: 23, highlights: ['Seine riverside walk', 'Museum-inspired day', 'Neighbourhood cafés'], palette: '#b0adb1', days: 6 },
    { id: 'bali', name: 'Bali', country: 'Indonesia', region: 'Asia', currency: 'IDR', tag: 'GREEN DAYS / GOLDEN EVENINGS', line: 'A softer rhythm of discovery.', description: 'Temple architecture, tropical landscapes and unhurried mornings. Choose a base that fits the experience you want.', image: 'bali', lat: -8.409, lng: 115.189, flight: 195000, night: 850000, daily: 280000, local: 140000, activities: 200000, highlights: ['Temple architecture', 'Green landscape walk', 'Coastal afternoon'], palette: '#9baa88', days: 6 },
    { id: 'rome', name: 'Rome', country: 'Italy', region: 'Europe', currency: 'EUR', tag: 'LAYERS OF TIME', line: 'Every street has a story.', description: 'Ancient landmarks and lively piazzas. Balance planned visits with slow walks through the city.', image: 'rome', lat: 41.903, lng: 12.496, flight: 235000, night: 115, daily: 35, local: 12, activities: 25, highlights: ['Ancient-city walk', 'Piazza afternoon', 'Local food discovery'], palette: '#c58d70', days: 5 }
];
export const initialRates: Record<string, number> = { PKR: 1, USD: 280, EUR: 305, TRY: 8, AED: 76.3, IDR: 0.0175 };
export const origins = ['Lahore', 'Islamabad', 'Karachi'];
export type Stay = {
    id: string;
    destination_id: string;
    name: string;
    tier: string;
    nightly: number;
    capacity: number;
    rating: number;
    amenities: string[];
    image: string;
    description: string;
};
export const stays: Stay[] = destinations.flatMap(d => [{ id: d.id + '-classic', destination_id: d.id, name: 'The ' + d.name + ' House', tier: 'Balanced', nightly: d.night, capacity: 2, rating: 4.3, amenities: ['Wi-Fi', 'Private bathroom', 'Air conditioning'], image: 'room-classic', description: 'A comfortable double room for a thoughtfully paced trip.' }, { id: d.id + '-suite', destination_id: d.id, name: d.name + ' Atelier Stay', tier: 'Comfort', nightly: Math.round(d.night * 1.65), capacity: 3, rating: 4.7, amenities: ['Wi-Fi', 'Breakfast', 'Lounge area'], image: 'room-suite', description: 'More space, a lounge area and a slower start to your morning.' }, { id: d.id + '-twin', destination_id: d.id, name: 'Waypoint ' + d.name, tier: 'Budget', nightly: Math.round(d.night * .7), capacity: 2, rating: 4.0, amenities: ['Wi-Fi', 'Twin beds', 'Private bathroom'], image: 'room-twin', description: 'A simple twin-room base with the essentials covered.' }]);
export const image = (id: string) => '/travel/' + id + '.webp';
export const formatMoney = (n: number, currency = 'PKR') => new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: currency === 'IDR' ? 0 : 0 }).format(n);
