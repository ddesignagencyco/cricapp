import Link from 'next/link';
import AuthShell from '../../components/auth/AuthShell';
import AuthForm from '../../components/auth/AuthForm';

export const metadata = {
  title: 'Forgot password',
  description: 'Reset your PAK CRICZONE password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <>
          Remember your password?{' '}
          <Link href="/signin" className="font-semibold text-accent hover:text-accent2">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
