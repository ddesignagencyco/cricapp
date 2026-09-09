import Link from 'next/link';
import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Login',
  description: 'Sign in to follow matches, teams and cricket updates.',
};

export default function LoginPage() {
  return <AuthShell title="Welcome back" subtitle="Sign in to follow matches, teams and cricket updates." footer={<span>New to PakCricZone? <Link href="/register" className="font-semibold text-accent hover:text-accent2">Create an account</Link></span>}><AuthForm mode="login" /></AuthShell>;
}
