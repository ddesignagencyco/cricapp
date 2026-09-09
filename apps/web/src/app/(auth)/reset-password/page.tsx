import Link from 'next/link';
import AuthForm from '../../../components/auth/AuthForm';
import AuthShell from '../../../components/auth/AuthShell';

export const metadata = {
  title: 'Reset password',
  description: 'Set a new PakCricZone password.',
  robots: { index: false, follow: false },
};

interface ResetPageProps {
  searchParams: Promise<{ token?: string; tid?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const params = await searchParams;
  return <AuthShell title="Reset password" subtitle="Choose a new password for your account." footer={<span>Back to <Link href="/login" className="font-semibold text-accent hover:text-accent2">login</Link></span>}><AuthForm mode="reset" token={params.token} tokenId={params.tid} /></AuthShell>;
}
