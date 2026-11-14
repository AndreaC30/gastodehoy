/* Service worker: show Web Push when the app is closed (loaded via Workbox importScripts). */
/* Guard: Workbox can re-import this file; registering twice shows two banners on iOS. */
if (!self.__gdhPushHandlersBound) {
  self.__gdhPushHandlersBound = true;
  self.__gdhRecentPushTags = self.__gdhRecentPushTags || new Map();

  self.addEventListener("push", (event) => {
    let payload = { title: "GastoDeHoy", body: "", tag: "gdh-push" };
    try {
      if (event.data) {
        payload = { ...payload, ...event.data.json() };
      }
    } catch {
      if (event.data) {
        payload.body = event.data.text();
      }
    }

    const tag = payload.tag || "gdh-push";
    const now = Date.now();
    const last = self.__gdhRecentPushTags.get(tag) || 0;
    /* iOS may deliver the same Web Push twice; Android collapses by tag, Safari does not. */
    if (now - last < 8000) {
      return;
    }
    self.__gdhRecentPushTags.set(tag, now);

    event.waitUntil(
      (async () => {
        try {
          const prior = await self.registration.getNotifications({ tag });
          for (const n of prior) {
            n.close();
          }
        } catch {
          /* getNotifications is optional on some engines */
        }
        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: "/gastodehoy-favicon-192.png",
          badge: "/gastodehoy-favicon-192.png",
          tag,
          renotify: true,
          data: { url: "/" },
        });
        try {
          await self.navigator?.setAppBadge?.(1);
        } catch {
          /* badge unsupported */
        }
      })(),
    );
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || "/");
        }
      }),
    );
  });
}
