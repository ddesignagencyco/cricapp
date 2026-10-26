import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '../../api/client';
import { AppText } from '../../components/ui/AppText';
import { CodeInput, Field } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { BrandMark } from '../../components/ui/Layout';
import { Glow } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, useParams } from '../../navigation/Stack';
import { isEmail, isUnverified, useAuth, usernameFrom } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AuthLayout } from './AuthLayout';

type Ref = React.ComponentRef<typeof TextInput>;

/** Primary action: blue, full width, label + arrow; a spinner while busy. */
function Submit({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Touch scale disabled={busy} onPress={onPress} style={styles.submit} accessibilityLabel={label} accessibilityState={{ busy }}>
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <AppText variant="headline" weight="700" color="#FFFFFF">
            {label}
          </AppText>
          <Icon name="arrowRight" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </>
      )}
    </Touch>
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

/** Password guidance that ticks off as you type. The API requires the first rule. */
const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 6 characters', test: p => p.length >= 6 },
  { label: 'One uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'One number', test: p => /\d/.test(p) },
  { label: 'One special character', test: p => /[^A-Za-z0-9]/.test(p) },
];

function Requirements({ password }: { password: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.rules} accessibilityLabel="Password requirements">
      {RULES.map(r => {
        const ok = r.test(password);
        return (
          <View key={r.label} style={styles.rule}>
            <View style={[styles.ruleDot, { backgroundColor: ok ? colors.success : colors.elevated, borderColor: ok ? colors.success : colors.border }]}>
              {ok ? <Icon name="check" size={11} color="#FFFFFF" /> : null}
            </View>
            <AppText variant="caption" color={ok ? 'text' : 'textMuted'} style={{ marginLeft: 8 }}>
              {r.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** Mask the middle of an address for the "sent to" line: al***@gmail.com */
const masked = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(4, name.length - 2)))}@${domain}`;
};

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
      subtitle="Sign in to your account and stay connected with cricket."
      footer={<Switcher text="Don’t have an account?" action="Sign up" onPress={() => nav.replace('SignUp')} />}
    >
      <Notice tone={notice?.tone ?? 'danger'} message={notice?.text} action={notice?.unverified ? 'Send code and verify' : undefined} onAction={verifyNow} />
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
        <AppText variant="label" weight="700" color="accent">
          Forgot password?
        </AppText>
      </Touch>
      <Submit label="Log in" busy={busy} onPress={submit} />
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

  const submit = async () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name';
    if (!isEmail(email)) e.email = 'Enter a valid email address';
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
      title="Create your account"
      subtitle="Join PAK CRICZONE for personalised cricket updates, predictions and more."
      footer={<Switcher text="Already have an account?" action="Log in" onPress={() => nav.replace('SignIn')} />}
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
        label="Email address"
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
        placeholder="Create a password"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="done"
      />
      {password ? <Requirements password={password} /> : null}
      <Touch onPress={() => setAgree(a => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} style={styles.agree}>
        <View style={[styles.check, { borderColor: errors.agree ? colors.danger : agree ? colors.brand : colors.border, backgroundColor: agree ? colors.brand : 'transparent' }]}>
          {agree ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
        </View>
        <AppText variant="label" color="textSecondary" style={{ flex: 1, marginLeft: 10 }}>
          I agree to the <AppText variant="label" weight="700" color="accent">Terms &amp; Conditions</AppText> and{' '}
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
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email address and we’ll send you a 6-digit code to reset your password."
      footer={<Switcher text="Remember your password?" action="Log in" onPress={() => nav.replace('SignIn')} />}
    >
      <Notice tone="danger" message={formError} />
      <Field
        label="Email address"
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
      <View style={{ height: space.sm }} />
      <Submit label="Send code" busy={busy} onPress={submit} />
    </AuthLayout>
  );
}

/** Resend link with a cooldown (the API also rate-limits resends). */
function ResendCode({ onResend }: { onResend: () => Promise<void> }) {
  const [wait, setWait] = useState(45);
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
          Resend code in 0:{String(wait).padStart(2, '0')}
        </AppText>
      ) : (
        <View style={styles.switcher}>
          <AppText variant="label" color="textSecondary">
            Didn’t receive the code?{' '}
          </AppText>
          <Touch
            disabled={sending}
            hitSlop={10}
            onPress={async () => {
              setSending(true);
              try {
                await onResend();
                setWait(45);
              } finally {
                setSending(false);
              }
            }}
          >
            <AppText variant="label" weight="700" color={sending ? 'textMuted' : 'accent'}>
              {sending ? 'Sending…' : 'Resend'}
            </AppText>
          </Touch>
        </View>
      )}
    </View>
  );
}

/** Confirmation shown after verification or a password reset. */
function AllSet({ title, body, action, onPress }: { title: string; body: string; action: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.allSet, { backgroundColor: colors.background }]}>
      <Glow color={colors.brand} size={420} opacity={colors.scheme === 'dark' ? 0.2 : 0.14} style={{ right: -190, top: -170 }} />
      <View style={[styles.allSetBody, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
        <BrandMark height={44} />
        <View style={{ flex: 1 }} />
        <View style={[styles.tick, { backgroundColor: colors.success }]}>
          <Icon name="check" size={40} color="#FFFFFF" />
        </View>
        <AppText variant="display" align="center" style={{ marginTop: space.xl }}>
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center" style={{ marginTop: space.sm, maxWidth: 320 }}>
          {body}
        </AppText>
        <View style={{ flex: 1 }} />
        <View style={{ alignSelf: 'stretch' }}>
          <Submit label={action} busy={false} onPress={onPress} />
        </View>
      </View>
    </View>
  );
}

/** 6-digit verification code from the sign-up email. Signs straight in when the password is known. */
export function VerifyEmailScreen() {
  const { email, password } = useParams('VerifyEmail');
  const nav = useNavigation();
  const { verifyEmail, resendVerification, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'signedIn' | 'verified' | null>(null);

  const submit = async (value = code) => {
    if (value.length < 6) return setError('Enter all 6 digits');
    setError(undefined);
    setBusy(true);
    try {
      await verifyEmail(email, value);
      if (password) {
        await signIn(email, password);
        setDone('signedIn');
      } else {
        setDone('verified');
      }
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return done === 'signedIn' ? (
      <AllSet title="You’re all set!" body="Your account has been created successfully." action="Go to home" onPress={() => nav.reset('Tabs')} />
    ) : (
      <AllSet title="Email verified" body="Your account is ready. Log in to continue." action="Log in" onPress={() => nav.replace('SignIn')} />
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        <>
          We’ve sent a 6-digit code to{'\n'}
          <AppText variant="body" weight="700" color="text">
            {masked(email)}
          </AppText>
        </>
      }
    >
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
      <ResendCode
        onResend={async () => {
          try {
            await resendVerification(email);
            setError(undefined);
            setNotice('New code sent. Older codes no longer work.');
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      />
      <Submit label="Verify" busy={busy} onPress={() => submit()} />
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
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'signedIn' | 'reset' | null>(null);
  const passRef = useRef<Ref>(null);
  const confirmRef = useRef<Ref>(null);

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
        setDone('signedIn');
      } catch {
        setDone('reset');
      }
    } catch (err) {
      const msg = errorMessage(err);
      // A bad or expired code is the common failure; point at the code boxes.
      const codeIssue = /code|token/i.test(msg);
      setErrors(codeIssue ? { code: msg } : { form: msg });
      if (codeIssue) setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AllSet
        title="Password updated"
        body={done === 'signedIn' ? 'You’re signed in with your new password.' : 'Log in with your new password to continue.'}
        action={done === 'signedIn' ? 'Go to home' : 'Log in'}
        onPress={() => (done === 'signedIn' ? nav.reset('Tabs') : nav.replace('SignIn'))}
      />
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        <>
          Enter the code we sent to{' '}
          <AppText variant="body" weight="700" color="text">
            {masked(email)}
          </AppText>{' '}
          and choose a new password.
        </>
      }
    >
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
      <ResendCode
        onResend={async () => {
          try {
            await forgotPassword(email);
            setErrors({});
            setNotice('New code sent. Older codes no longer work.');
          } catch (err) {
            setErrors({ form: errorMessage(err) });
          }
        }}
      />
      <Field
        ref={passRef}
        label="New password"
        icon="lock"
        secure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="New password"
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <Field
        ref={confirmRef}
        label="Confirm password"
        icon="lock"
        secure
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        placeholder="Confirm password"
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Requirements password={password} />
      <Submit label="Reset password" busy={busy} onPress={submit} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  submit: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: '#3B68FC',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  switcher: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  forgot: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', marginTop: -4, marginBottom: space.lg },
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, marginBottom: space.lg },
  agree: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: space.lg },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  resend: { alignItems: 'center', marginVertical: space.lg, minHeight: 32, justifyContent: 'center' },
  rules: { gap: 8, marginTop: -4, marginBottom: space.lg },
  rule: { flexDirection: 'row', alignItems: 'center' },
  ruleDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  allSet: { flex: 1, overflow: 'hidden' },
  allSetBody: { flex: 1, alignItems: 'center', paddingHorizontal: space.xl },
  tick: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
});

/** Full name and username of the signed-in user. Email is fixed (it is the login). */
export function EditProfileScreen() {
  const nav = useNavigation();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [errors, setErrors] = useState<{ name?: string; username?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const userRef = useRef<Ref>(null);

  if (!user) return null;

  const submit = async () => {
    const handle = username.trim().toLowerCase();
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^[a-z0-9_.]{3,30}$/.test(handle)) e.username = '3–30 letters, numbers, dots or underscores';
    setErrors(e);
    if (Object.keys(e).length) return;
    const changes: { displayName?: string; username?: string } = {};
    if (name.trim() !== (user.displayName ?? '')) changes.displayName = name.trim();
    if (handle !== user.username) changes.username = handle;
    if (!Object.keys(changes).length) return nav.goBack();
    setBusy(true);
    try {
      await updateProfile(changes);
      nav.goBack();
    } catch (err) {
      const msg = errorMessage(err);
      setErrors(/username/i.test(msg) ? { username: msg } : { form: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Edit profile"
      subtitle={
        <>
          Signed in as{' '}
          <AppText variant="body" weight="700" color="text">
            {user.email}
          </AppText>
        </>
      }
    >
      <Notice tone="danger" message={errors.form} />
      <Field
        label="Full name"
        icon="user"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ali Raza"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={() => userRef.current?.focus()}
      />
      <Field
        ref={userRef}
        label="Username"
        icon="squarePen"
        value={username}
        onChangeText={setUsername}
        error={errors.username}
        placeholder="ali_raza"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View style={{ height: space.sm }} />
      <Submit label="Save changes" busy={busy} onPress={submit} />
    </AuthLayout>
  );
}
