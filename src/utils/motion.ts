import { AccessibilityInfo } from 'react-native';

/*
 * The system "reduce motion" setting. Screen slides, the live pulse and
 * press scaling read it so the app stays still for people who turn it on.
 */
let reduced = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then(v => {
    reduced = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', v => {
  reduced = v;
});

export const reduceMotion = () => reduced;
