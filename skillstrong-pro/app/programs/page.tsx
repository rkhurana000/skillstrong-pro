// /app/programs/page.tsx
import { Suspense } from 'react';
import ProgramsClient from './view';


export const dynamic = 'force-dynamic';


export default function ProgramsPage() {
return (
<Suspense>
<ProgramsClient />
</Suspense>
);
}
