import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

let firebaseApp: any = null;

async function getFirebaseAdmin(config: ConfigService) {
  if (firebaseApp) return firebaseApp;

  try {
    const admin = await import('firebase-admin');

    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      Logger.warn('Firebase credentials not configured — push notifications disabled', 'FCM');
      return null;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
    });

    return firebaseApp;
  } catch {
    Logger.warn('firebase-admin not available — push notifications disabled', 'FCM');
    return null;
  }
}

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger('FCM');

  constructor(private readonly config: ConfigService) {}

  async sendToDevice(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    const app = await getFirebaseAdmin(this.config);
    if (!app) {
      this.logger.warn('FCM not configured — skipping send');
      return null;
    }

    const messaging = app.messaging();
    return messaging.send({
      token: fcmToken,
      notification: { title, body },
      data,
    });
  }

  async sendToMultiple(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    const app = await getFirebaseAdmin(this.config);
    if (!app) {
      this.logger.warn('FCM not configured — skipping send');
      return null;
    }

    const messaging = app.messaging();
    return messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });
  }
}
