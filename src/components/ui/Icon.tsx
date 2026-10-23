import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Stroke icons (Lucide, ISC) pre-rendered to white PNGs at 1x/2x/3x and
 * tinted at runtime, so the app needs no SVG native module.
 */
const SOURCES = {
  activity: require('../../assets/icons/activity.png'),
  arrowDownUp: require('../../assets/icons/arrow_down_up.png'),
  arrowLeft: require('../../assets/icons/arrow_left.png'),
  arrowRight: require('../../assets/icons/arrow_right.png'),
  arrowUpRight: require('../../assets/icons/arrow_up_right.png'),
  award: require('../../assets/icons/award.png'),
  bell: require('../../assets/icons/bell.png'),
  bellRing: require('../../assets/icons/bell_ring.png'),
  bookOpen: require('../../assets/icons/book_open.png'),
  bookmark: require('../../assets/icons/bookmark.png'),
  bookmarkFill: require('../../assets/icons/bookmark_fill.png'),
  bot: require('../../assets/icons/bot.png'),
  brain: require('../../assets/icons/brain.png'),
  calculator: require('../../assets/icons/calculator.png'),
  calendar: require('../../assets/icons/calendar.png'),
  chartColumn: require('../../assets/icons/chart_column.png'),
  chartLine: require('../../assets/icons/chart_line.png'),
  chartNoAxesColumn: require('../../assets/icons/chart_no_axes_column.png'),
  check: require('../../assets/icons/check.png'),
  chevronDown: require('../../assets/icons/chevron_down.png'),
  chevronLeft: require('../../assets/icons/chevron_left.png'),
  chevronRight: require('../../assets/icons/chevron_right.png'),
  chevronUp: require('../../assets/icons/chevron_up.png'),
  circleDot: require('../../assets/icons/circle_dot.png'),
  circleHelp: require('../../assets/icons/circle_help.png'),
  clock: require('../../assets/icons/clock.png'),
  cloudRain: require('../../assets/icons/cloud_rain.png'),
  cloudSun: require('../../assets/icons/cloud_sun.png'),
  crown: require('../../assets/icons/crown.png'),
  divide: require('../../assets/icons/divide.png'),
  droplets: require('../../assets/icons/droplets.png'),
  externalLink: require('../../assets/icons/external_link.png'),
  eye: require('../../assets/icons/eye.png'),
  eyeOff: require('../../assets/icons/eye_off.png'),
  flag: require('../../assets/icons/flag.png'),
  flame: require('../../assets/icons/flame.png'),
  gauge: require('../../assets/icons/gauge.png'),
  gitCompare: require('../../assets/icons/git_compare.png'),
  globe: require('../../assets/icons/globe.png'),
  heart: require('../../assets/icons/heart.png'),
  heartFill: require('../../assets/icons/heart_fill.png'),
  history: require('../../assets/icons/history.png'),
  house: require('../../assets/icons/house.png'),
  image: require('../../assets/icons/image.png'),
  info: require('../../assets/icons/info.png'),
  landmark: require('../../assets/icons/landmark.png'),
  languages: require('../../assets/icons/languages.png'),
  layers: require('../../assets/icons/layers.png'),
  layoutGrid: require('../../assets/icons/layout_grid.png'),
  list: require('../../assets/icons/list.png'),
  listOrdered: require('../../assets/icons/list_ordered.png'),
  lock: require('../../assets/icons/lock.png'),
  logOut: require('../../assets/icons/log_out.png'),
  mail: require('../../assets/icons/mail.png'),
  mapPin: require('../../assets/icons/map_pin.png'),
  medal: require('../../assets/icons/medal.png'),
  messageCircle: require('../../assets/icons/message_circle.png'),
  mic: require('../../assets/icons/mic.png'),
  minus: require('../../assets/icons/minus.png'),
  monitor: require('../../assets/icons/monitor.png'),
  moon: require('../../assets/icons/moon.png'),
  newspaper: require('../../assets/icons/newspaper.png'),
  percent: require('../../assets/icons/percent.png'),
  play: require('../../assets/icons/play.png'),
  plus: require('../../assets/icons/plus.png'),
  radio: require('../../assets/icons/radio.png'),
  refreshCw: require('../../assets/icons/refresh_cw.png'),
  scale: require('../../assets/icons/scale.png'),
  search: require('../../assets/icons/search.png'),
  send: require('../../assets/icons/send.png'),
  settings: require('../../assets/icons/settings.png'),
  share2: require('../../assets/icons/share_2.png'),
  shield: require('../../assets/icons/shield.png'),
  shieldCheck: require('../../assets/icons/shield_check.png'),
  sigma: require('../../assets/icons/sigma.png'),
  slidersHorizontal: require('../../assets/icons/sliders_horizontal.png'),
  smartphone: require('../../assets/icons/smartphone.png'),
  sparkles: require('../../assets/icons/sparkles.png'),
  squarePen: require('../../assets/icons/square_pen.png'),
  star: require('../../assets/icons/star.png'),
  starFill: require('../../assets/icons/star_fill.png'),
  sun: require('../../assets/icons/sun.png'),
  swords: require('../../assets/icons/swords.png'),
  table2: require('../../assets/icons/table_2.png'),
  target: require('../../assets/icons/target.png'),
  thermometer: require('../../assets/icons/thermometer.png'),
  ticket: require('../../assets/icons/ticket.png'),
  timer: require('../../assets/icons/timer.png'),
  trendingDown: require('../../assets/icons/trending_down.png'),
  trendingUp: require('../../assets/icons/trending_up.png'),
  trendingUpDown: require('../../assets/icons/trending_up_down.png'),
  triangleAlert: require('../../assets/icons/triangle_alert.png'),
  trophy: require('../../assets/icons/trophy.png'),
  tv: require('../../assets/icons/tv.png'),
  user: require('../../assets/icons/user.png'),
  userPlus: require('../../assets/icons/user_plus.png'),
  users: require('../../assets/icons/users.png'),
  video: require('../../assets/icons/video.png'),
  wandSparkles: require('../../assets/icons/wand_sparkles.png'),
  wind: require('../../assets/icons/wind.png'),
  x: require('../../assets/icons/x.png'),
  zap: require('../../assets/icons/zap.png'),
} as const;

export type IconName = keyof typeof SOURCES;

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<ImageStyle>;
}

export function Icon({ name, size = 22, color, style }: IconProps) {
  return (
    <Image
      source={SOURCES[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      accessibilityIgnoresInvertColors
    />
  );
}
