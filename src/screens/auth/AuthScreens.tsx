import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { AppText } from '../../components/ui/AppText';
import { CodeInput, Field, Strength } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, useParams } from '../../navigation/Stack';
import { isEmail, isUnverified, passwordStrength, useAuth, usernameFrom } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AuthLayout } from './AuthLayout';

type Ref = React.ComponentRef<typeof TextInput>;

function Submit({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return busy ? (
    <View style={styles.busy} accessibilityLabel="Please wait">
      <ActivityIndicator color="#FFFFFF" />
    </View>
  ) : (
    <Button label={label} onPress={onPress} />
  );
}

function Switcher({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.switcher}>
      <AppText variant="bodySm" color="textSecondary">
        {text}{' '}
      </AppText>
      <Touch onPress={onPress} hitSlop={10}>
        <AppText variant="bodySm" weight="700" color="accent">
          {action}
        </AppText>
      </Touch>
    </View>
  );
}

function Notice({ tone, message, action, onAction }: { tone: 'danger' | 'success' | 'warning'; message?: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  if (!message) return null;
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'success' ? colors.successSoft : colors.warningSoft;
  const fg = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.warning;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityLiveRegion="assertive">
      <Icon name={tone === 'success' ? 'check' : 'triangleAlert'} size={16} color={fg} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <AppText variant="label" color={fg}>
          {message}
        </AppText>
        {action ? (
          <Touch onPress={onAction} hitSlop={8} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            <AppText variant="label" weight="700" color={fg} style={{ textDecorationLine: 'underline' }}>
              {action}
            </AppText>
          </Touch>
        ) : null}
      </View>
    </View>
  );
}

export function SignInScreen() {
  const nav = useNavigation();
  const { signIn, resendVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState<{ tone: 'danger' | 'warning' | 'success'; text: string; unverified?: boolean }>();
  const [busy, setBusy] = useState(false);
  const passRef = useRef<Ref>(null);

  const submit = async () => {
    const e: typeof errors = {};
    if (!isEmail(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Enter your password';
    setErrors(e);
    setNotice(undefined);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav.goBack();
    } catch (err) {
      setNotice(
        isUnverified(err)
          ? { tone: 'warning', text: 'Your email isn’t verified yet. We’ll send a 6-digit code to finish setting up your account.', unverified: true }
          : { tone: 'danger', text: errorMessage(err) },
      );
    } finally {
      setBusy(false);
    }
  };

  // Unverified: send a fresh code, then collect it (and sign straight in after).
  const verifyNow = async () => {
    try {
      await resendVerification(email.trim());
      nav.navigate('VerifyEmail', { email: email.trim(), password, sent: true });
    } catch (err) {
      setNotice({ tone: 'danger', text: errorMessage(err) });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to sync favourites, alerts and comments."
      footer={<Switcher text="New to PAK CRICZONE?" action="Create account" onPress={() => nav.replace('SignUp')} />}
    >
      <Notice
        tone={notice?.tone ?? 'danger'}
        message={notice?.text}
        action={notice?.unverified ? 'Send code and verify' : undefined}
        onAction={verifyNow}
      />
      <Field
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passRef.current?.focus()}
      />
      <Field
        ref={passRef}
        label="Password"
        icon="lock"
        secure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Your password"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Touch onPress={() => nav.navigate('ForgotPassword')} style={styles.forgot}>
        <AppText variant="label" weight="600" color="accent">
          Forgot password?
        </AppText>
      </Touch>
      <Submit label="Sign in" busy={busy} onPress={submit} />
      <Button label="Continue as guest" variant="ghost" onPress={nav.goBack} style={{ marginTop: space.sm }} />
    </AuthLayout>
  );
}

export function SignUpScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agree?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<Ref>(null);
  const passRef = useRef<Ref>(null);
  const score = passwordStrength(password);

  const submit = async () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name';
    if (!isEmail(email)) e.email = 'Enter a valid email address';
    // The API requires 6+; the meter nudges towards stronger.
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!agree) e.agree = 'Please accept the terms to continue';
    setErrors(e);
    setFormError(undefined);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      // The API needs a unique username; derive one from the name so the form stays simple.
      await signUp({ name: name.trim(), username: usernameFrom(name), email: email.trim(), password });
      nav.replace('VerifyEmail', { email: email.trim(), password, sent: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      compactHeader
      title="Create account"
      subtitle="Free, and it takes a minute."
      footer={<Switcher text="Already have an account?" action="Sign in" onPress={() => nav.replace('SignIn')} />}
    >
      <Notice tone="danger" message={formError} />
      <Field
        label="Full name"
        icon="user"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ali Raza"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Field
        ref={emailRef}
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passRef.current?.focus()}
      />
      <Field
        ref={passRef}
        label="Password"
        icon="lock"
        secure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="At least 6 characters"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="done"
      />
      {password ? <Strength score={score} /> : null}
      <Touch onPress={() => setAgree(a => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} style={styles.agree}>
        <View style={[styles.check, { borderColor: errors.agree ? colors.danger : agree ? colors.brand : colors.border, backgroundColor: agree ? colors.brand : 'transparent' }]}>
          {agree ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
        </View>
        <AppText variant="label" color="textSecondary" style={{ flex: 1, marginLeft: 10 }}>
          I agree to the <AppText variant="label" weight="700" color="accent">Terms</AppText> and{' '}
          <AppText variant="label" weight="700" color="accent">Privacy Policy</AppText>
        </AppText>
      </Touch>
      {errors.agree ? (
        <AppText variant="caption" color="danger" style={{ marginTop: -6, marginBottom: space.md }}>
          {errors.agree}
        </AppText>
      ) : null}
      <Submit label="Create account" busy={busy} onPress={submit} />
    </AuthLayout>
  );
}

export function ForgotPasswordScreen() {
  const nav = useNavigation();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) return setError('Enter the email you signed up with');
    setError(undefined);
    setFormError(undefined);
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      nav.replace('ResetPassword', { email: email.trim() });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we’ll send a 6-digit code to reset your password.">
      <Notice tone="danger" message={formError} />
      <Field
        label="Email"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        error={error}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={submit}
        autoFocus
      />
      <Submit label="Send code" busy={busy} onPress={submit} />
    </AuthLayout>
  );
}

/** Resend link with a cooldown (the API also rate-limits resends). */
function ResendCode({ onResend, label }: { onResend: () => Promise<void>; label: string }) {
  const [wait, setWait] = useState(60);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <View style={styles.resend}>
      {wait > 0 ? (
        <AppText variant="label" color="textMuted" tabular>
          Didn’t get it? Resend in 0:{String(wait).padStart(2, '0')}
        </AppText>
      ) : (
        <Touch
          disabled={sending}
          onPress={async () => {
            setSending(true);
            try {
              await onResend();
              setWait(60);
            } finally {
              setSending(false);
            }
          }}
          hitSlop={10}
        >
          <AppText variant="label" weight="700" color={sending ? 'textMuted' : 'accent'}>
            {sending ? 'Sending…' : label}
          </AppText>
        </Touch>
      )}
    </View>
  );
}

/** Mask the middle of an address for the "sent to" line: al***@gmail.com */
const masked = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(4, name.length - 2)))}@${domain}`;
};

/** 6-digit verification code from the sign-up email. Signs straight in when the password is known. */
export function VerifyEmailScreen() {
  const { email, password, sent } = useParams('VerifyEmail');
  const nav = useNavigation();
  const { verifyEmail, resendVerification, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>(sent ? `We sent a 6-digit code to ${masked(email)}.` : undefined);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (value = code) => {
    if (value.length < 6) return setError('Enter all 6 digits');
    setError(undefined);
    setBusy(true);
    try {
      await verifyEmail(email, value);
      if (password) {
        await signIn(email, password);
        nav.reset('Tabs', { tab: 'more' });
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Email verified" subtitle="Your account is ready. Sign in to continue.">
        <Button label="Sign in" onPress={() => nav.replace('SignIn')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${masked(email)}. It expires soon, so use the newest email.`}>
      <Notice tone="success" message={!error ? notice : undefined} />
      <CodeInput
        value={code}
        error={!!error}
        onChange={v => {
          setCode(v);
          if (error) setError(undefined);
          // Submit as soon as the last digit lands.
          if (v.length === 6 && !busy) submit(v);
        }}
      />
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 8 }} accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : null}
      <View style={{ height: space.xl }} />
      <Submit label="Verify" busy={busy} onPress={() => submit()} />
      <ResendCode
        label="Resend code"
        onResend={async () => {
          try {
            await resendVerification(email);
            setError(undefined);
            setNotice(`New code sent to ${masked(email)}. Older codes no longer work.`);
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      />
    </AuthLayout>
  );
}

/** Reset with the emailed code and a new password — the API takes all three in one call. */
export function ResetPasswordScreen() {
  const { email } = useParams('ResetPassword');
  const nav = useNavigation();
  const { resetPassword, forgotPassword, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ code?: string; password?: string; confirm?: string; form?: string }>({});
  const [notice, setNotice] = useState<string | undefined>(`If an account exists for ${masked(email)}, we sent a 6-digit code.`);
  const [busy, setBusy] = useState(false);
  const passRef = useRef<Ref>(null);
  const confirmRef = useRef<Ref>(null);
  const score = passwordStrength(password);

  const submit = async () => {
    const e: typeof errors = {};
    if (code.length < 6) e.code = 'Enter the 6-digit code from the email';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (confirm !== password) e.confirm = 'Passwords don’t match';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await resetPassword(email, code, password);
      // The new password works straight away; sign in with it.
      try {
        await signIn(email, password);
        nav.reset('Tabs', { tab: 'more' });
      } catch {
        nav.replace('SignIn');
      }
    } catch (err) {
      const msg = errorMessage(err);
      // A bad or expired code is the common failure; point at the code boxes.
      setErrors(/code|token/i.test(msg) ? { code: msg } : { form: msg });
      if (/code|token/i.test(msg)) setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout compactHeader title="Reset password" subtitle="Enter the code from your email and choose a new password.">
      <Notice tone={errors.form ? 'danger' : 'success'} message={errors.form ?? notice} />
      <AppText variant="label" weight="600" color={errors.code ? 'danger' : 'textSecondary'} style={{ marginBottom: 6 }}>
        6-digit code
      </AppText>
      <CodeInput
        value={code}
        error={!!errors.code}
        onChange={v => {
          setCode(v);
          if (errors.code) setErrors(x => ({ ...x, code: undefined }));
          if (v.length === 6) passRef.current?.focus();
        }}
      />
      {errors.code ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 8 }}>
          {errors.code}
        </AppText>
      ) : null}
      <View style={{ height: space.lg }} />
      <Field
        ref={passRef}
        label="New password"
        icon="lock"
        secure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="At least 6 characters"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      {password ? <Strength score={score} /> : null}
      <Field
        ref={confirmRef}
        label="Confirm new password"
        icon="lock"
        secure
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Submit label="Reset password" busy={busy} onPress={submit} />
      <ResendCode
        label="Send a new code"
        onResend={async () => {
          try {
            await forgotPassword(email);
            setErrors({});
            setNotice(`New code sent to ${masked(email)}. Older codes no longer work.`);
          } catch (err) {
            setErrors({ form: errorMessage(err) });
          }
        }}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  busy: { height: 52, borderRadius: radius.md, backgroundColor: '#3B68FC', alignItems: 'center', justifyContent: 'center' },
  switcher: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  forgot: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', marginTop: -4, marginBottom: space.md },
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, marginBottom: space.lg },
  agree: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: space.md },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  resend: { alignItems: 'center', marginTop: space.lg, minHeight: 40, justifyContent: 'center' },
  mailArt: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
});
