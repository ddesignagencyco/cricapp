import AuthGuestGuard from '../../components/auth/AuthGuestGuard';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuestGuard>{children}</AuthGuestGuard>;
}
