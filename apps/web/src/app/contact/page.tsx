import ContactBody from '../../components/boards/ContactBody';

export const metadata = {
  title: 'Contact',
  description:
    'Get in touch with the PAK CRICZONE team for feedback, partnerships or general enquiries.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stext">
            Have a question, suggestion or partnership inquiry? We&apos;d love to hear from you.
            Drop us a message and we&apos;ll get back to you as soon as possible.
          </p>
        </div>
        <ContactBody />
      </div>
    </div>
  );
}
