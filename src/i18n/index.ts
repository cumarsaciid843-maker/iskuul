import { en, TranslationKey } from './en';
import { so } from './so';
import { ar } from './ar';
import { Language, TranslationParams } from './types';

export type { Language, TranslationParams, TranslationKey };

export const LANGUAGE_STORAGE_KEY = 'school_manager_language';

export const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  so,
  ar,
};

export const LANGUAGE_OPTIONS: { code: Language; label: string; nativeLabel: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'so', label: 'Somali', nativeLabel: 'Soomaali', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
];

export function isValidLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'so' || value === 'ar';
}

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isValidLanguage(saved) ? saved : 'en';
  } catch {
    return 'en';
  }
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore storage quota errors
  }
}

export function getLanguageDir(lang: Language): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
}

export function translate(lang: Language, key: TranslationKey, params?: TranslationParams): string {
  const dict = dictionaries[lang] || dictionaries.en;
  const raw = dict[key] ?? dictionaries.en[key] ?? key;
  return interpolate(raw, params);
}

const STATUS_MAP: Record<string, TranslationKey> = {
  active: 'status_active',
  closed: 'status_closed',
  paid: 'status_paid',
  partial: 'status_partial',
  'partial payment': 'status_partial_payment',
  unpaid: 'status_unpaid',
  overdue: 'status_overdue',
  pending: 'status_pending',
  rejected: 'status_rejected',
  suspended: 'status_suspended',
  'suspended · data kept': 'status_suspended_data_kept',
  billed: 'status_billed',
  present: 'status_present',
  absent: 'status_absent',
  late: 'status_late',
  left: 'status_left',
  graduated: 'status_graduated',
  voided: 'status_voided',
  valid: 'status_valid',
  'advance / future': 'status_advance_future',
  'billed cycle': 'status_billed_cycle',
  upcoming: 'status_upcoming',
  'not billed': 'status_not_billed',
  open: 'status_open',
  none: 'common_none',
};

export function translateStatus(lang: Language, rawStatus?: string | null): string {
  if (!rawStatus) return '';
  const key = STATUS_MAP[rawStatus.trim().toLowerCase()];
  return key ? translate(lang, key) : rawStatus;
}

const METHOD_MAP: Record<string, TranslationKey> = {
  cash: 'method_cash',
  'mobile money': 'method_mobile_money',
  'bank transfer': 'method_bank_transfer',
  cheque: 'method_cheque',
  monthly: 'gs_monthly',
  yearly: 'gs_yearly',
};

export function translateMethod(lang: Language, rawMethod?: string | null): string {
  if (!rawMethod) return '';
  const key = METHOD_MAP[rawMethod.trim().toLowerCase()];
  return key ? translate(lang, key) : rawMethod;
}

const SHIFT_MAP: Record<string, TranslationKey> = {
  morning: 'shift_morning',
  afternoon: 'shift_afternoon',
  evening: 'shift_evening',
};

export function translateShift(lang: Language, rawShift?: string | null): string {
  if (!rawShift) return '';
  const key = SHIFT_MAP[rawShift.trim().toLowerCase()];
  return key ? translate(lang, key) : rawShift;
}

const MONTH_KEY_MAP: Record<string, TranslationKey> = {
  january: 'month_january',
  february: 'month_february',
  march: 'month_march',
  april: 'month_april',
  may: 'month_may',
  june: 'month_june',
  july: 'month_july',
  august: 'month_august',
  september: 'month_september',
  october: 'month_october',
  november: 'month_november',
  december: 'month_december',
  jan: 'month_jan',
  feb: 'month_feb',
  mar: 'month_mar',
  apr: 'month_apr',
  jun: 'month_jun',
  jul: 'month_jul',
  aug: 'month_aug',
  sep: 'month_sep',
  oct: 'month_oct',
  nov: 'month_nov',
  dec: 'month_dec',
};

export function translateMonth(lang: Language, rawMonth?: string | null): string {
  if (!rawMonth) return '';
  const trimmed = rawMonth.trim();
  if (trimmed.toLowerCase() === 'none') return translate(lang, 'common_none');
  if (lang === 'en') return rawMonth;

  return rawMonth.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi,
    (match) => {
      const k = MONTH_KEY_MAP[match.toLowerCase()];
      return k ? translate(lang, k) : match;
    }
  );
}

const SERVICE_MSG_MAP: Record<string, TranslationKey> = {
  'Invalid email or password.': 'srv_invalidCredentials',
  'School record not found.': 'srv_schoolNotFound',
  'Your school registration has been rejected. Please contact support.': 'srv_schoolRejected',
  'Your school is waiting for super admin approval.': 'srv_schoolPending',
  'School access is paused due to unpaid subscription.': 'srv_schoolPaused',
  'Historical academic year is read-only.': 'srv_historicalReadOnly',
  'Historical academic year is read-only. Switch to an Active academic year to register students.':
    'srv_historicalRegisterErr',
  'Historical academic year is read-only. Attendance cannot be modified.': 'srv_historicalAttendanceErr',
  'Historical academic year payment records are read-only.': 'srv_historicalPaymentErr',
  'Historical academic year is read-only. Cannot promote students in a closed year.': 'srv_historicalPromoteErr',
  'Cannot run monthly billing inside a closed historical academic year.': 'srv_billingClosedErr',
  'All eligible students in this academic year have already been billed for this month.': 'srv_billingAlreadyBilled',
  'Unauthorized: You must be logged in to export data.': 'srv_exportUnauthorized',
  'Access Denied: Your role does not have permission to export this data.': 'srv_exportDenied',
  'Failed to generate Excel workbook.': 'srv_exportFailed',
};

export function translateServiceMessage(lang: Language, msg?: string | null): string {
  if (!msg) return '';
  const key = SERVICE_MSG_MAP[msg.trim()];
  if (key) return translate(lang, key);
  return msg;
}

const PLAN_TEXT_MAP: Record<string, { so: string; ar: string }> = {
  Basic: { so: 'Aasaasi', ar: 'الأساسية' },
  Standard: { so: 'Heer Dhexe', ar: 'القياسية' },
  Premium: { so: 'Heer Sare', ar: 'المتميزة' },
  Starter: { so: 'Bilow', ar: 'البداية' },
  Growth: { so: 'Koboc', ar: 'النمو' },
  'Student profile & enrollment': { so: 'Xogta ardayga & diiwaangelinta', ar: 'ملف الطالب والتسجيل' },
  'Daily class attendance': { so: 'Xaadirinta maalinlaha ah ee fasalka', ar: 'الحضور اليومي للفصل' },
  'Daily attendance': { so: 'Xaadirinta maalinlaha ah', ar: 'الحضور اليومي' },
  'Manual payment recording': { so: 'Diiwaangelinta gacanta ee lacag-bixinta', ar: 'تسجيل المدفوعات يدوياً' },
  'Basic student roster export': { so: 'Soo dejinta liiska ardayda', ar: 'تصدير كشف الطلاب الأساسي' },
  'All Basic features': { so: 'Dhammaan astaamaha Aasaasiga', ar: 'جميع مميزات الباقة الأساسية' },
  'One-click monthly billing': { so: 'Dallacaadda bisha ee hal guji ah', ar: 'الفوترة الشهرية بنقرة واحدة' },
  'Teacher login & class restrictions': { so: 'Gelitaanka macallinka & xaddidaadda fasalka', ar: 'دخول المعلم وتخصيص الفصول' },
  'Attendance history & percentages': { so: 'Taariikhda xaadirinta & boqolleyda', ar: 'سجل الحضور والنسب المئوية' },
  'Student promotion & class transfer': { so: 'U gudbinta ardayda & wareejinta fasalka', ar: 'ترقية الطلاب ونقل الفصول' },
  'CSV reports (Students, Attendance, Fees)': { so: 'Warbixinnada (Ardayda, Xaadirinta, Lacagaha)', ar: 'تقارير (الطلاب، الحضور، الرسوم)' },
  'All Standard features': { so: 'Dhammaan astaamaha Heer Dhexe', ar: 'جميع مميزات الباقة القياسية' },
  'Unlimited classes & teachers': { so: 'Fasallo & macallimiin aan xad lahayn', ar: 'فصول ومعلمون غير محدودين' },
  'Advanced fee auditing & void tracking': { so: 'Hantidhawrka lacagaha & la socodka burinta', ar: 'تدقيق متقدم للرسوم وتتبع الإلغاء' },
  'Priority super admin support': { so: 'Taageero mudnaan leh oo maamulka guud ah', ar: 'دعم ذو أولوية من المشرف العام' },
  'Complete multi-academic year history': { so: 'Taariikh dhammaystiran oo sannad-dugsiyeed badan ah', ar: 'سجل كامل لعدة أعوام دراسية' },
  'Billing and reports': { so: 'Dallacaadda iyo warbixinnada', ar: 'الفوترة والتقارير' },
};

export function translatePlanText(lang: Language, text?: string | null): string {
  if (!text) return '';
  if (lang === 'en') return text;
  const trimmed = text.trim();
  const upToMatch = trimmed.match(/^Up to (\d+) students$/i);
  if (upToMatch) {
    return translate(lang, 'land_pricing_upToStudents', { count: upToMatch[1] });
  }
  const entry = PLAN_TEXT_MAP[trimmed];
  if (entry) {
    return lang === 'so' ? entry.so : entry.ar;
  }
  return text;
}
