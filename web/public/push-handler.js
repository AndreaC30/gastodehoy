/* Service worker: show Web Push when the app is closed (loaded via Workbox importScripts). */
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
  const show = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/gastodehoy-favicon-192.png",
    badge: "/gastodehoy-favicon-192.png",
    tag: payload.tag || "gdh-push",
    data: { url: "/" },
  });

  // Set app icon badge (red dot / counter) when push arrives
  const badge = self.navigator?.setAppBadge?.(1);
  const tasks = badge ? Promise.all([show, badge]) : show;

  event.waitUntil(tasks);
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
