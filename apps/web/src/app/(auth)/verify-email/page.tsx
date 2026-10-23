import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Verify email',
  description: 'Verify your PakCricZone email address.',
  robots: { index: false, follow: false },
};

interface VerifyPageProps {
  searchParams: Promise<{ token?: string; tid?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const fromLink = Boolean(params.token && params.tid);
  return (
    <AuthShell
      title="Verify your email"
      subtitle={
        fromLink
          ? 'Confirm your email address to finish setting up your account.'
          : 'Enter the 6-digit code we emailed you, or open the link in that email.'
      }
    >
      <AuthForm mode="verify" token={params.token} tokenId={params.tid} initialEmail={params.email} />
    </AuthShell>
  );
}
