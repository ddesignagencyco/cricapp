import Link from 'next/link';
import AuthShell from '../../components/auth/AuthShell';
import AuthForm from '../../components/auth/AuthForm';

export const metadata = {
  title: 'Verify email',
  description: 'Verify your PAK CRICZONE email address.',
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Verify email"
      subtitle="Enter the email you signed up with to confirm your account."
      footer={
        <>
          Already verified?{' '}
          <Link href="/signin" className="font-semibold text-accent hover:text-accent2">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="verify" />
    </AuthShell>
  );
}
