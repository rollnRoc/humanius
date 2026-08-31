// Notification Service for Humanius HRMS Web Push & Local Notifications

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initServiceWorker();
  }

  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      this.swRegistration = registration;
      return registration;
    } catch (error) {
      console.warn('Service Worker registration error:', error);
      return null;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await this.initServiceWorker();
      }
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  public playNotificationSound() {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio context might be restricted
    }
  }

  public async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const perm = await this.requestPermission();
      if (perm !== 'granted') return false;
    }

    const {
      title,
      body,
      icon = '/favicon.png',
      badge = '/favicon.png',
      tag = 'humanius-notif',
      url = '/',
      requireInteraction = true,
    } = payload;

    this.playNotificationSound();

    try {
      if (!this.swRegistration && 'serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.ready;
      }

      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          requireInteraction,
          vibrate: [150, 50, 150, 100, 250],
          data: { url },
        } as any);
        return true;
      } else {
        // Fallback for standard browser Notification
        const notif = new Notification(title, {
          body,
          icon,
          badge,
          tag,
          requireInteraction,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      try {
        const fallbackNotif = new Notification(title, { body, icon });
        fallbackNotif.onclick = () => { window.focus(); fallbackNotif.close(); };
        return true;
      } catch {
        return false;
      }
    }
  }

  public async sendTestNotification(): Promise<boolean> {
    return this.sendNotification({
      title: '🔔 Humanius PDKS Bildirim Testi',
      body: 'Harika! Telefonunuz ve tarayıcınız Humanius anlık mesai ve geç kalma bildirimlerini almaya hazır.',
      tag: 'test-notification',
      url: '/',
    });
  }

  public async sendShiftStartReminder(shiftStartTimeStr: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const key = `humanius_notif_shift_start_${today}_${shiftStartTimeStr.replace(':', '_')}`;
    if (localStorage.getItem(key)) return false;

    const success = await this.sendNotification({
      title: '⏰ Mesai Saati Başladı',
      body: `Standart mesai saatiniz (${shiftStartTimeStr}) başladı. Lütfen PDKS ekranından mesainizi başlatınız.`,
      tag: `shift-start-${today}-${shiftStartTimeStr}`,
      url: '/',
      requireInteraction: true,
    });

    if (success) {
      localStorage.setItem(key, 'sent');
    }
    return success;
  }

  public async sendShiftLateToleranceAlert(toleranceMins: number, shiftStartTimeStr: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const key = `humanius_notif_shift_late_${today}_${shiftStartTimeStr.replace(':', '_')}_${toleranceMins}`;
    if (localStorage.getItem(key)) return false;

    const msgBody = toleranceMins > 0
      ? `Mesai başlangıcı (${shiftStartTimeStr}) üzerinden ${toleranceMins} dakikalık tolerans süresi doldu! Geç kalma kaydı oluşmaması için lütfen hemen giriş yapınız.`
      : `Mesai başlangıç saatiniz (${shiftStartTimeStr}) geldi! Henüz giriş yapmadınız, lütfen hemen mesainizi başlatınız.`;

    const success = await this.sendNotification({
      title: '⚠️ Mesai Giriş Uyarısı: Henüz Giriş Yapmadınız!',
      body: msgBody,
      tag: `shift-late-${today}-${shiftStartTimeStr}`,
      url: '/',
      requireInteraction: true,
    });

    if (success) {
      localStorage.setItem(key, 'sent');
    }
    return success;
  }

  public async sendShiftEndReminder(shiftEndTimeStr: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const key = `humanius_notif_shift_end_${today}_${shiftEndTimeStr.replace(':', '_')}`;
    if (localStorage.getItem(key)) return false;

    const success = await this.sendNotification({
      title: '🏁 Mesai Bitiş Saati Geldi',
      body: `Günlük mesai saatiniz (${shiftEndTimeStr}) doldu. Çıkış yapmayı veya fazla mesai durumunuzu kontrol etmeyi unutmayınız.`,
      tag: `shift-end-${today}-${shiftEndTimeStr}`,
      url: '/',
      requireInteraction: true,
    });

    if (success) {
      localStorage.setItem(key, 'sent');
    }
    return success;
  }
}

export const notificationService = new NotificationService();
