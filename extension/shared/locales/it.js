/**
 * Italian (it). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => `${n}ª`,
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  'overlay.titleN': 'È la tua {ord} volta su {feed} oggi.',
  'overlay.titleFirst': 'Prima volta su {feed} oggi.',
  'overlay.subMinutes': '{time} finora',
  'overlay.subFirst': 'Cinque secondi, poi decidi tu.',
  'overlay.subTake': 'Fai la pausa, poi scegli.',
  'overlay.secondsLeft': '{n} secondi',
  'overlay.ctaLeave': 'Non ora — torna indietro',
  'overlay.ctaWait': 'Continua comunque · {n}s',
  'overlay.ctaReady': 'Continua comunque',
  'overlay.foot': 'Anche Esc ti riporta indietro. Niente di questa visita lascia il tuo dispositivo.',
  'overlay.heavy': '{time} finora. La modalità Blocco è a un tocco nel menu.',
  'overlay.heavyBadge': '{opens} APERTURE · {time}',
  'overlay.recurringTitle': 'Stai guardando da {minutes} minuti di fila.',
  'overlay.recurringSub': 'Prenditi cinque secondi, poi continua o fermati.',

  'block.title': 'La modalità Blocco è attiva — ti riportiamo indietro.',
  'block.sub': 'Ritorno a {home} tra {n}s',
  'block.skip': 'Vai ora',
  'block.hint': "Passa alla modalità Attrito dall'icona nella barra.",

  'shelf.label': '{feed} nascosto',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Mostra la sezione {feed}',
  'shelf.collapse': 'Nascondi la sezione {feed}',

  'reelItem.label': 'Reel nascosto',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Mostra questo Reel',
  'reelItem.collapse': 'Nascondi questo Reel',
  'reelItem.open': 'Apri questo Reel',

  'popup.sectionToday': 'OGGI',
  'popup.sectionTodayOne': 'OGGI · {label}',
  'popup.zero': 'Ancora niente per oggi. I numeri compaiono la prima volta che si apre un feed.',
  'popup.stepAway': 'Hai fatto marcia indietro {a} volte su {b} oggi.',
  'popup.modeLabel': 'MODALITÀ',
  'popup.modeGroupAria': 'Modalità',
  'popup.modeFrictionLabel': 'Attrito',
  'popup.modeBlockLabel': 'Blocco',
  'popup.modeFriction': 'Una pausa di 5 secondi prima che un feed si carichi. Puoi sempre continuare.',
  'popup.modeBlock': 'I feed non si aprono. Torni alla home dopo 6 secondi.',
  'popup.pillFriction': 'ATTRITO',
  'popup.pillBlock': 'BLOCCO',
  'popup.blockedSummary': '{blocked} di quelle {total} sono state fermate dalla modalità Blocco.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'RICORDAMELO OGNI',
  'popup.recurringHelperOn': 'Una pausa di 5 secondi ogni {m} minuti mentre guardi.',
  'popup.recurringHelperOff':
    'Solo la prima pausa per visita. Attivalo per un promemoria mentre continui a scorrere.',
  'popup.recurringCapped': 'Massimo {max} minuti.',
  'popup.recurringWatchingPrefix': 'In corso — ',
  'popup.recurringProgress': '{elapsed} di {mins} min',
  'popup.recurringWatchingSuffix': ' prima della prossima pausa.',
  'popup.decreaseInterval': 'Riduci intervallo',
  'popup.increaseInterval': 'Aumenta intervallo',
  'popup.intervalAria': 'Intervallo del promemoria in minuti',
  'popup.minutesUnit': 'min',
  'popup.privacy': 'Niente lascia questo dispositivo',
  'popup.degraded': 'Reelief non trova la sezione {feed}. La pausa su {path} funziona ancora.',
  'popup.degradedTitle': 'La pagina {feed} è cambiata — una correzione richiede di solito qualche giorno.',
  'popup.checkForUpdate': 'Cerca aggiornamenti',
  'popup.report': 'Segnala',
  'popup.dismiss': "Ignora",
  'popup.trendLabel': 'ANDAMENTO',
  'popup.trendMetricOpens': 'Aperture',
  'popup.trendMetricMinutes': 'Minuti',
  'popup.trendRangeShort': '7G',
  'popup.trendRangeLong': '30G',
  'popup.trendAria': 'Andamento di {metric} su {days} giorni',
  'popup.trendToday': "Oggi",
  'popup.trendDateRangeAria': "Intervallo di date",
  'popup.trendMetricAria': "Metrica del grafico",

  'popup.languageLabel': 'LINGUA',
  'popup.languageMenuAria': 'Lingua',
  'popup.moreAria': 'Altro',

  'popup.onboardTitle': 'Due modi di usare Reelief',
  'popup.onboardBody':
    '{friction} ti ferma per 5 secondi prima che un feed si carichi. {block} ti fa tornare indietro alla porta. Cambia quando vuoi — ora sei in modalità {mode}.',
  'popup.onboardCta': 'Ho capito',

  'units.open': 'apertura',
  'units.opens': 'aperture',
  'units.min': 'min',
};
