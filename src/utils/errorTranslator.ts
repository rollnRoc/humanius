export function translateErrorMessage(rawMessage: string | undefined | null): string {
  if (!rawMessage) return 'Bir hata oluştu. Lütfen tekrar deneyin.';

  const msg = String(rawMessage).trim();

  if (msg.includes('New password should be different from the old password')) {
    return 'Yeni şifreniz eski/geçici şifreniz ile aynı olamaz. Lütfen farklı bir şifre belirleyin.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Yeni şifreniz en az 6 karakter uzunluğunda olmalıdır.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'E-posta veya parola hatalı.';
  }
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    return 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'E-posta adresiniz henüz onaylanmamış.';
  }
  if (msg.includes('Rate limit exceeded') || msg.includes('Too many requests')) {
    return 'Çok fazla hatalı deneme yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.';
  }
  if (msg.includes('Auth session missing') || msg.includes('JWT expired')) {
    return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  }
  if (msg.includes('Same password')) {
    return 'Yeni şifreniz mevcut şifreniz ile aynı olamaz.';
  }

  return msg;
}
