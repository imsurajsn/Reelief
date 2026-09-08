/**
 * Hindi (hi). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => {
      const words = ['शून्यवीं', 'पहली', 'दूसरी', 'तीसरी', 'चौथी', 'पाँचवीं'];
      return words[n] ?? `${n}वीं`;
    },
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  'overlay.titleN': 'आज आप {ord} बार {feed} देख रहे हैं।',
  'overlay.titleFirst': 'आज पहली बार {feed}।',
  'overlay.subMinutes': 'अब तक {time}',
  'overlay.subFirst': 'पाँच सेकंड, फिर फैसला आपका।',
  'overlay.subTake': 'रुकिए, फिर तय कीजिए।',
  'overlay.secondsLeft': '{n} सेकंड',
  'overlay.ctaLeave': 'अभी नहीं — वापस जाएँ',
  'overlay.ctaWait': 'फिर भी जारी रखें · {n}से',
  'overlay.ctaReady': 'फिर भी जारी रखें',
  'overlay.foot': 'Esc से भी वापस जा सकते हैं। इस विज़िट की कोई जानकारी आपके डिवाइस से बाहर नहीं जाती।',
  'overlay.heavy': 'अब तक {time}। ब्लॉक मोड मेन्यू में एक टैप दूर है।',
  'overlay.heavyBadge': '{opens} बार · {time}',
  'overlay.recurringTitle': 'आप {minutes} मिनट से लगातार देख रहे हैं।',
  'overlay.recurringSub': 'पाँच सेकंड लें, फिर जारी रखें या रुक जाएँ।',

  'block.title': 'ब्लॉक मोड चालू है — आपको वापस भेज रहे हैं।',
  'block.sub': '{n}से में {home} पर लौट रहे हैं',
  'block.skip': 'अभी जाएँ',
  'block.hint': 'टूलबार आइकन से फ्रिक्शन मोड पर जाएँ।',

  'shelf.label': '{feed} छिपाया गया',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': '{feed} सेक्शन दिखाएँ',
  'shelf.collapse': '{feed} सेक्शन छिपाएँ',

  'reelItem.label': 'Reel छिपाया गया',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'यह Reel दिखाएँ',
  'reelItem.collapse': 'यह Reel छिपाएँ',
  'reelItem.open': 'यह Reel खोलें',

  'popup.sectionToday': 'आज',
  'popup.sectionTodayOne': 'आज · {label}',
  'popup.zero': 'आज अभी कुछ नहीं। किसी फ़ीड को पहली बार खोलने पर संख्याएँ दिखेंगी।',
  'popup.stepAway': 'आज आप {b} में से {a} बार वापस गए।',
  'popup.modeLabel': 'मोड',
  'popup.modeGroupAria': 'मोड',
  'popup.modeFrictionLabel': 'फ्रिक्शन',
  'popup.modeBlockLabel': 'ब्लॉक',
  'popup.modeFriction': 'फ़ीड लोड होने से पहले 5 सेकंड का ठहराव। आप हमेशा जारी रख सकते हैं।',
  'popup.modeBlock': 'फ़ीड नहीं खुलेंगे। 6 सेकंड बाद आपको होम पर वापस भेज दिया जाएगा।',
  'popup.pillFriction': 'फ्रिक्शन',
  'popup.pillBlock': 'ब्लॉक',
  'popup.blockedSummary': 'उनमें से {total} में से {blocked} को ब्लॉक मोड ने रोका।',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'हर बार याद दिलाएँ',
  'popup.recurringHelperOn': 'देखते समय हर {m} मिनट में 5 सेकंड का ठहराव।',
  'popup.recurringHelperOff':
    'हर विज़िट में सिर्फ़ पहला ठहराव। स्क्रॉल करते समय याद दिलाने के लिए इसे चालू करें।',
  'popup.recurringCapped': 'अधिकतम {max} मिनट।',
  'popup.recurringWatchingPrefix': 'अभी देख रहे हैं — ',
  'popup.recurringProgress': '{mins} मिनट में से {elapsed}',
  'popup.recurringWatchingSuffix': ' अगले ठहराव से पहले।',
  'popup.decreaseInterval': 'अंतराल घटाएँ',
  'popup.increaseInterval': 'अंतराल बढ़ाएँ',
  'popup.intervalAria': 'मिनटों में रिमाइंडर अंतराल',
  'popup.minutesUnit': 'मि',
  'popup.privacy': 'कुछ भी इस डिवाइस से बाहर नहीं जाता',
  'popup.degraded': 'Reelief को {feed} सेक्शन नहीं मिल रहा। {path} पर ठहराव अब भी काम करता है।',
  'popup.degradedTitle': '{feed} पेज बदल गया — ठीक होने में आमतौर पर कुछ दिन लगते हैं।',
  'popup.checkForUpdate': 'अपडेट जाँचें',
  'popup.report': 'रिपोर्ट करें',
  'popup.dismiss': 'हटाएँ',
  'popup.trendLabel': 'ट्रेंड',
  'popup.trendMetricOpens': 'ओपन',
  'popup.trendMetricMinutes': 'मिनट',
  'popup.trendRangeShort': '7दि',
  'popup.trendRangeLong': '30दि',
  'popup.trendAria': '{days}-दिन का {metric} ट्रेंड',
  'popup.trendToday': 'आज',
  'popup.trendDateRangeAria': 'तारीख़ की सीमा',
  'popup.trendMetricAria': 'चार्ट मेट्रिक',

  'popup.languageLabel': 'भाषा',
  'popup.languageMenuAria': 'भाषा',
  'popup.moreAria': 'और',

  'popup.onboardTitle': 'Reelief इस्तेमाल करने के दो तरीके',
  'popup.onboardBody':
    '{friction} फ़ीड लोड होने से पहले आपको 5 सेकंड रोकता है। {block} दरवाज़े पर ही वापस मोड़ देता है। कभी भी बदलें — अभी आप {mode} में हैं।',
  'popup.onboardCta': 'समझ गया',

  'units.open': 'ओपन',
  'units.opens': 'ओपन',
  'units.min': 'मि',
};
