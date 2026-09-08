/**
 * Spanish (es). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => {
      const words = ['cero', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta'];
      return words[n] ?? `${n}.ª`;
    },
    plural: (n, forms) => (n === 1 ? forms.one : forms.other),
  },

  'overlay.titleN': 'Esta es tu {ord} vez en {feed} hoy.',
  'overlay.titleFirst': 'Primera vez en {feed} hoy.',
  'overlay.subMinutes': '{time} hasta ahora',
  'overlay.subFirst': 'Cinco segundos y tú decides.',
  'overlay.subTake': 'Haz la pausa y luego elige.',
  'overlay.secondsLeft': '{n} segundos',
  'overlay.ctaLeave': 'Ahora no — volver',
  'overlay.ctaWait': 'Continuar igualmente · {n}s',
  'overlay.ctaReady': 'Continuar igualmente',
  'overlay.foot': 'Esc también te devuelve. Nada de esta visita sale de tu dispositivo.',
  'overlay.heavy': '{time} hasta ahora. El modo Bloqueo está a un toque en el menú.',
  'overlay.heavyBadge': '{opens} ABIERTAS · {time}',
  'overlay.recurringTitle': 'Llevas {minutes} minutos seguidos viendo.',
  'overlay.recurringSub': 'Tómate cinco segundos y luego sigue o déjalo.',

  'block.title': 'El modo Bloqueo está activo — te devolvemos.',
  'block.sub': 'Volviendo a {home} en {n}s',
  'block.skip': 'Ir ahora',
  'block.hint': 'Cambia al modo Fricción desde el icono de la barra.',

  'shelf.label': '{feed} oculto',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Mostrar la sección de {feed}',
  'shelf.collapse': 'Ocultar la sección de {feed}',

  'reelItem.label': 'Reel oculto',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Mostrar este Reel',
  'reelItem.collapse': 'Ocultar este Reel',
  'reelItem.open': 'Abrir este Reel',

  'popup.sectionToday': 'HOY',
  'popup.sectionTodayOne': 'HOY · {label}',
  'popup.zero': 'Nada por ahora hoy. Los números aparecen la primera vez que se abre un feed.',
  'popup.stepAway': 'Lo dejaste {a} de {b} veces hoy.',
  'popup.modeLabel': 'MODO',
  'popup.modeGroupAria': 'Modo',
  'popup.modeFrictionLabel': 'Fricción',
  'popup.modeBlockLabel': 'Bloqueo',
  'popup.modeFriction': 'Una pausa de 5 segundos antes de que cargue un feed. Siempre puedes continuar.',
  'popup.modeBlock': 'Los feeds no se abren. Volverás al inicio después de 6 segundos.',
  'popup.pillFriction': 'FRICCIÓN',
  'popup.pillBlock': 'BLOQUEO',
  'popup.blockedSummary': '{blocked} de esas {total} las frenó el modo Bloqueo.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'RECORDARME CADA',
  'popup.recurringHelperOn': 'Una pausa de 5 segundos cada {m} minutos mientras ves.',
  'popup.recurringHelperOff':
    'Solo la primera pausa por visita. Actívalo para un recordatorio mientras sigues desplazándote.',
  'popup.recurringCapped': 'Máximo {max} minutos.',
  'popup.recurringWatchingPrefix': 'Viendo ahora — ',
  'popup.recurringProgress': '{elapsed} de {mins} min',
  'popup.recurringWatchingSuffix': ' antes de la próxima pausa.',
  'popup.decreaseInterval': 'Reducir intervalo',
  'popup.increaseInterval': 'Aumentar intervalo',
  'popup.intervalAria': 'Intervalo de recordatorio en minutos',
  'popup.minutesUnit': 'm',
  'popup.privacy': 'Nada sale de este dispositivo',
  'popup.degraded': 'Reelief no encuentra la sección de {feed}. La pausa en {path} sigue funcionando.',
  'popup.degradedTitle': 'La página de {feed} cambió — el arreglo suele tardar unos días.',
  'popup.checkForUpdate': 'Buscar actualización',
  'popup.report': 'Informar',
  'popup.dismiss': "Descartar",
  'popup.trendLabel': 'TENDENCIA',
  'popup.trendMetricOpens': 'Aperturas',
  'popup.trendMetricMinutes': 'Minutos',
  'popup.trendRangeShort': '7D',
  'popup.trendRangeLong': '30D',
  'popup.trendAria': 'Tendencia de {metric} de {days} días',
  'popup.trendToday': "Hoy",
  'popup.trendDateRangeAria': "Rango de fechas",
  'popup.trendMetricAria': "Métrica del gráfico",
  'popup.opensLabel': 'aperturas',
  'popup.spentLabel': 'de uso',

  'popup.languageLabel': 'IDIOMA',
  'popup.languageMenuAria': 'Idioma',
  'popup.moreAria': 'Más',

  'popup.onboardTitle': 'Dos formas de usar Reelief',
  'popup.onboardBody':
    '{friction} te detiene 5 segundos antes de que cargue un feed. {block} te da la vuelta en la puerta. Cambia cuando quieras — ahora estás en {mode}.',
  'popup.onboardCta': 'Entendido',

  'units.open': 'apertura',
  'units.opens': 'aperturas',
  'units.min': 'min',
};
