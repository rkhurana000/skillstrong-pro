// ... top stays the same
const [form, setForm] = useState({
  school: '', title: '', location: '',
  delivery: 'in-person', lengthWeeks: '', cost: '',
  certs: '', startDate: '', url: '',
  description: '', featured: false,
  externalUrl: '',               // NEW
});
// ...
const payload = {
  school: form.school,
  title: form.title,
  location: form.location,
  delivery: form.delivery as 'in-person'|'online'|'hybrid',
  lengthWeeks: Number(form.lengthWeeks || 0),
  cost: form.cost ? Number(form.cost) : undefined,
  certs: form.certs.split(',').map(s=>s.trim()).filter(Boolean),
  startDate: form.startDate || undefined,
  url: form.url || undefined,
  externalUrl: form.externalUrl || undefined,  // NEW
  description: form.description || undefined,
  featured: form.featured,
};
// ...
<div className="grid md:grid-cols-2 gap-4">
  {/* existing inputs */}
  <input className="border rounded-md p-2 md:col-span-2" placeholder="Program URL on your site (optional)" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} />
  <input className="border rounded-md p-2 md:col-span-2" placeholder="External program URL (college/provider page)" value={form.externalUrl} onChange={e=>setForm({...form,externalUrl:e.target.value})} /> {/* NEW */}
</div>
