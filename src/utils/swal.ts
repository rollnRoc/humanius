import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Base customized SweetAlert instance
export const HumaniusSwal = Swal.mixin({
  customClass: {
    popup: 'humanius-swal-popup',
    title: 'humanius-swal-title',
    htmlContainer: 'humanius-swal-html',
    confirmButton: 'humanius-swal-confirm-btn',
    cancelButton: 'humanius-swal-cancel-btn',
    actions: 'humanius-swal-actions'
  },
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
});

/**
 * Standard Success Alert
 */
export const showSuccess = async (title: string, message?: string) => {
  return HumaniusSwal.fire({
    icon: 'success',
    title,
    html: message ? `<div class="text-sm text-gray-600 mt-1 leading-relaxed">${message}</div>` : undefined,
    confirmButtonText: 'Tamam',
    timer: 3500,
    timerProgressBar: true,
  });
};

/**
 * Standard Error Alert
 */
export const showError = async (title: string, message?: string) => {
  return HumaniusSwal.fire({
    icon: 'error',
    title,
    html: message ? `<div class="text-sm text-red-600 mt-1 leading-relaxed">${message}</div>` : undefined,
    confirmButtonText: 'Anladım',
  });
};

/**
 * Standard Warning Alert
 */
export const showWarning = async (title: string, message?: string) => {
  return HumaniusSwal.fire({
    icon: 'warning',
    title,
    html: message ? `<div class="text-sm text-amber-800 mt-1 leading-relaxed">${message}</div>` : undefined,
    confirmButtonText: 'Tamam',
  });
};

/**
 * Standard Info Alert
 */
export const showInfo = async (title: string, message?: string) => {
  return HumaniusSwal.fire({
    icon: 'info',
    title,
    html: message ? `<div class="text-sm text-blue-700 mt-1 leading-relaxed">${message}</div>` : undefined,
    confirmButtonText: 'Tamam',
  });
};

/**
 * Modern Confirmation Dialog replacing window.confirm
 */
export const showConfirm = async (options: {
  title: string;
  text?: string;
  html?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: 'warning' | 'question' | 'info' | 'error';
  isDanger?: boolean;
}): Promise<boolean> => {
  const result = await HumaniusSwal.fire({
    icon: options.icon ?? (options.isDanger ? 'warning' : 'question'),
    title: options.title,
    text: options.html ? undefined : options.text,
    html: options.html,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Evet, Onaylıyorum',
    cancelButtonText: options.cancelButtonText || 'Vazgeç',
    customClass: {
      popup: 'humanius-swal-popup',
      title: 'humanius-swal-title',
      confirmButton: options.isDanger 
        ? 'humanius-swal-danger-btn' 
        : 'humanius-swal-confirm-btn',
      cancelButton: 'humanius-swal-cancel-btn',
      actions: 'humanius-swal-actions'
    }
  });

  return result.isConfirmed;
};

/**
 * Modern Input/Prompt Dialog replacing window.prompt
 */
export const showPromptDialog = async (options: {
  title: string;
  text?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDanger?: boolean;
}): Promise<string | null> => {
  const result = await HumaniusSwal.fire({
    title: options.title,
    text: options.text,
    input: 'textarea',
    inputValue: options.inputValue || '',
    inputPlaceholder: options.inputPlaceholder || 'Açıklama giriniz...',
    inputAttributes: {
      'aria-label': 'Açıklama',
      rows: '3',
    },
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'Gönder',
    cancelButtonText: options.cancelButtonText || 'Vazgeç',
    customClass: {
      popup: 'humanius-swal-popup',
      title: 'humanius-swal-title',
      confirmButton: options.isDanger ? 'humanius-swal-danger-btn' : 'humanius-swal-confirm-btn',
      cancelButton: 'humanius-swal-cancel-btn',
      actions: 'humanius-swal-actions',
    }
  });

  if (result.isConfirmed) {
    return (result.value as string) ?? '';
  }
  return null;
};

/**
 * Toast notification for quick messages
 */
export const showToast = (title: string, icon: 'success' | 'warning' | 'error' | 'info' = 'success') => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon,
    title
  });
};

export interface ShiftStartConfirmParams {
  officeName: string;
  officeAddress?: string;
  distanceMeters?: number | null;
  radiusMeters?: number;
  isWithinGeofence?: boolean;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  toleranceMinutes: number;
  breakMinutes: number;
  shiftColor?: string;
  isLate: boolean;
  isOneHourEarly?: boolean;
  isOneHourLate?: boolean;
  currentTimeStr: string;
  currentDateStr: string;
}

/**
 * Eye-catching SweetAlert2 Confirmation Dialog for Starting a Shift
 */
export const confirmShiftStart = async (params: ShiftStartConfirmParams): Promise<boolean> => {
  const {
    officeName,
    isWithinGeofence = true,
    shiftName,
    shiftStart,
    shiftEnd,
    toleranceMinutes,
    breakMinutes,
    shiftColor = '#3b82f6',
    isLate,
    currentTimeStr,
    currentDateStr
  } = params;

  // Calculate if starting 1 hour earlier or 1 hour later than shift start
  let isOneHourEarly = params.isOneHourEarly ?? false;
  let isOneHourLate = params.isOneHourLate ?? false;

  try {
    const [sH, sM] = shiftStart.split(':').map(Number);
    const [cH, cM] = currentTimeStr.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(cH) && !isNaN(cM)) {
      const shiftTargetMin = sH * 60 + sM;
      const currentMin = cH * 60 + cM;
      const diffMin = currentMin - shiftTargetMin;
      if (diffMin < -60) {
        isOneHourEarly = true;
      } else if (diffMin > 60) {
        isOneHourLate = true;
      }
    }
  } catch (e) {
    console.warn("Time diff calculation error:", e);
  }

  const isCriticalTimeDiff = isOneHourEarly || isOneHourLate;

  // Render Status/Warning block based on 1-hour threshold
  let statusCardHtml = '';
  if (isCriticalTimeDiff) {
    // 🚨 RED WARNING CARD (if 1 hour early or 1 hour late)
    statusCardHtml = `
      <div style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 10px; padding: 8px 10px; display: flex; align-items: flex-start; gap: 8px; box-shadow: 0 1px 4px rgba(239, 68, 68, 0.1);">
        <span style="font-size: 16px; line-height: 1; margin-top: 1px;">🚨</span>
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #991b1b; text-transform: uppercase;">
            ${isOneHourEarly ? 'DİKKAT: VARDİYADAN 1 SAAT ERKEN GİRİŞ!' : 'DİKKAT: VARDİYADAN 1 SAAT GEÇ GİRİŞ!'}
          </div>
          <div style="font-size: 10px; color: #7f1d1d; margin-top: 2px; line-height: 1.35;">
            ${isOneHourEarly 
              ? `Vardiya başlangıcınız (<strong>${shiftStart}</strong>) olup, 1 saatten daha erken mesai başlatmaktasınız.`
              : `Vardiya başlangıcınızın (<strong>${shiftStart}</strong>) üzerinden 1 saatten fazla süre geçmiştir (Şu an: <strong>${currentTimeStr}</strong>).`
            }
          </div>
        </div>
      </div>
    `;
  } else if (isLate) {
    // ⚠️ YELLOW/AMBER WARNING CARD (late beyond tolerance, but <= 60 mins)
    statusCardHtml = `
      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 7px 10px; display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 16px; line-height: 1; margin-top: 1px;">⚠️</span>
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #92400e;">
            Vardiya Toleransı Aşıldı
          </div>
          <div style="font-size: 10px; color: #78350f; margin-top: 1px; line-height: 1.35;">
            Hedef saat (<strong>${shiftStart}</strong>) ve ${toleranceMinutes} dk tolerans dolduğu için <strong>Geç Kaldı</strong> işlenecektir.
          </div>
        </div>
      </div>
    `;
  } else {
    // 🟢 GREEN ON-TIME CARD
    statusCardHtml = `
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 7px 10px; display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 15px; line-height: 1; margin-top: 1px;">🟢</span>
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #166534;">
            Zamanında Giriş Yapıyorsunuz
          </div>
          <div style="font-size: 10px; color: #15803d; margin-top: 1px; line-height: 1.35;">
            Vardiya başlangıç saatinize (<strong>${shiftStart}</strong>) uygun giriş yapıyorsunuz. İyi çalışmalar!
          </div>
        </div>
      </div>
    `;
  }

  const htmlContent = `
    <div style="text-align: left; font-family: inherit; margin-top: 4px;">
      <!-- Date & Time Bar -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px 8px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px;">
        <span style="font-weight: 600; color: #475569;">📅 ${currentDateStr}</span>
        <span style="font-weight: 700; color: #0f172a; font-family: monospace; background: #e2e8f0; padding: 1px 6px; border-radius: 4px;">⏰ Saat: ${currentTimeStr}</span>
      </div>

      <!-- OFFICE & SHIFT CARDS (COMPACT 2-COL GRID) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
        <!-- OFİS -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 6px 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #15803d; text-transform: uppercase;">🏢 OFİS</span>
            <span style="font-size: 8.5px; font-weight: 700; padding: 1px 4px; border-radius: 9999px; background: ${isWithinGeofence ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'}">
              ${isWithinGeofence ? '✅ Ofis İçi' : '⚠️ Sınır Dışı'}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #14532d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${officeName}">
            ${officeName}
          </div>
        </div>

        <!-- VARDIYA -->
        <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 6px 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #4338ca; text-transform: uppercase;">⏱️ VARDİYA</span>
            <span style="font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 3px; background: ${shiftColor}; color: #ffffff;">
              Seçili
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #1e1b4b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${shiftName}">
            ${shiftName}
          </div>
        </div>
      </div>

      <!-- WORKING HOURS & BREAKS CARD -->
      <div style="background: #ffffff; border: 1.5px solid #818cf8; border-radius: 10px; padding: 6px 10px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(99, 102, 241, 0.05);">
        <div style="display: flex; align-items: center; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Başlangıç</div>
            <div style="font-size: 18px; font-weight: 900; color: #1e1b4b; font-family: monospace; line-height: 1.2;">${shiftStart}</div>
          </div>
          <div style="font-size: 15px; font-weight: 900; color: #6366f1;">➔</div>
          <div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Bitiş</div>
            <div style="font-size: 18px; font-weight: 900; color: #1e1b4b; font-family: monospace; line-height: 1.2;">${shiftEnd}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 10px; color: #475569; border-top: 1px dashed #e2e8f0; margin-top: 4px; padding-top: 3px;">
          <span>☕ <strong>${breakMinutes} dk</strong> Mola</span>
          <span>•</span>
          <span>⏳ <strong>${toleranceMinutes} dk</strong> Tolerans</span>
        </div>
      </div>

      <!-- STATUS / LATE WARNING CARD -->
      ${statusCardHtml}
    </div>
  `;

  const result = await HumaniusSwal.fire({
    title: '<div class="text-base sm:text-lg font-extrabold text-gray-900">Mesaiyi Başlatmak İstiyor Musunuz?</div>',
    html: htmlContent,
    showCancelButton: true,
    confirmButtonText: '🚀 Evet, Mesaiyi Başlat',
    cancelButtonText: 'Vazgeç',
    customClass: {
      popup: 'humanius-swal-popup !max-w-md',
      confirmButton: isCriticalTimeDiff ? 'humanius-swal-end-btn' : 'humanius-swal-start-btn',
      cancelButton: 'humanius-swal-cancel-btn',
      actions: 'humanius-swal-actions'
    }
  });

  return result.isConfirmed;
};

export interface ShiftEndConfirmParams {
  officeName: string;
  shiftName: string;
  shiftHours: string;
  startTimeStr: string;
  currentTimeStr: string;
  durationText: string;
  isEarlyExit: boolean;
  targetEndTime: string;
}

/**
 * Eye-catching SweetAlert2 Confirmation Dialog for Ending a Shift
 */
export const confirmShiftEnd = async (params: ShiftEndConfirmParams): Promise<boolean> => {
  const {
    officeName,
    shiftName,
    shiftHours,
    startTimeStr,
    currentTimeStr,
    durationText,
    isEarlyExit,
    targetEndTime
  } = params;

  const htmlContent = `
    <div style="text-align: left; font-family: inherit; margin-top: 4px;">
      <!-- DURATION BANNER -->
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; text-align: center; color: white; box-shadow: 0 3px 8px rgba(30, 27, 75, 0.15);">
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #a5b4fc; margin-bottom: 2px;">
          ⏱️ Toplam Çalışma Süreniz
        </div>
        <div style="font-size: 24px; font-weight: 900; font-family: monospace; letter-spacing: 0.5px; color: #ffffff; line-height: 1.15;">
          ${durationText}
        </div>
        <div style="font-size: 10px; color: #c7d2fe; margin-top: 3px;">
          Giriş: <strong style="color: #ffffff;">${startTimeStr}</strong> &nbsp;•&nbsp; Çıkış: <strong style="color: #ffffff;">${currentTimeStr}</strong>
        </div>
      </div>

      <!-- OFFICE & SHIFT CARDS GRID -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
        <!-- OFİS -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
          <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 1px;">
            🏢 Çıkış Lokasyonu
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${officeName}">
            ${officeName}
          </div>
          <div style="font-size: 9px; color: #16a34a; font-weight: 600; margin-top: 1px;">
            ✓ GPS Eşleşti
          </div>
        </div>

        <!-- VARDIYA -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
          <div style="font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 1px;">
            📋 Vardiya Planı
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${shiftName}">
            ${shiftName}
          </div>
          <div style="font-size: 9px; font-weight: 700; color: #4338ca; margin-top: 1px; font-family: monospace;">
            ${shiftHours}
          </div>
        </div>
      </div>

      <!-- STATUS NOTE -->
      <div style="background: ${isEarlyExit ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${isEarlyExit ? '#fcd34d' : '#86efac'}; border-radius: 8px; padding: 6px 8px; display: flex; align-items: flex-start; gap: 6px;">
        <span style="font-size: 15px; line-height: 1; margin-top: 1px;">${isEarlyExit ? '⚠️' : '🌟'}</span>
        <div>
          <div style="font-size: 10.5px; font-weight: 800; color: ${isEarlyExit ? '#92400e' : '#166534'};">
            ${isEarlyExit ? 'Erken Çıkış Uyarısı' : 'Mesai Tamamlandı'}
          </div>
          <div style="font-size: 10px; color: ${isEarlyExit ? '#78350f' : '#15803d'}; margin-top: 1px; line-height: 1.3;">
            ${isEarlyExit 
              ? `Vardiya bitiş saatiniz (<strong>${targetEndTime}</strong>) öncesinde mesaiyi sonlandırıyorsunuz.`
              : 'Günlük mesai sürenizi başarıyla tamamladınız. Çıkış kaydınız kaydedilecektir.'
            }
          </div>
        </div>
      </div>
    </div>
  `;

  const result = await HumaniusSwal.fire({
    title: '<div class="text-base sm:text-lg font-extrabold text-gray-900">Mesaiyi Bitirmek İstiyor Musunuz?</div>',
    html: htmlContent,
    showCancelButton: true,
    confirmButtonText: '🛑 Evet, Mesaiyi Bitir',
    cancelButtonText: 'Çalışmaya Devam Et',
    customClass: {
      popup: 'humanius-swal-popup !max-w-md',
      confirmButton: 'humanius-swal-end-btn',
      cancelButton: 'humanius-swal-cancel-btn',
      actions: 'humanius-swal-actions'
    }
  });

  return result.isConfirmed;
};

/**
 * Monkey-patches window.alert across the application to render SweetAlert2 automatically.
 */
export const setupGlobalSwalAlerts = () => {
  if (typeof window === 'undefined') return;

  const originalAlert = window.alert;

  window.alert = (message?: any) => {
    const textMsg = message === undefined ? '' : String(message);
    
    // Determine icon based on message content
    const lower = textMsg.toLowerCase();
    let icon: 'success' | 'error' | 'warning' | 'info' = 'info';
    let title = 'Bilgilendirme';

    if (lower.includes('hata') || lower.includes('error') || lower.includes('başarısız') || lower.includes('bulunamadı')) {
      icon = 'error';
      title = 'Hata Oluştu';
    } else if (lower.includes('başarılı') || lower.includes('success') || lower.includes('kaydedildi') || lower.includes('güncellendi') || lower.includes('silindi')) {
      icon = 'success';
      title = 'İşlem Başarılı';
    } else if (lower.includes('dikkat') || lower.includes('uyarı') || lower.includes('warning') || lower.includes('lütfen') || lower.includes('zorunlu')) {
      icon = 'warning';
      title = 'Dikkat';
    }

    HumaniusSwal.fire({
      icon,
      title,
      html: `<div class="text-sm text-gray-700 leading-relaxed py-1">${textMsg.replace(/\\n/g, '<br/>')}</div>`,
      confirmButtonText: 'Tamam',
    });
  };

  // Keep reference if ever needed
  (window as any).__originalAlert = originalAlert;
};
