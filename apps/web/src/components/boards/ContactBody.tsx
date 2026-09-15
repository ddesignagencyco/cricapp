'use client';

import { useState } from 'react';
import { Mail, MapPin, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitContact } from '../../services/contact';
import { ApiError } from '../../services/api/client';

const contactMethods = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@pakcriczone.com',
    href: 'mailto:hello@pakcriczone.com',
  },
  {
    icon: MessageSquare,
    label: 'Feedback',
    value: 'feedback@pakcriczone.com',
    href: 'mailto:feedback@pakcriczone.com',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Lahore, Pakistan',
    href: null,
  },
];

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    if (message.trim().length < 5) {
      toast.error('Message must be at least 5 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await submitContact({ name: name.trim(), email: email.trim(), message: message.trim() });
      toast.success(res.message || 'Message sent.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not send the message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
      <h2 className="text-lg font-bold text-mtext">Send a Message</h2>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-[var(--color-focus-ring)]"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-[var(--color-focus-ring)]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            className="w-full resize-none rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-[var(--color-focus-ring)]"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn-brand rounded px-6 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}

export default function ContactBody() {
  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {contactMethods.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-card p-6 text-center ring-1 ring-lborder"
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <c.icon size={20} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stext">
              {c.label}
            </p>
            {c.href ? (
              <a
                href={c.href}
                className="mt-1 block text-sm font-semibold text-mtext hover:text-accent"
              >
                {c.value}
              </a>
            ) : (
              <p className="mt-1 text-sm font-semibold text-mtext">{c.value}</p>
            )}
          </div>
        ))}
      </div>
      <ContactForm />
    </>
  );
}
