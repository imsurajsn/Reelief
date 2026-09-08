/**
 * French (fr). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => (n === 1 ? '1re' : `${n}e`),
    plural: (n, forms) => (n <= 1 ? forms.one : forms.other),
  },

  'overlay.titleN': "C'est ta {ord} visite sur {feed} aujourd'hui.",
  'overlay.titleFirst': "Première visite sur {feed} aujourd'hui.",
  'overlay.subMinutes': '{time} pour le moment',
  'overlay.subFirst': "Cinq secondes, puis c'est toi qui décides.",
  'overlay.subTake': 'Fais la pause, puis choisis.',
  'overlay.secondsLeft': '{n} secondes',
  'overlay.ctaLeave': 'Pas maintenant — revenir',
  'overlay.ctaWait': 'Continuer quand même · {n}s',
  'overlay.ctaReady': 'Continuer quand même',
  'overlay.foot': 'Échap te ramène aussi. Rien de cette visite ne quitte ton appareil.',
  'overlay.heavy': '{time} pour le moment. Le mode Blocage est à un geste dans le menu.',
  'overlay.heavyBadge': '{opens} OUVERTURES · {time}',
  'overlay.recurringTitle': 'Tu regardes depuis {minutes} minutes sans interruption.',
  'overlay.recurringSub': 'Prends cinq secondes, puis continue ou arrête-toi.',

  'block.title': 'Le mode Blocage est activé — on te ramène.',
  'block.sub': 'Retour vers {home} dans {n}s',
  'block.skip': 'Y aller maintenant',
  'block.hint': "Passe en mode Friction depuis l'icône de la barre.",

  'shelf.label': '{feed} masqué',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Afficher la section {feed}',
  'shelf.collapse': 'Masquer la section {feed}',

  'reelItem.label': 'Reel masqué',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Afficher ce Reel',
  'reelItem.collapse': 'Masquer ce Reel',
  'reelItem.open': 'Ouvrir ce Reel',

  'popup.sectionToday': "AUJOURD'HUI",
  'popup.sectionTodayOne': "AUJOURD'HUI · {label}",
  'popup.zero': "Rien pour aujourd'hui. Les chiffres apparaissent à la première ouverture d'un feed.",
  'popup.stepAway': "Tu as fait demi-tour {a} fois sur {b} aujourd'hui.",
  'popup.modeLabel': 'MODE',
  'popup.modeGroupAria': 'Mode',
  'popup.modeFrictionLabel': 'Friction',
  'popup.modeBlockLabel': 'Blocage',
  'popup.modeFriction': "Une pause de 5 secondes avant qu'un feed se charge. Tu peux toujours continuer.",
  'popup.modeBlock': "Les feeds ne s'ouvrent pas. Tu reviens à l'accueil après 6 secondes.",
  'popup.pillFriction': 'FRICTION',
  'popup.pillBlock': 'BLOCAGE',
  'popup.blockedSummary': '{blocked} de ces {total} ont été arrêtées par le mode Blocage.',
  'popup.breakdownRow': '{site} : {value} {unit}',
  'popup.recurringLabel': 'ME RAPPELER TOUTES LES',
  'popup.recurringHelperOn': 'Une pause de 5 secondes toutes les {m} minutes pendant que tu regardes.',
  'popup.recurringHelperOff':
    'Seulement la première pause par visite. Active ceci pour un rappel pendant que tu fais défiler.',
  'popup.recurringCapped': '{max} minutes maximum.',
  'popup.recurringWatchingPrefix': 'En cours — ',
  'popup.recurringProgress': '{elapsed} sur {mins} min',
  'popup.recurringWatchingSuffix': ' avant la prochaine pause.',
  'popup.decreaseInterval': "Réduire l'intervalle",
  'popup.increaseInterval': "Augmenter l'intervalle",
  'popup.intervalAria': 'Intervalle de rappel en minutes',
  'popup.minutesUnit': 'min',
  'popup.privacy': 'Rien ne quitte cet appareil',
  'popup.degraded': "Reelief ne trouve pas la section {feed}. La pause sur {path} fonctionne toujours.",
  'popup.degradedTitle': 'La page {feed} a changé — un correctif prend généralement quelques jours.',
  'popup.checkForUpdate': 'Rechercher une mise à jour',
  'popup.report': 'Signaler',
  'popup.dismiss': "Ignorer",
  'popup.trendLabel': 'TENDANCE',
  'popup.trendMetricOpens': 'Ouvertures',
  'popup.trendMetricMinutes': 'Minutes',
  'popup.trendRangeShort': '7 j',
  'popup.trendRangeLong': '30 j',
  'popup.trendAria': 'Tendance des {metric} sur {days} jours',
  'popup.trendToday': "Aujourd'hui",
  'popup.trendDateRangeAria': "Période",
  'popup.trendMetricAria': "Mesure du graphique",

  'popup.languageLabel': 'LANGUE',
  'popup.languageMenuAria': 'Langue',
  'popup.moreAria': 'Plus',

  'popup.onboardTitle': "Deux façons d'utiliser Reelief",
  'popup.onboardBody':
    "{friction} te met en pause 5 secondes avant qu'un feed se charge. {block} te fait demi-tour à la porte. Change quand tu veux — tu es en mode {mode} pour l'instant.",
  'popup.onboardCta': 'Compris',

  'units.open': 'ouverture',
  'units.opens': 'ouvertures',
  'units.min': 'min',
};
