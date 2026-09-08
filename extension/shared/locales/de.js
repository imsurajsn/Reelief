/**
 * German (de). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => `${n}.`,
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  'overlay.titleN': 'Das ist heute dein {ord} Mal auf {feed}.',
  'overlay.titleFirst': 'Zum ersten Mal heute auf {feed}.',
  'overlay.subMinutes': '{time} bisher',
  'overlay.subFirst': 'Fünf Sekunden, dann entscheidest du.',
  'overlay.subTake': 'Mach die Pause, dann entscheide.',
  'overlay.secondsLeft': '{n} Sekunden',
  'overlay.ctaLeave': 'Jetzt nicht — zurück',
  'overlay.ctaWait': 'Trotzdem weiter · {n}s',
  'overlay.ctaReady': 'Trotzdem weiter',
  'overlay.foot': 'Esc bringt dich auch zurück. Nichts von diesem Besuch verlässt dein Gerät.',
  'overlay.heavy': '{time} bisher. Der Blockier-Modus ist im Menü nur einen Tipp entfernt.',
  'overlay.heavyBadge': '{opens} AUFRUFE · {time}',
  'overlay.recurringTitle': 'Du schaust seit {minutes} Minuten am Stück.',
  'overlay.recurringSub': 'Nimm dir fünf Sekunden, dann mach weiter oder hör auf.',

  'block.title': 'Der Blockier-Modus ist an — du wirst zurückgebracht.',
  'block.sub': 'Zurück zu {home} in {n}s',
  'block.skip': 'Jetzt los',
  'block.hint': 'Wechsle über das Symbol in der Leiste zum Pausen-Modus.',

  'shelf.label': '{feed} ausgeblendet',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': '{feed}-Bereich einblenden',
  'shelf.collapse': '{feed}-Bereich ausblenden',

  'reelItem.label': 'Reel ausgeblendet',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Dieses Reel anzeigen',
  'reelItem.collapse': 'Dieses Reel ausblenden',
  'reelItem.open': 'Dieses Reel öffnen',

  'popup.sectionToday': 'HEUTE',
  'popup.sectionTodayOne': 'HEUTE · {label}',
  'popup.zero': 'Heute noch nichts. Zahlen erscheinen, sobald ein Feed zum ersten Mal geöffnet wird.',
  'popup.stepAway': 'Du bist heute {a} von {b} Mal weggegangen.',
  'popup.modeLabel': 'MODUS',
  'popup.modeGroupAria': 'Modus',
  'popup.modeFrictionLabel': 'Pause',
  'popup.modeBlockLabel': 'Blockieren',
  'popup.modeFriction': 'Eine 5-Sekunden-Pause, bevor ein Feed lädt. Du kannst immer weitermachen.',
  'popup.modeBlock': 'Feeds öffnen sich nicht. Du wirst nach 6 Sekunden zur Startseite gebracht.',
  'popup.pillFriction': 'PAUSE',
  'popup.pillBlock': 'BLOCKIEREN',
  'popup.blockedSummary': '{blocked} davon von {total} hat der Blockier-Modus abgefangen.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'ERINNERE MICH ALLE',
  'popup.recurringHelperOn': 'Eine 5-Sekunden-Pause alle {m} Minuten, während du schaust.',
  'popup.recurringHelperOff':
    'Nur die erste Pause pro Besuch. Schalte das ein, um während des Scrollens erinnert zu werden.',
  'popup.recurringCapped': 'Höchstens {max} Minuten.',
  'popup.recurringWatchingPrefix': 'Läuft gerade — ',
  'popup.recurringProgress': '{elapsed} von {mins} Min.',
  'popup.recurringWatchingSuffix': ' bis zur nächsten Pause.',
  'popup.decreaseInterval': 'Intervall verkürzen',
  'popup.increaseInterval': 'Intervall verlängern',
  'popup.intervalAria': 'Erinnerungsintervall in Minuten',
  'popup.minutesUnit': 'Min.',
  'popup.privacy': 'Nichts verlässt dieses Gerät',
  'popup.degraded': 'Reelief findet den {feed}-Bereich nicht. Die Pause auf {path} funktioniert weiterhin.',
  'popup.degradedTitle': 'Die {feed}-Seite hat sich geändert — eine Behebung dauert meist ein paar Tage.',
  'popup.checkForUpdate': 'Nach Update suchen',
  'popup.report': 'Melden',
  'popup.dismiss': "Schließen",
  'popup.trendLabel': 'VERLAUF',
  'popup.trendMetricOpens': 'Aufrufe',
  'popup.trendMetricMinutes': 'Minuten',
  'popup.trendRangeShort': '7T',
  'popup.trendRangeLong': '30T',
  'popup.trendAria': '{metric}-Verlauf über {days} Tage',
  'popup.trendToday': "Heute",
  'popup.trendDateRangeAria': "Zeitraum",
  'popup.trendMetricAria': "Diagrammwert",

  'popup.languageLabel': 'SPRACHE',
  'popup.languageMenuAria': 'Sprache',
  'popup.moreAria': 'Mehr',

  'popup.onboardTitle': 'Zwei Wege, Reelief zu nutzen',
  'popup.onboardBody':
    '{friction} hält dich 5 Sekunden auf, bevor ein Feed lädt. {block} dreht dich an der Tür um. Wechsle jederzeit — du bist gerade im Modus {mode}.',
  'popup.onboardCta': 'Verstanden',

  'units.open': 'Aufruf',
  'units.opens': 'Aufrufe',
  'units.min': 'Min.',
};
