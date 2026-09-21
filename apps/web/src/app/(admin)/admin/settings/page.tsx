'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Plus, Trash2 } from 'lucide-react';
import {
  AdminField,
  AdminInput,
  AdminPageHeader,
} from '../../../../components/admin/AdminShared';
import SocialBrandIcon from '../../../../components/admin/SocialBrandIcon';
import { fetchSiteSettings, saveSiteSettings, type SiteSocialLink } from '../../../../services/siteSettings';
import { SOCIAL_PLATFORMS } from '../../../../lib/socialPlatforms';
import {
  COUNTRIES,
  WEEK_DAYS,
  countryByName,
  emptyWorkingHours,
  formatPhoneNumber,
  isValidEmail,
  isValidMapsUrl,
  isValidPhone,
  isValidWorkingHours,
  parseWorkingHours,
  serializeWorkingHours,
  validateSocialValue,
  type WeekDayId,
  type WorkingHoursValue,
} from '../../../../lib/siteContact';

type FormState = {
  email: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  mapsUrl: string;
  hours: WorkingHoursValue;
  socials: SiteSocialLink[];
};

type FieldErrors = Partial<Record<keyof FormState | 'socials', string>> & {
  socialsByIndex?: string[];
};

const EMPTY: FormState = {
  email: '',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  country: 'Pakistan',
  mapsUrl: '',
  hours: emptyWorkingHours(),
  socials: [{ platform: 'facebook', value: '' }],
};

type PlatformOption = {
  value: string;
  label: string;
  placeholder: string;
};

type CountryOption = {
  value: string;
  label: string;
  dial: string;
};

const selectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '38px',
    backgroundColor: 'var(--admin-input-bg)',
    borderColor: state.isFocused ? 'var(--color-focus-ring)' : 'var(--admin-border)',
    borderRadius: '0.375rem',
    boxShadow: state.isFocused
      ? '0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 28%, transparent)'
      : 'none',
    fontSize: '0.8125rem',
    '&:hover': { borderColor: 'var(--admin-border-strong)' },
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected || state.isFocused ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
    color: state.isSelected || state.isFocused ? 'var(--color-brand-fg)' : 'var(--admin-text)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    padding: '8px 12px',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.375rem',
    boxShadow: 'var(--elevation-overlay)',
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
      {message}
    </p>
  );
}

function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email.';
  if (!isValidEmail(form.supportEmail)) errors.supportEmail = 'Enter a valid support email.';
  if (!isValidPhone(form.phone)) errors.phone = 'Enter a phone number with country code (10–15 digits).';
  if (!isValidPhone(form.whatsapp)) errors.whatsapp = 'Enter a WhatsApp number with country code (10–15 digits).';
  if (!isValidMapsUrl(form.mapsUrl)) errors.mapsUrl = 'Use a Google Maps https link.';
  if (!isValidWorkingHours(form.hours)) errors.hours = 'Closing time must be after opening time.';
  const socialsByIndex = form.socials.map((item) =>
    item.value.trim() ? validateSocialValue(item.platform, item.value) : '',
  );
  if (socialsByIndex.some(Boolean)) {
    errors.socials = 'Fix the highlighted social links.';
    errors.socialsByIndex = socialsByIndex;
  }
  return errors;
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
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
          country: settings.country || 'Pakistan',
          mapsUrl: settings.mapsUrl || '',
          hours: parseWorkingHours(settings.workingHours) || emptyWorkingHours(),
          socials: settings.socials?.length ? settings.socials : [{ platform: 'facebook', value: '' }],
        });
      })
      .catch(() => {
        /* Keep the form usable if settings have not loaded. */
      });
  }, []);

  const usedPlatforms = useMemo(() => new Set(form.socials.map((item) => item.platform)), [form.socials]);
  const unusedPlatforms = SOCIAL_PLATFORMS.filter((item) => !usedPlatforms.has(item.id));
  const countryOptions: CountryOption[] = COUNTRIES.map((item) => ({
    value: item.name,
    label: `${item.name} (${item.dial})`,
    dial: item.dial,
  }));
  const selectedCountry =
    countryOptions.find((item) => item.value === form.country) ||
    (form.country ? { value: form.country, label: form.country, dial: countryByName(form.country)?.dial || '' } : null);

  const setField = (key: keyof Omit<FormState, 'socials' | 'hours'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setCountry = (name: string) => {
    setForm((prev) => ({
      ...prev,
      country: name,
      phone: prev.phone.trim() ? formatPhoneNumber(prev.phone, name) : prev.phone,
      whatsapp: prev.whatsapp.trim() ? formatPhoneNumber(prev.whatsapp, name) : prev.whatsapp,
    }));
  };

  const toggleDay = (day: WeekDayId) => {
    setForm((prev) => {
      const days = prev.hours.days.includes(day)
        ? prev.hours.days.filter((item) => item !== day)
        : [...prev.hours.days, day];
      return { ...prev, hours: { ...prev.hours, days } };
    });
    setErrors((prev) => ({ ...prev, hours: undefined }));
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
    setErrors((prev) => ({
      ...prev,
      socials: undefined,
      socialsByIndex: prev.socialsByIndex?.map((item, i) => (i === index ? '' : item)),
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
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some((value) => typeof value === 'string' && value)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSiteSettings({
        email: form.email.trim(),
        supportEmail: form.supportEmail.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        mapsUrl: form.mapsUrl.trim(),
        workingHours: serializeWorkingHours(form.hours),
        socials: form.socials.filter((item) => item.platform && item.value.trim()),
      });
      setForm((prev) => ({
        ...prev,
        socials: saved.socials.length ? saved.socials : [{ platform: 'facebook', value: '' }],
        hours: parseWorkingHours(saved.workingHours) || prev.hours,
      }));
      toast.success('Site settings saved.');
    } catch {
      toast.error('Could not save settings.');
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

      <form className="space-y-5" noValidate onSubmit={(e) => void onSave(e)}>
        <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Contact
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Email">
              <AdminInput type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="hello@pakcriczone.com" />
              <FieldError message={errors.email} />
            </AdminField>
            <AdminField label="Support email">
              <AdminInput type="email" value={form.supportEmail} onChange={(e) => setField('supportEmail', e.target.value)} placeholder="feedback@pakcriczone.com" />
              <FieldError message={errors.supportEmail} />
            </AdminField>
            <AdminField label="Phone" hint="Formatted with the selected country code">
              <AdminInput
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setField('phone', formatPhoneNumber(e.target.value, form.country))}
                placeholder={formatPhoneNumber('3001234567', form.country)}
              />
              <FieldError message={errors.phone} />
            </AdminField>
            <AdminField label="WhatsApp" hint="Same format as phone, with country code">
              <AdminInput
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => setField('whatsapp', formatPhoneNumber(e.target.value, form.country))}
                placeholder={formatPhoneNumber('3001234567', form.country)}
              />
              <FieldError message={errors.whatsapp} />
            </AdminField>
          </div>
          <div className="mt-3">
            <AdminField label="Working hours" hint="Pick open days, then start and end time">
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const active = form.hours.days.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${active ? 'btn-brand' : ''}`}
                      style={
                        active
                          ? undefined
                          : { border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }
                      }
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
                <label className="block text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
                  Opens
                  <AdminInput
                    type="time"
                    value={form.hours.open}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, hours: { ...prev.hours, open: e.target.value } }))
                    }
                  />
                </label>
                <label className="block text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
                  Closes
                  <AdminInput
                    type="time"
                    value={form.hours.close}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, hours: { ...prev.hours, close: e.target.value } }))
                    }
                  />
                </label>
              </div>
              <FieldError message={errors.hours} />
            </AdminField>
          </div>
        </section>

        <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Location
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Address">
              <AdminInput value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Office 12, Gulberg III" />
            </AdminField>
            <AdminField label="City">
              <AdminInput value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Lahore" />
            </AdminField>
            <AdminField label="Country" htmlFor="settings-country">
              <Select
                inputId="settings-country"
                value={selectedCountry}
                onChange={(option) => setCountry(option?.value || '')}
                options={countryOptions}
                isSearchable
                placeholder="Select country"
                classNamePrefix="react-select"
                styles={selectStyles as never}
              />
            </AdminField>
            <AdminField label="Google Maps link">
              <AdminInput value={form.mapsUrl} onChange={(e) => setField('mapsUrl', e.target.value)} placeholder="https://maps.google.com/..." />
              <FieldError message={errors.mapsUrl} />
            </AdminField>
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
            Pick a network, then paste its official URL. WhatsApp accepts a number with country code.
          </p>
          <div className="space-y-3">
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
                <div key={`${item.platform}-${index}`}>
                  <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[14rem_1fr_auto]">
                    <AdminField label="Platform" htmlFor={`social-platform-${index}`}>
                      <Select
                        inputId={`social-platform-${index}`}
                        value={selected}
                        onChange={(option) => updateSocial(index, { platform: option?.value || '' })}
                        options={options}
                        formatOptionLabel={(option) => <PlatformLabel id={option.value} label={option.label} />}
                        isSearchable={false}
                        menuPlacement="top"
                        classNamePrefix="react-select"
                        styles={selectStyles as never}
                      />
                    </AdminField>
                    <AdminField label={item.platform === 'whatsapp' ? 'WhatsApp number' : 'URL'}>
                      <AdminInput
                        value={item.value}
                        onChange={(e) =>
                          updateSocial(
                            index,
                            {
                              value:
                                item.platform === 'whatsapp'
                                  ? formatPhoneNumber(e.target.value, form.country)
                                  : e.target.value,
                            },
                          )
                        }
                        placeholder={meta?.placeholder || 'https://...'}
                      />
                    </AdminField>
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
                  <FieldError message={errors.socialsByIndex?.[index]} />
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
