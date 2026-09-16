import AuthorsBoard from '../../components/boards/AuthorsBoard';
import { fetchPublicAuthors } from '../../services/authors';

export const metadata = {
  title: 'Authors',
  description: 'Writers and editorial bylines from the PAK CRICZONE newsroom.',
};

export default async function AuthorsPage() {
  const authors = await fetchPublicAuthors().catch(() => []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AuthorsBoard authors={authors} />
    </div>
  );
}
