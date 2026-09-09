import Link from 'next/link';
import AuthShell from '../../components/auth/AuthShell';
import AuthForm from '../../components/auth/AuthForm';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to your PAK CRICZONE account.',
};

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Enter your details to continue."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-accent hover:text-accent2">
            Sign up
          </Link>
        </>
      }
    >
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
