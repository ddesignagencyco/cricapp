'use client';

import { useState, type ComponentType } from 'react';
import { Clock, Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitContact } from '../../services/contact';
import { ApiError } from '../../services/api/client';
import SiteSocialLinks from '../SiteSocialLinks';
import SocialBrandIcon from '../admin/SocialBrandIcon';
import {
  formatSiteLocation,
  mapsHref,
  publicSocials,
  type SiteSettings,
} from '../../services/siteSettings';
import { formatWorkingHoursLabel } from '../../lib/siteContact';
import { phoneHref, whatsappHref } from '../../lib/socialPlatforms';

type ContactMethod = {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  href: string | null;
  brand?: 'whatsapp';
};

function contactMethodsFromSettings(settings: SiteSettings | null): ContactMethod[] {
  if (!settings) return [];
  const location = formatSiteLocation(settings);
  const methods: ContactMethod[] = [];
  if (settings.email) {
    methods.push({
      icon: Mail,
      label: 'Email',
      value: settings.email,
      href: `mailto:${settings.email}`,
    });
  }
  if (settings.supportEmail) {
    methods.push({
      icon: MessageSquare,
      label: 'Feedback',
      value: settings.supportEmail,
      href: `mailto:${settings.supportEmail}`,
    });
  }
  if (settings.phone) {
    methods.push({
      icon: Phone,
      label: 'Phone',
      value: settings.phone,
      href: phoneHref(settings.phone) || null,
    });
  }
  if (settings.whatsapp) {
    methods.push({
      icon: MessageSquare,
      label: 'WhatsApp',
      value: settings.whatsapp,
      href: whatsappHref(settings.whatsapp) || null,
      brand: 'whatsapp',
    });
  }
  if (location) {
    methods.push({
      icon: MapPin,
      label: 'Location',
      value: location,
      href: mapsHref(settings.mapsUrl),
    });
  }
  if (settings.workingHours) {
    methods.push({
      icon: Clock,
      label: 'Hours',
      value: formatWorkingHoursLabel(settings.workingHours) || settings.workingHours,
      href: null,
    });
  }
  return methods;
}

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

export default function ContactBody({ settings = null }: { settings?: SiteSettings | null }) {
  const methods = contactMethodsFromSettings(settings);
  const socials = settings ? publicSocials(settings) : [];

  return (
    <>
      {methods.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((c) => (
            <div
              key={`${c.label}-${c.value}`}
              className="rounded-2xl bg-card p-6 text-center ring-1 ring-lborder"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-accent/10 text-accent">
                {c.brand === 'whatsapp' ? <SocialBrandIcon id="whatsapp" size={40} /> : <c.icon size={20} />}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stext">
                {c.label}
              </p>
              {c.href ? (
                <a
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
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
      ) : null}
      {socials.length > 0 ? (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">Follow us</p>
          <SiteSocialLinks socials={socials} className="mt-3" />
        </div>
      ) : null}
      <ContactForm />
    </>
  );
}
