import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { CodeInput, Field, Strength } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation, useParams } from '../../navigation/Stack';
import { isEmail, passwordStrength, useAuth } from '../../state/auth';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AuthLayout } from './AuthLayout';

function Submit({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return busy ? (
    <View style={styles.busy}>
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

function FormError({ message }: { message?: string }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View style={[styles.formError, { backgroundColor: colors.dangerSoft }]} accessibilityLiveRegion="assertive">
      <Icon name="triangleAlert" size={16} color={colors.danger} />
      <AppText variant="label" color="danger" style={{ marginLeft: 8, flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

export function SignInScreen() {
  const nav = useNavigation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const passRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const submit = async () => {
    const e: typeof errors = {};
    if (!isEmail(email)) e.email = 'Enter a valid email address';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      nav.goBack();
    } catch {
      setErrors({ form: 'We couldn’t sign you in. Check your details and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to sync favourites, alerts and comments."
      footer={<Switcher text="New to PAK CRICZONE?" action="Create account" onPress={() => nav.replace('SignUp')} />}
    >
      <FormError message={errors.form} />
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; agree?: string }>({});
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const score = passwordStrength(password);

  const submit = async () => {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = 'Enter your name';
    if (!isEmail(email)) e.email = 'Enter a valid email address';
    if (score < 2) e.password = 'Choose a stronger password';
    if (!agree) e.agree = 'Please accept the terms to continue';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    // The account is created after the emailed code is confirmed.
    setTimeout(() => {
      setBusy(false);
      nav.navigate('VerifyCode', { email: email.trim(), purpose: 'signup', name: name.trim() });
    }, 600);
  };

  return (
    <AuthLayout
      compactHeader
      title="Create account"
      subtitle="Free, and it takes a minute."
      footer={<Switcher text="Already have an account?" action="Sign in" onPress={() => nav.replace('SignIn')} />}
    >
      <Field
        label="Full name"
        icon="user"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Ali Raza"
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
        placeholder="At least 8 characters"
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
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = () => {
    if (!isEmail(email)) return setError('Enter the email you signed up with');
    setError(undefined);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      nav.navigate('VerifyCode', { email: email.trim(), purpose: 'reset' });
    }, 600);
  };
  return (
    <AuthLayout title="Reset password" subtitle="We’ll email you a 6-digit code to set a new password.">
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

export function VerifyCodeScreen() {
  const { email, purpose, name } = useParams('VerifyCode');
  const nav = useNavigation();
  const { signUp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async () => {
    if (code.length < 6) return setError('Enter all 6 digits');
    setError(undefined);
    setBusy(true);
    if (purpose === 'signup') {
      await signUp(name ?? email.split('@')[0], email, '');
      setBusy(false);
      nav.reset('Tabs', { tab: 'more' });
    } else {
      setBusy(false);
      nav.replace('ResetPassword', { email });
    }
  };

  // Submit as soon as the last digit lands.
  useEffect(() => {
    if (code.length === 6) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthLayout title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
      <CodeInput value={code} onChange={setCode} error={!!error} />
      {error ? (
        <AppText variant="caption" color="danger" style={{ marginTop: 8 }}>
          {error}
        </AppText>
      ) : null}
      <View style={{ height: space.xl }} />
      <Submit label={purpose === 'signup' ? 'Verify and continue' : 'Continue'} busy={busy} onPress={submit} />
      <View style={styles.resend}>
        {wait > 0 ? (
          <AppText variant="label" color="textMuted" tabular>
            Resend code in 0:{String(wait).padStart(2, '0')}
          </AppText>
        ) : (
          <Touch onPress={() => setWait(30)} hitSlop={10}>
            <AppText variant="label" weight="700" color="accent">
              Resend code
            </AppText>
          </Touch>
        )}
      </View>
    </AuthLayout>
  );
}

export function ResetPasswordScreen() {
  const nav = useNavigation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);
  const score = passwordStrength(password);
  const confirmRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const submit = () => {
    const e: typeof errors = {};
    if (score < 2) e.password = 'Choose a stronger password';
    if (confirm !== password) e.confirm = 'Passwords don’t match';
    setErrors(e);
    if (!Object.keys(e).length) setDone(true);
  };

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password.">
        <Button label="Sign in" onPress={() => nav.replace('SignIn')} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="New password" subtitle="Pick something you haven’t used here before.">
      <Field
        label="New password"
        icon="lock"
        secure
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        autoFocus
      />
      {password ? <Strength score={score} /> : null}
      <Field
        ref={confirmRef}
        label="Confirm password"
        icon="lock"
        secure
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Submit label="Update password" busy={false} onPress={submit} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  busy: { height: 52, borderRadius: radius.md, backgroundColor: '#3B68FC', alignItems: 'center', justifyContent: 'center' },
  switcher: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  forgot: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', marginTop: -4, marginBottom: space.md },
  formError: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.md, marginBottom: space.lg },
  agree: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: space.md },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  resend: { alignItems: 'center', marginTop: space.lg, minHeight: 40, justifyContent: 'center' },
});
