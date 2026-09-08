/**
 * Russian (ru). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 *
 * Note: `units.opens` uses the genitive-plural form, which reads fine for
 * most counts but is not correct for 2–4 ("2 открытия"). Russian's full
 * plural rules aren't wired through yet.
 */

export default {
  meta: {
    ordinal: (n) => `${n}-й`,
    plural: (n, forms) => (n % 10 === 1 && n % 100 !== 11 ? forms.one : forms.other),
  },

  'overlay.titleN': 'Сегодня вы открываете {feed} {ord} раз.',
  'overlay.titleFirst': 'Первый {feed} за сегодня.',
  'overlay.subMinutes': '{time} на данный момент',
  'overlay.subFirst': 'Пять секунд — и решать вам.',
  'overlay.subTake': 'Сделайте паузу, потом выберите.',
  'overlay.secondsLeft': '{n} секунд',
  'overlay.ctaLeave': 'Не сейчас — назад',
  'overlay.ctaWait': 'Всё равно продолжить · {n}с',
  'overlay.ctaReady': 'Всё равно продолжить',
  'overlay.foot': 'Esc тоже вернёт назад. Ничего об этом визите не покидает ваше устройство.',
  'overlay.heavy': '{time} на данный момент. Режим блокировки — в одно касание в меню.',
  'overlay.heavyBadge': '{opens} ОТКРЫТИЙ · {time}',
  'overlay.recurringTitle': 'Вы смотрите уже {minutes} минут подряд.',
  'overlay.recurringSub': 'Возьмите пять секунд, потом продолжайте или отвлекитесь.',

  'block.title': 'Режим блокировки включён — возвращаем вас назад.',
  'block.sub': 'Возврат на {home} через {n}с',
  'block.skip': 'Перейти сейчас',
  'block.hint': 'Переключитесь на режим паузы через значок на панели.',

  'shelf.label': '{feed} скрыто',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Показать раздел «{feed}»',
  'shelf.collapse': 'Скрыть раздел «{feed}»',

  'reelItem.label': 'Reel скрыт',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Показать этот Reel',
  'reelItem.collapse': 'Скрыть этот Reel',
  'reelItem.open': 'Открыть этот Reel',

  'popup.sectionToday': 'СЕГОДНЯ',
  'popup.sectionTodayOne': 'СЕГОДНЯ · {label}',
  'popup.zero': 'Сегодня пока ничего. Числа появятся при первом открытии ленты.',
  'popup.stepAway': 'Сегодня вы развернулись {a} из {b} раз.',
  'popup.modeLabel': 'РЕЖИМ',
  'popup.modeGroupAria': 'Режим',
  'popup.modeFrictionLabel': 'Пауза',
  'popup.modeBlockLabel': 'Блокировка',
  'popup.modeFriction': 'Пауза в 5 секунд перед загрузкой ленты. Продолжить можно всегда.',
  'popup.modeBlock': 'Ленты не откроются. Вас вернёт на главную через 6 секунд.',
  'popup.pillFriction': 'ПАУЗА',
  'popup.pillBlock': 'БЛОКИРОВКА',
  'popup.blockedSummary': '{blocked} из этих {total} развернул режим блокировки.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'НАПОМИНАТЬ КАЖДЫЕ',
  'popup.recurringHelperOn': 'Пауза в 5 секунд каждые {m} минут, пока вы смотрите.',
  'popup.recurringHelperOff':
    'Только первая пауза за визит. Включите, чтобы получать напоминание, пока листаете.',
  'popup.recurringCapped': 'Не более {max} минут.',
  'popup.recurringWatchingPrefix': 'Смотрите сейчас — ',
  'popup.recurringProgress': '{elapsed} из {mins} мин',
  'popup.recurringWatchingSuffix': ' до следующей паузы.',
  'popup.decreaseInterval': 'Уменьшить интервал',
  'popup.increaseInterval': 'Увеличить интервал',
  'popup.intervalAria': 'Интервал напоминания в минутах',
  'popup.minutesUnit': 'мин',
  'popup.privacy': 'Ничего не покидает это устройство',
  'popup.degraded': 'Reelief не находит раздел «{feed}». Пауза на {path} по-прежнему работает.',
  'popup.degradedTitle': 'Страница «{feed}» изменилась — исправление обычно занимает пару дней.',
  'popup.checkForUpdate': 'Проверить обновление',
  'popup.report': 'Сообщить',
  'popup.dismiss': 'Закрыть',
  'popup.trendLabel': 'ДИНАМИКА',
  'popup.trendMetricOpens': 'Открытия',
  'popup.trendMetricMinutes': 'Минуты',
  'popup.trendRangeShort': '7 дн',
  'popup.trendRangeLong': '30 дн',
  'popup.trendAria': 'Динамика ({metric}) за {days} дней',
  'popup.trendToday': 'Сегодня',
  'popup.trendDateRangeAria': 'Диапазон дат',
  'popup.trendMetricAria': 'Показатель графика',

  'popup.languageLabel': 'ЯЗЫК',
  'popup.languageMenuAria': 'Язык',
  'popup.moreAria': 'Ещё',

  'popup.onboardTitle': 'Два способа пользоваться Reelief',
  'popup.onboardBody':
    '{friction} останавливает вас на 5 секунд перед загрузкой ленты. {block} разворачивает у двери. Меняйте в любой момент — сейчас у вас режим «{mode}».',
  'popup.onboardCta': 'Понятно',

  'units.open': 'открытие',
  'units.opens': 'открытий',
  'units.min': 'мин',
};
