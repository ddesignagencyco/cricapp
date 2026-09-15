'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Plus, Trash2 } from 'lucide-react';
import {
  AdminInput,
  AdminPageHeader,
} from '../../../../components/admin/AdminShared';
import SocialBrandIcon from '../../../../components/admin/SocialBrandIcon';
import { fetchSiteSettings, saveSiteSettings, type SiteSocialLink } from '../../../../services/siteSettings';
import { SOCIAL_PLATFORMS } from '../../../../lib/socialPlatforms';

type FormState = {
  email: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  mapsUrl: string;
  workingHours: string;
  socials: SiteSocialLink[];
};

const EMPTY: FormState = {
  email: '',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  country: '',
  mapsUrl: '',
  workingHours: '',
  socials: [{ platform: 'facebook', value: '' }],
};

type PlatformOption = {
  value: string;
  label: string;
  placeholder: string;
};

const selectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '38px',
    backgroundColor: 'var(--admin-input-bg)',
    borderColor: state.isFocused ? 'var(--admin-accent)' : 'var(--admin-border)',
    borderRadius: '0.375rem',
    boxShadow: 'none',
    fontSize: '0.8125rem',
    '&:hover': { borderColor: 'var(--admin-accent)' },
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected || state.isFocused ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
    color: state.isSelected || state.isFocused ? 'var(--color-brand-fg)' : 'var(--admin-text)',
    fontSize: '0.8125rem',
    padding: '8px 12px',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    zIndex: 30,
  }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text)', fontWeight: 600 }),
  input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text)' }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
  dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
  indicatorSeparator: (base: Record<string, unknown>) => ({ ...base, backgroundColor: 'var(--admin-border)' }),
  noOptionsMessage: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
};

function PlatformLabel({ id, label }: { id: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SocialBrandIcon id={id} size={20} />
      {label}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => {
        setForm({
          email: settings.email || '',
          supportEmail: settings.supportEmail || '',
          phone: settings.phone || '',
          whatsapp: settings.whatsapp || '',
          address: settings.address || '',
          city: settings.city || '',
          country: settings.country || '',
          mapsUrl: settings.mapsUrl || '',
          workingHours: settings.workingHours || '',
          socials: settings.socials?.length ? settings.socials : [{ platform: 'facebook', value: '' }],
        });
      })
      .catch(() => {
        /* Settings API is not live yet — keep the full form usable. */
      });
  }, []);

  const usedPlatforms = useMemo(() => new Set(form.socials.map((item) => item.platform)), [form.socials]);
  const unusedPlatforms = SOCIAL_PLATFORMS.filter((item) => !usedPlatforms.has(item.id));

  const setField = (key: keyof Omit<FormState, 'socials'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSocial = () => {
    const next = unusedPlatforms[0];
    if (!next) return;
    setForm((prev) => ({
      ...prev,
      socials: [...prev.socials, { platform: next.id, value: '' }],
    }));
  };

  const updateSocial = (index: number, patch: Partial<SiteSocialLink>) => {
    setForm((prev) => ({
      ...prev,
      socials: prev.socials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeSocial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index),
    }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveSiteSettings({
        ...form,
        socials: form.socials.filter((item) => item.platform && item.value.trim()),
      });
      setForm((prev) => ({
        ...prev,
        socials: saved.socials.length ? saved.socials : [{ platform: 'facebook', value: '' }],
      }));
      toast.success('Site settings saved.');
    } catch {
      toast.error('Settings API is not connected yet. The form is ready for when it is.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Contact details, office location and social links shown on the public site."
      />

      <form className="space-y-5" onSubmit={(e) => void onSave(e)}>
        <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Contact
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email">
              <AdminInput type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="hello@pakcriczone.com" />
            </Field>
            <Field label="Support email">
              <AdminInput type="email" value={form.supportEmail} onChange={(e) => setField('supportEmail', e.target.value)} placeholder="feedback@pakcriczone.com" />
            </Field>
            <Field label="Phone">
              <AdminInput value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+92 300 1234567" />
            </Field>
            <Field label="WhatsApp" hint="Number with country code, e.g. +923001234567">
              <AdminInput value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} placeholder="+923001234567" />
            </Field>
            <Field label="Working hours">
              <AdminInput value={form.workingHours} onChange={(e) => setField('workingHours', e.target.value)} placeholder="Mon–Fri, 10:00–18:00 PKT" />
            </Field>
          </div>
        </section>

        <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Location
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Address">
              <AdminInput value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Office 12, Gulberg III" />
            </Field>
            <Field label="City">
              <AdminInput value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Lahore" />
            </Field>
            <Field label="Country">
              <AdminInput value={form.country} onChange={(e) => setField('country', e.target.value)} placeholder="Pakistan" />
            </Field>
            <Field label="Google Maps link">
              <AdminInput value={form.mapsUrl} onChange={(e) => setField('mapsUrl', e.target.value)} placeholder="https://maps.google.com/..." />
            </Field>
          </div>
        </section>

        <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
              Social links
            </h2>
            <button
              type="button"
              onClick={addSocial}
              disabled={unusedPlatforms.length === 0}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-40"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          <p className="mb-3 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Select a network, then paste its URL or handle.
          </p>
          <div className="space-y-2">
            {form.socials.map((item, index) => {
              const meta = SOCIAL_PLATFORMS.find((platform) => platform.id === item.platform);
              const options: PlatformOption[] = SOCIAL_PLATFORMS.filter(
                (platform) => platform.id === item.platform || !usedPlatforms.has(platform.id)
              ).map((platform) => ({
                value: platform.id,
                label: platform.label,
                placeholder: platform.placeholder,
              }));
              const selected = options.find((option) => option.value === item.platform) || null;
              return (
                <div key={`${item.platform}-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[14rem_1fr_auto]">
                  <Select
                    value={selected}
                    onChange={(option) => updateSocial(index, { platform: option?.value || '' })}
                    options={options}
                    formatOptionLabel={(option) => <PlatformLabel id={option.value} label={option.label} />}
                    isSearchable={false}
                    classNamePrefix="react-select"
                    styles={selectStyles as never}
                  />
                  <AdminInput
                    value={item.value}
                    onChange={(e) => updateSocial(index, { value: e.target.value })}
                    placeholder={meta?.placeholder || 'https://...'}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    disabled={form.socials.length === 1}
                    className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md disabled:opacity-40"
                    style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-danger)' }}
                    aria-label="Remove social link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-brand rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
