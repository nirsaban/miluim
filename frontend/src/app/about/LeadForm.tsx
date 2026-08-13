'use client';

import { useState } from 'react';

const LEADS_ENDPOINT = 'https://hub.miltech.cloud/api/public/leads';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const inputClass =
  'w-full rounded-xl border border-military-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-military-500 focus:outline-none';

export function LeadForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-military-200 bg-white p-6 text-center shadow-card">
        <p className="text-lg font-bold text-military-800">תודה!</p>
        <p className="mt-1.5 text-gray-600">קיבלנו את הפרטים, נחזור אליכם בקרוב.</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-military-200 bg-white p-6 text-start shadow-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('submitting');
        try {
          const res = await fetch(LEADS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: 'miluim', name, contact, message, website }),
          });
          if (!res.ok) throw new Error('request_failed');
          setStatus('success');
        } catch {
          setStatus('error');
        }
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-900">שם</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-900">טלפון או אימייל</span>
        <input required value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-900">ספרו לנו קצת (לא חובה)</span>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
      </label>
      {/* Honeypot — hidden from real visitors */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -z-10 h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-full bg-military-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-military-800 disabled:opacity-60"
      >
        {status === 'submitting' ? 'שולח...' : 'בואו נדבר'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">משהו השתבש בשליחה — נסו שוב או כתבו לנו ישירות.</p>
      )}
    </form>
  );
}
