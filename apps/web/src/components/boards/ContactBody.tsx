'use client';

import { Mail, MapPin, MessageSquare } from 'lucide-react';

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
  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
      <h2 className="text-lg font-bold text-mtext">Send a Message</h2>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-4 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-accent"
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            placeholder="How can we help?"
            className="w-full resize-none rounded-lg bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled
          aria-describedby="contact-unavailable"
          className="cursor-not-allowed rounded bg-elevated px-6 py-2.5 text-sm font-medium text-stext opacity-70"
        >
          Messaging unavailable
        </button>
        <p id="contact-unavailable" className="text-xs text-stext">
          Online messaging will be enabled when the contact API is available.
        </p>
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
