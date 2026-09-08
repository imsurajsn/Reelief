/**
 * Indonesian (id). First-draft translation — have a native speaker review
 * before the Chrome Web Store release. Any key omitted here falls back to
 * English (shared/i18n.js).
 */

export default {
  meta: {
    ordinal: (n) => `ke-${n}`,
    plural: (n, forms) => forms.other,
  },

  'overlay.titleN': 'Ini kali {ord} kamu membuka {feed} hari ini.',
  'overlay.titleFirst': '{feed} pertama hari ini.',
  'overlay.subMinutes': '{time} sejauh ini',
  'overlay.subFirst': 'Lima detik, lalu terserah kamu.',
  'overlay.subTake': 'Jeda dulu, baru pilih.',
  'overlay.secondsLeft': '{n} detik',
  'overlay.ctaLeave': 'Nanti saja — kembali',
  'overlay.ctaWait': 'Tetap lanjut · {n}d',
  'overlay.ctaReady': 'Tetap lanjut',
  'overlay.foot': 'Esc juga membawamu kembali. Tidak ada info dari kunjungan ini yang keluar dari perangkatmu.',
  'overlay.heavy': '{time} sejauh ini. Mode Blokir hanya satu ketuk di menu.',
  'overlay.heavyBadge': '{opens} DIBUKA · {time}',
  'overlay.recurringTitle': 'Kamu sudah menonton {minutes} menit tanpa henti.',
  'overlay.recurringSub': 'Ambil lima detik, lalu lanjut atau berhenti.',

  'block.title': 'Mode Blokir aktif — membawamu kembali.',
  'block.sub': 'Kembali ke {home} dalam {n}d',
  'block.skip': 'Pergi sekarang',
  'block.hint': 'Ganti ke mode Friksi dari ikon di bilah alat.',

  'shelf.label': '{feed} disembunyikan',
  'shelf.expandedLabel': '{feed}',
  'shelf.expand': 'Tampilkan bagian {feed}',
  'shelf.collapse': 'Sembunyikan bagian {feed}',

  'reelItem.label': 'Reel disembunyikan',
  'reelItem.expandedLabel': 'Reel',
  'reelItem.expand': 'Tampilkan Reel ini',
  'reelItem.collapse': 'Sembunyikan Reel ini',
  'reelItem.open': 'Buka Reel ini',

  'popup.sectionToday': 'HARI INI',
  'popup.sectionTodayOne': 'HARI INI · {label}',
  'popup.zero': 'Belum ada apa-apa hari ini. Angka muncul saat sebuah feed pertama kali dibuka.',
  'popup.stepAway': 'Kamu berbalik {a} dari {b} kali hari ini.',
  'popup.modeLabel': 'MODE',
  'popup.modeGroupAria': 'Mode',
  'popup.modeFrictionLabel': 'Friksi',
  'popup.modeBlockLabel': 'Blokir',
  'popup.modeFriction': 'Jeda 5 detik sebelum sebuah feed dimuat. Kamu selalu bisa lanjut.',
  'popup.modeBlock': 'Feed tidak akan terbuka. Kamu dikembalikan ke beranda setelah 6 detik.',
  'popup.pillFriction': 'FRIKSI',
  'popup.pillBlock': 'BLOKIR',
  'popup.blockedSummary': '{blocked} dari {total} itu dihentikan oleh mode Blokir.',
  'popup.breakdownRow': '{site}: {value} {unit}',
  'popup.recurringLabel': 'INGATKAN SETIAP',
  'popup.recurringHelperOn': 'Jeda 5 detik setiap {m} menit selama kamu menonton.',
  'popup.recurringHelperOff':
    'Hanya jeda pertama per kunjungan. Aktifkan ini untuk pengingat saat kamu masih menggulir.',
  'popup.recurringCapped': 'Maksimal {max} menit.',
  'popup.recurringWatchingPrefix': 'Sedang menonton — ',
  'popup.recurringProgress': '{elapsed} dari {mins} mnt',
  'popup.recurringWatchingSuffix': ' sebelum jeda berikutnya.',
  'popup.decreaseInterval': 'Kurangi interval',
  'popup.increaseInterval': 'Tambah interval',
  'popup.intervalAria': 'Interval pengingat dalam menit',
  'popup.minutesUnit': 'mnt',
  'popup.privacy': 'Tidak ada yang keluar dari perangkat ini',
  'popup.degraded': 'Reelief tidak menemukan bagian {feed}. Jeda di {path} masih berfungsi.',
  'popup.degradedTitle': 'Halaman {feed} berubah — perbaikan biasanya butuh beberapa hari.',
  'popup.checkForUpdate': 'Periksa pembaruan',
  'popup.report': 'Laporkan',
  'popup.dismiss': 'Tutup',
  'popup.trendLabel': 'TREN',
  'popup.trendMetricOpens': 'Dibuka',
  'popup.trendMetricMinutes': 'Menit',
  'popup.trendRangeShort': '7H',
  'popup.trendRangeLong': '30H',
  'popup.trendAria': 'Tren {metric} {days} hari',
  'popup.trendToday': 'Hari ini',
  'popup.trendDateRangeAria': 'Rentang tanggal',
  'popup.trendMetricAria': 'Metrik grafik',

  'popup.languageLabel': 'BAHASA',
  'popup.languageMenuAria': 'Bahasa',
  'popup.moreAria': 'Lainnya',

  'popup.onboardTitle': 'Dua cara memakai Reelief',
  'popup.onboardBody':
    '{friction} menjedamu 5 detik sebelum sebuah feed dimuat. {block} memutarmu balik di pintu. Ganti kapan saja — kamu sedang di mode {mode}.',
  'popup.onboardCta': 'Mengerti',

  'units.open': 'dibuka',
  'units.opens': 'dibuka',
  'units.min': 'mnt',
};
