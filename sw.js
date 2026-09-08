/* ==========================================================================
   Service Worker — офлайн жұмыс режимі
   Ойын негізі (HTML/CSS/JS) кэштеліп, интернет болмаса да істей береді.
   ========================================================================== */
'use strict';

var CACHE = 'arheo-cache-v1';
var SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).catch(function () {
        /* кейбір файл кэштелмесе де орнату сәтті аяқталады */
        return Promise.resolve();
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? Promise.resolve() : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* тек өз доменіміздің файлдары (сыртқы шрифттер желі арқылы жүктеледі) */
  if (url.origin !== self.location.origin) { return; }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) {
        /* фондық жаңарту */
        fetch(req).then(function (fresh) {
          if (fresh && fresh.status === 200) {
            caches.open(CACHE).then(function (cache) { cache.put(req, fresh); });
          }
        }).catch(function () { /* офлайн — ештеңе істемейміз */ });
        return cached;
      }
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        /* желі жоқ және кэште жоқ — басты бетті қайтарамыз */
        return caches.match('./index.html');
      });
    })
  );
});
