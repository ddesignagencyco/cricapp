import Link from 'next/link';
import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Forgot password',
  description: 'Request a PakCricZone password reset link or code.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthShell title="Forgot password" subtitle="We will email you a reset link and a 6-digit code." footer={<Link href="/login" className="font-semibold text-accent">Back to login</Link>}><AuthForm mode="forgot" /></AuthShell>;
}
