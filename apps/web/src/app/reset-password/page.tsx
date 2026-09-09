import Link from 'next/link';
import AuthShell from '../../components/auth/AuthShell';
import AuthForm from '../../components/auth/AuthForm';

export const metadata = {
  title: 'Reset password',
  description: 'Set a new password for your PAK CRICZONE account.',
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          Back to{' '}
          <Link href="/signin" className="font-semibold text-accent hover:text-accent2">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="reset" />
    </AuthShell>
  );
}
