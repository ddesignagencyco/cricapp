'use client';

import {
  Children,
  Fragment,
  isValidElement,
  memo,
  useId,
  useMemo,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import Select, { type GroupBase, type StylesConfig } from 'react-select';

export type SelectOption = { value: string; label: string; isDisabled?: boolean };
type Group = GroupBase<SelectOption> & { label: string };
type Variant = 'admin' | 'site';

/* ─── Themes (CSS variables, so light/dark follow the site) ─── */

function themeStyles(variant: Variant, invalid: boolean): StylesConfig<SelectOption, false, Group> {
  const admin = variant === 'admin';
  const bg = admin ? 'var(--admin-input-bg)' : 'var(--color-secondary)';
  const border = admin ? 'var(--admin-border)' : 'var(--color-lborder)';
  const text = admin ? 'var(--admin-text)' : 'var(--color-mtext)';
  const muted = admin ? 'var(--admin-text-muted)' : 'var(--color-stext)';
  const menuBg = admin ? 'var(--admin-card)' : 'var(--color-card)';
  const accent = admin ? 'var(--admin-accent)' : 'var(--color-accent)';
  const danger = admin ? 'var(--admin-danger)' : 'var(--color-danger, #dc2626)';
  return {
    control: (base, state) => ({
      ...base,
      minHeight: admin ? 38 : 42,
      backgroundColor: bg,
      borderColor: invalid ? danger : state.isFocused ? 'var(--color-focus-ring)' : border,
      borderRadius: 'var(--radius-md)',
      boxShadow: state.isFocused ? '0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 28%, transparent)' : 'none',
      fontSize: admin ? '0.8125rem' : '0.875rem',
      fontWeight: admin ? 500 : 600,
      opacity: state.isDisabled ? 0.6 : 1,
      '&:hover': { borderColor: invalid ? danger : admin ? 'var(--admin-border-strong)' : border },
    }),
    valueContainer: (base) => ({ ...base, padding: '0 0.65rem' }),
    singleValue: (base) => ({ ...base, color: text, fontWeight: 600 }),
    input: (base) => ({ ...base, color: text }),
    placeholder: (base) => ({ ...base, color: muted }),
    menu: (base) => ({
      ...base,
      backgroundColor: menuBg,
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--elevation-overlay)',
      overflow: 'hidden',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 70 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected || state.isFocused ? accent : menuBg,
      color: state.isSelected || state.isFocused ? 'var(--color-brand-fg)' : text,
      fontSize: admin ? '0.8125rem' : '0.875rem',
      fontWeight: 500,
      padding: '8px 12px',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      opacity: state.isDisabled ? 0.5 : 1,
    }),
    groupHeading: (base) => ({ ...base, color: muted, fontSize: '0.6875rem', fontWeight: 700 }),
    dropdownIndicator: (base) => ({ ...base, color: muted, padding: '0 8px' }),
    indicatorSeparator: () => ({ display: 'none' }),
    noOptionsMessage: (base) => ({ ...base, color: muted }),
  };
}

/** Styles are built once per (variant, invalid) pair, not on every render. */
const styleCache = new Map<string, StylesConfig<SelectOption, false, Group>>();
export function selectStyles(variant: Variant, invalid = false) {
  const key = `${variant}:${invalid}`;
  let styles = styleCache.get(key);
  if (!styles) {
    styles = themeStyles(variant, invalid);
    styleCache.set(key, styles);
  }
  return styles;
}

/* ─── <option>/<optgroup> children → react-select options ─── */

type OptionProps = { value?: string | number; children?: ReactNode; label?: string; disabled?: boolean };

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : isValidElement(child) ? textOf((child.props as { children?: ReactNode }).children) : ''))
    .join('');
}

function toOption(el: ReactElement<OptionProps>): SelectOption {
  const label = el.props.label ?? textOf(el.props.children);
  return { value: String(el.props.value ?? label), label, isDisabled: Boolean(el.props.disabled) };
}

/** Reads the same markup a native <select> takes, so existing call sites keep working. */
export function optionsFromChildren(children: ReactNode): Array<SelectOption | Group> {
  const out: Array<SelectOption | Group> = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') out.push(toOption(child as ReactElement<OptionProps>));
    else if (child.type === 'optgroup') {
      const props = child.props as { label?: string; children?: ReactNode };
      const options: SelectOption[] = [];
      Children.forEach(props.children, (opt) => {
        if (isValidElement(opt) && opt.type === 'option') options.push(toOption(opt as ReactElement<OptionProps>));
      });
      out.push({ label: props.label ?? '', options });
    } else if (child.type === Fragment) {
      out.push(...optionsFromChildren((child.props as { children?: ReactNode }).children));
    }
  });
  return out;
}

function flatten(list: Array<SelectOption | Group>): SelectOption[] {
  return list.flatMap((item) => ('options' in item ? [...item.options] : [item]));
}

/* ─── Component ─── */

export type SiteSelectProps = {
  id?: string;
  name?: string;
  value: string | number | null | undefined;
  /** Called with the chosen option's value. */
  onValueChange: (_value: string) => void;
  /** Either `options`, or native-style <option>/<optgroup> children. */
  options?: Array<SelectOption | Group>;
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  variant?: Variant;
  isSearchable?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
};

/**
 * The site's one dropdown (react-select), replacing native <select> everywhere.
 * Options are memoised, search turns on automatically for long lists, and the menu
 * renders in a portal so overflow-hidden cards and tables never clip it.
 */
function SiteSelectImpl({
  id,
  name,
  value,
  onValueChange,
  options,
  children,
  placeholder,
  disabled,
  invalid = false,
  variant = 'site',
  isSearchable,
  className,
  ...aria
}: SiteSelectProps) {
  // Children change identity every render; key the memo on their content instead.
  const list = useMemo(() => options ?? optionsFromChildren(children), [options, children]);
  const flat = useMemo(() => flatten(list), [list]);
  const selected = useMemo(
    () => flat.find((option) => option.value === String(value ?? '')) ?? null,
    [flat, value],
  );
  // react-select's generated ids differ between server and browser; a React id keeps
  // hydration matching.
  const instanceId = useId();
  const portal = typeof document === 'undefined' ? null : document.body;

  return (
    <Select<SelectOption, false, Group>
      instanceId={instanceId}
      inputId={id}
      name={name}
      className={className}
      classNamePrefix="react-select"
      options={list}
      value={selected}
      onChange={(option) => onValueChange(option?.value ?? '')}
      isDisabled={disabled}
      isSearchable={isSearchable ?? flat.length > 8}
      isOptionDisabled={(option) => Boolean(option.isDisabled)}
      placeholder={placeholder ?? 'Select…'}
      menuPortalTarget={portal}
      menuPlacement="auto"
      styles={selectStyles(variant, invalid)}
      aria-invalid={invalid || undefined}
      aria-label={aria['aria-label']}
      aria-describedby={aria['aria-describedby']}
    />
  );
}

const SiteSelect = memo(SiteSelectImpl);
export default SiteSelect;

/** Native-select-shaped change event, for call sites written against <select>. */
export function selectChangeEvent(value: string, name?: string): ChangeEvent<HTMLSelectElement> {
  const target = { value, name: name ?? '' } as HTMLSelectElement;
  return { target, currentTarget: target } as ChangeEvent<HTMLSelectElement>;
}
