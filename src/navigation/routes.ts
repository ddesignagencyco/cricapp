import type { NewsCategory } from '../data/types';
import type { TabKey } from './tabs';

/** Every screen and its params. */
export interface Routes {
  Onboarding: undefined;
  Tabs: { tab?: TabKey } | undefined;
  Match: { id: string; tab?: string };
  Article: { id: string };
  Team: { id: string };
  Player: { id: string };
  Series: { id: string };
  Pakistan: undefined;
  Psl: undefined;
  Prediction: { id: string };
  Rankings: undefined;
  Tools: undefined;
  Tool: { id: string };
  Compare: { kind: 'players' | 'teams'; a?: string; b?: string };
  Search: undefined;
  Settings: undefined;
  Alerts: undefined;
  Favourites: undefined;
  Gallery: undefined;
  Comments: { thread: string; title: string };
  MediaViewer: { id: string; index?: number };
  Odds: undefined;
  Schedule: undefined;
  /** Full-screen reels viewer, opened at a given short. */
  Shorts: { id: string };
  NewsSection: { title: string; categories: NewsCategory[] };
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  /** 6-digit code from the verification email. `password` (kept in memory only) signs straight in afterwards. */
  VerifyEmail: { email: string; password?: string; sent?: boolean };
  /** Code from the reset email plus the new password, sent together. */
  ResetPassword: { email: string };
  /** Name and username of the signed-in user (PATCH /auth/me). */
  EditProfile: undefined;
  Streams: undefined;
  /** In-app player for a stream, video or watch page. */
  Watch: { url: string; title: string; subtitle?: string };
  /** A policy page: CMS content, or the website's built-in copy. */
  Editorial: { slug: string; title: string };
  Contact: undefined;
  Tournaments: undefined;
}

export type RouteName = keyof Routes;
