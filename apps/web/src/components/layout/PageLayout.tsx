import Sidebar from './Sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
  hero?: React.ReactNode;
  showSidebar?: boolean;
  wide?: boolean;
}

export default function PageLayout({
  children,
  hero,
  showSidebar = true,
  wide = false,
}: PageLayoutProps) {
  const maxWide = wide ? 'max-w-6xl' : 'max-w-7xl';
  return (
    <div className="min-h-screen">
      {hero}
      <div className={`mx-auto ${maxWide} px-4 py-8 sm:px-6`}>
        {!showSidebar ? (
          <>{children}</>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 xl:gap-10">
            <div className="min-w-0 lg:col-span-2">{children}</div>
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20">{<Sidebar />}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { Sidebar };
