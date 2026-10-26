import WatchScreen from '../screens/media/PlayerScreen';
import { ContactScreen, EditorialScreen } from '../screens/editorial/EditorialScreens';
import StreamsScreen from '../screens/streams/StreamsScreen';
import TournamentsScreen from '../screens/entity/TournamentsScreen';
import type { ComponentType } from 'react';
import type { RouteName } from './routes';
import TabsScreen from '../screens/TabsScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { ScheduleScreen } from '../screens/live/LiveScreen';
import MatchCentreScreen from '../screens/match/MatchCentreScreen';
import ArticleScreen from '../screens/news/ArticleScreen';
import { NewsSectionScreen } from '../screens/news/NewsScreen';
import PredictionScreen from '../screens/predict/PredictionScreen';
import PakistanScreen from '../screens/hubs/PakistanScreen';
import PslScreen from '../screens/hubs/PslScreen';
import TeamScreen from '../screens/entity/TeamScreen';
import PlayerScreen from '../screens/entity/PlayerScreen';
import SeriesScreen from '../screens/entity/SeriesScreen';
import RankingsScreen from '../screens/stats/RankingsScreen';
import ToolsScreen from '../screens/tools/ToolsScreen';
import ToolScreen from '../screens/tools/ToolScreen';
import CompareScreen from '../screens/tools/CompareScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ShortsScreen from '../screens/shorts/ShortsScreen';
import { AlertsScreen, OddsScreen, SettingsScreen } from '../screens/settings/SettingsScreens';
import FavouritesScreen from '../screens/favourites/FavouritesScreen';
import { GalleryScreen, MediaViewerScreen } from '../screens/gallery/GalleryScreen';
import CommentsScreen from '../screens/comments/CommentsScreen';
import { EditProfileScreen, ForgotPasswordScreen, ResetPasswordScreen, SignInScreen, SignUpScreen, VerifyEmailScreen } from '../screens/auth/AuthScreens';

export const screens: { [K in RouteName]: ComponentType } = {
  Onboarding: OnboardingScreen,
  Tabs: TabsScreen,
  Match: MatchCentreScreen,
  Article: ArticleScreen,
  Team: TeamScreen,
  Player: PlayerScreen,
  Series: SeriesScreen,
  Pakistan: PakistanScreen,
  Psl: PslScreen,
  Prediction: PredictionScreen,
  Rankings: RankingsScreen,
  Tools: ToolsScreen,
  Tool: ToolScreen,
  Compare: CompareScreen,
  Search: SearchScreen,
  Settings: SettingsScreen,
  Alerts: AlertsScreen,
  Favourites: FavouritesScreen,
  Gallery: GalleryScreen,
  MediaViewer: MediaViewerScreen,
  Comments: CommentsScreen,
  Odds: OddsScreen,
  Schedule: ScheduleScreen,
  Shorts: ShortsScreen,
  NewsSection: NewsSectionScreen,
  SignIn: SignInScreen,
  SignUp: SignUpScreen,
  ForgotPassword: ForgotPasswordScreen,
  VerifyEmail: VerifyEmailScreen,
  ResetPassword: ResetPasswordScreen,
  EditProfile: EditProfileScreen,
  Streams: StreamsScreen,
  Watch: WatchScreen,
  Editorial: EditorialScreen,
  Contact: ContactScreen,
  Tournaments: TournamentsScreen,
};
