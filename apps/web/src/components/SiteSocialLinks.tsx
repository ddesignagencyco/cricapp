import SocialBrandIcon from './admin/SocialBrandIcon';
import { socialHref, socialLabel } from '../lib/socialPlatforms';
import type { SiteSocialLink } from '../services/siteSettings';

export default function SiteSocialLinks({
  socials,
  className = '',
}: {
  socials: SiteSocialLink[];
  className?: string;
}) {
  const links = socials
    .map((item) => ({
      platform: item.platform,
      href: socialHref(item.platform, item.value),
      label: socialLabel(item.platform),
    }))
    .filter((item) => item.href);

  if (links.length === 0) return null;

  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((item) => (
        <li key={`${item.platform}-${item.href}`}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            title={item.label}
            className={`block rounded-md ring-1 ring-lborder transition-opacity hover:opacity-90 ${
              item.platform === 'whatsapp' ? 'text-mtext' : ''
            }`}
          >
            <SocialBrandIcon id={item.platform} size={32} />
          </a>
        </li>
      ))}
    </ul>
  );
}
