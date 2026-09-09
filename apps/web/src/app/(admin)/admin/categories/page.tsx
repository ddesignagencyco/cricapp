import CategoryManager from '../../../../components/admin/CategoryManager';

export const metadata = {
  title: 'Categories | CMS Admin',
  description: 'Manage news categories on PakCricZone',
};

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
