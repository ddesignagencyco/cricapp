import type { Metadata } from 'next';
import CategoryManager from '../../../../components/admin/CategoryManager';

export const metadata: Metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
