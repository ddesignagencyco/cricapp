import Link from 'next/link';
import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Forgot password',
  description: 'Request a PakCricZone password reset link.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthShell title="Forgot password" subtitle="Enter your email and we will send reset instructions." footer={<Link href="/login" className="font-semibold text-accent hover:text-accent2">Back to login</Link>}><AuthForm mode="forgot" /></AuthShell>;
}
