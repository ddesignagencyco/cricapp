import Link from 'next/link';
import AuthShell from '../../components/auth/AuthShell';
import AuthForm from '../../components/auth/AuthForm';

export const metadata = {
  title: 'Sign up',
  description: 'Create a PAK CRICZONE account.',
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Join PAK CRICZONE for live scores and more."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-accent hover:text-accent2">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
