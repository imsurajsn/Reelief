/**
 * Arabic (ar) — Tier 3, right-to-left. First-draft translation — have a
 * native speaker review before the Chrome Web Store release. Any key
 * omitted here falls back to English (shared/i18n.js).
 *
 * Selecting this locale flips the popup to RTL (registry `dir: "rtl"`). A
 * full RTL layout pass on the popup and the overlays is still pending —
 * treat Arabic as preview-quality until then (PRD: Tier 3 is gated on it).
 * Arabic's full plural rules aren't wired through either.
 */

export default {
  meta: {
    ordinal: (n) => {
      const words = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
      return words[n] ?? `${n}`;
    },
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  'overlay.titleN': 'هذه هي المرة {ord} التي تفتح فيها {feed} اليوم.',
  'overlay.titleFirst': 'أول {feed} اليوم.',
  'overlay.subMinutes': '{time} حتى الآن',
  'overlay.subFirst': 'خمس ثوانٍ، ثم القرار لك.',
  'overlay.subTake': 'خذ الوقفة، ثم اختر.',
  'overlay.secondsLeft': '{n} ثانية',
  'overlay.ctaLeave': 'ليس الآن — رجوع',
  'overlay.ctaWait': 'المتابعة على أي حال · {n}ث',
  'overlay.ctaReady': 'المتابعة على أي حال',
  'overlay.foot': 'مفتاح Esc يعيدك أيضًا. لا شيء من هذه الزيارة يغادر جهازك.',
  'overlay.heavy': '{time} حتى الآن. وضع الحظر على بُعد نقرة واحدة في القائمة.',
  'overlay.heavyBadge': '{opens} فتحة · {time}',
  'overlay.recurringTitle': 'أنت تشاهد منذ {minutes} دقيقة متواصلة.',
  'overlay.recurringSub': 'خذ خمس ثوانٍ، ثم تابع أو ابتعد.',

  'block.title': 'وضع الحظر مفعّل — نعيدك للخلف.',
  'block.sub': 'العودة إلى {home} خلال {n}ث',
  'block.skip': 'الانتقال الآن',
  'block.hint': 'بدّل إلى وضع الوقفة من أيقونة شريط الأدوات.',

  'shelf.label': 'تم إخفاء {feed}',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'إظهار قسم {feed}',
  'shelf.collapse': 'إخفاء قسم {feed}',

  'reelItem.label': 'تم إخفاء الريل',
  'reelItem.expandedLabel': 'ريل',
  'reelItem.expand': 'إظهار هذا الريل',
  'reelItem.collapse': 'إخفاء هذا الريل',
  'reelItem.open': 'فتح هذا الريل',

  'popup.sectionToday': 'اليوم',
  'popup.sectionTodayOne': 'اليوم · {label}',
  'popup.zero': 'لا شيء اليوم بعد. تظهر الأرقام عند فتح أي موجز لأول مرة.',
  'popup.stepAway': 'تراجعت {a} من {b} مرات اليوم.',
  'popup.modeLabel': 'الوضع',
  'popup.modeGroupAria': 'الوضع',
  'popup.modeFrictionLabel': 'وقفة',
  'popup.modeBlockLabel': 'حظر',
  'popup.modeFriction': 'وقفة من 5 ثوانٍ قبل تحميل الموجز. يمكنك المتابعة دائمًا.',
  'popup.modeBlock': 'لن تُفتح الموجزات. ستعود إلى الصفحة الرئيسية بعد 6 ثوانٍ.',
  'popup.pillFriction': 'وقفة',
  'popup.pillBlock': 'حظر',
  'popup.blockedSummary': 'من تلك الـ{total}، أوقف وضع الحظر {blocked}.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'ذكّرني كل',
  'popup.recurringHelperOn': 'وقفة من 5 ثوانٍ كل {m} دقيقة أثناء المشاهدة.',
  'popup.recurringHelperOff':
    'الوقفة الأولى فقط في كل زيارة. فعّل هذا للتذكير بينما لا تزال تتصفح.',
  'popup.recurringCapped': 'بحد أقصى {max} دقيقة.',
  'popup.recurringWatchingPrefix': 'تشاهد الآن — ',
  'popup.recurringProgress': '{elapsed} من {mins} دقيقة',
  'popup.recurringWatchingSuffix': ' قبل الوقفة التالية.',
  'popup.decreaseInterval': 'تقليل الفاصل',
  'popup.increaseInterval': 'زيادة الفاصل',
  'popup.intervalAria': 'فاصل التذكير بالدقائق',
  'popup.minutesUnit': 'د',
  'popup.privacy': 'لا شيء يغادر هذا الجهاز',
  'popup.degraded': 'لا يجد Reelief قسم {feed}. الوقفة على {path} لا تزال تعمل.',
  'popup.degradedTitle': 'تغيّرت صفحة {feed} — يستغرق الإصلاح عادةً بضعة أيام.',
  'popup.checkForUpdate': 'التحقق من التحديث',
  'popup.report': 'إبلاغ',
  'popup.dismiss': 'إغلاق',
  'popup.trendLabel': 'الاتجاه',
  'popup.trendMetricOpens': 'الفتحات',
  'popup.trendMetricMinutes': 'الدقائق',
  'popup.trendRangeShort': '7ي',
  'popup.trendRangeLong': '30ي',
  'popup.trendAria': 'اتجاه {metric} خلال {days} يوم',
  'popup.trendToday': 'اليوم',
  'popup.trendDateRangeAria': 'نطاق التاريخ',
  'popup.trendMetricAria': 'مقياس الرسم البياني',

  'popup.languageLabel': 'اللغة',
  'popup.languageMenuAria': 'اللغة',
  'popup.moreAria': 'المزيد',

  'popup.onboardTitle': 'طريقتان لاستخدام Reelief',
  'popup.onboardBody':
    '{friction} يوقفك 5 ثوانٍ قبل تحميل الموجز. {block} يعيدك من الباب. بدّل في أي وقت — أنت الآن في وضع {mode}.',
  'popup.onboardCta': 'فهمت',

  'units.open': 'فتحة',
  'units.opens': 'فتحات',
  'units.min': 'د',
};
