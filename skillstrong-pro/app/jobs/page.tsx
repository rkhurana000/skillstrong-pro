// /app/jobs/page.tsx
import { Suspense } from 'react';
import JobsClient from './view';


export const dynamic = 'force-dynamic';


export default function JobsPage() {
return (
<Suspense>
<JobsClient />
</Suspense>
);
}
