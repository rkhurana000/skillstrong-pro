'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmail(null);
        return;
      }
      setEmail(user.email ?? null);

      // load profile
      const { data } = await supabase
        .from('profiles')
        .select('zip')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.zip) setZip(data.zip);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('Please sign in.'); return; }

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email, zip });

      if (error) throw error;
      setStatus('Saved!');
    } catch (err: any) {
      setStatus(err.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign('/'); // back to home
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="h1">Account</h1>

        <div className="card stack" style={{ maxWidth: 560 }}>
          <div>
            <div className="muted">Signed in as</div>
            <div style={{ fontWeight: 700 }}>{email ?? 'Not signed in'}</div>
          </div>

          <label className="stack" style={{ gap: 8 }}>
            <div style={{ fontWeight: 600 }}>ZIP code (for nearby results)</div>
            <input
              className="input"
              placeholder="e.g. 94582"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
              maxLength={10}
              style={{ width: '240px' }}
            />
          </label>

          <div className="row gap">
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn" onClick={signOut}>Sign out</button>
            {status && <span className="muted" style={{ marginLeft: 8 }}>{status}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
