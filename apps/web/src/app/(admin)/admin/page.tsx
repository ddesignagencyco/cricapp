import AdminDashboard from '../../../components/admin/AdminDashboard';

export const metadata = {
  title: 'CMS Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return <AdminDashboard />;
}
