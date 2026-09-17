import type { CSSProperties, ElementType, ReactNode } from 'react';
import { newsLocale } from '../utils/locale';

interface NewsCopyProps {
  language?: string | null;
  text?: string | null;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function NewsCopy({
  language,
  text,
  as: Tag = 'p',
  className = '',
  style,
  children,
}: NewsCopyProps) {
  const sample = text ?? (typeof children === 'string' ? children : '');
  const locale = newsLocale(language, sample);
  return (
    <Tag dir={locale.dir} lang={locale.lang} className={`news-copy ${className}`.trim()} style={style}>
      {children}
    </Tag>
  );
}
