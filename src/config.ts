import { Platform } from 'react-native';

/**
 * Base URL of the CricApp NestJS API (cric_info/apps/api, port 3001).
 *
 * - Android emulator reaches the host machine through 10.0.2.2.
 * - Physical phone on a debug build: run `adb reverse tcp:3001 tcp:3001`
 *   and use 'localhost', or rely on the LAN address below.
 * - Release (APK) builds have no Metro, so the address is baked in. For
 *   now it is this PC on the Wi-Fi network; switch to the deployed HTTPS
 *   API for launch (and drop the cleartext exception in
 *   android/app/src/main/res/xml/network_security_config.xml).
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const RELEASE_API_URL = 'http://192.168.18.23:3001';

export const API_URL = __DEV__ ? `http://${DEV_HOST}:3001` : RELEASE_API_URL;

export const REQUEST_TIMEOUT_MS = 15000;
