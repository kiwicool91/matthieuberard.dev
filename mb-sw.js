const cacheName = "mb-pwa-1.0";

self.addEventListener('install', e => {
    console.log('%c👍🏼','font-size: 42px',e)

    const cachePromise = caches.open(cacheName).then(cache => {
        return cache.addAll([
            'index.html',
            'dist/css/styles.min.css',
            'dist/js/app.min.js',
            'dist/img/favicon-black.png',
            'dist/pdf/CV-MB-decor-dark.pdf',
            'dist/pdf/CV-MB-decor-light.pdf'
        ])
    });
    e.waitUntil(cachePromise);
});

self.addEventListener('activate', e => {
    console.log('%c🚀','font-size: 42px',e)
    let cacheCleanedPromise =  caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== cacheName) {
                return caches.delete(key);
            }
        })
    });
    e.waitUntil(cacheCleanedPromise);
});

self.addEventListener('fetch', e => {
    console.log('%c🛬','font-size: 28px',e.request.url)
    // network first with cache fallback
    e.respondWith(
        fetch(e.request).then(res => {
            caches.open(cacheName).then(cache => cache.put(e.request, res));
            return res.clone();
        }).catch(err => {
            return caches.match(e.request)
        })
    )
});

/*
self.registration.showNotification('👋🏼', {
    body: 'This is notification from the SW',
    icon: 'dist/images/icons/icon-512x512.png',
    actions: [
        {action: 'accept', title: 'Accept'},
        {action: 'refuse', title: 'Refuse'}
        ]
})

self.addEventListener('notificationclose', e => {
    console.log('notficcation close', e);
})

self.addEventListener('notificationclick', e => {
    if (e.action === 'accept') {

    } else if (e.action === 'refuse') {

    } else {
        // click sur la notification mais pas sur les boutons
    }

    e.notfication.close();
})
*/

self.addEventListener('push', e => {
    console.log('push event', e);
    console.log('push notif text', e.data.text());

    self.registration.showNotification('👋🏼', {
        body: e.data.text(),
        icon: 'dist/img/icons/icon-512x512.png',
        actions: [
            {action: 'accept', title: 'Accept'},
            {action: 'refuse', title: 'Decline'}
        ]
    })
})