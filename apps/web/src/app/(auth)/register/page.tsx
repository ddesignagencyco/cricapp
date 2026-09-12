import Link from 'next/link';
import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Register',
  description: 'Create your PakCricZone account.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <AuthShell title="Create your account" subtitle="Personalize your PakCricZone experience." footer={<span>Already have an account? <Link href="/login" className="font-semibold text-accent hover:text-accent2">Sign in</Link></span>}><AuthForm mode="register" /></AuthShell>;
}
