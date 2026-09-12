import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Verify email',
  description: 'Verify your PakCricZone email address.',
  robots: { index: false, follow: false },
};

interface VerifyPageProps {
  searchParams: Promise<{ token?: string; tid?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  return <AuthShell title="Verify your email" subtitle="Confirm your email address to finish setting up your account."><AuthForm mode="verify" token={params.token} tokenId={params.tid} /></AuthShell>;
}
