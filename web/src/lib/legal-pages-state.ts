/** Simple pub/sub store to show/hide legal pages from anywhere in the app. */
export type LegalPage = "privacy" | "legal" | null;

let _page: LegalPage = null;
let _listeners: Array<(p: LegalPage) => void> = [];

export function showLegalPage(page: LegalPage) {
  _page = page;
  _listeners.forEach((fn) => fn(_page));
}

export function getLegalPage(): LegalPage {
  return _page;
}

export function subscribeToLegalPage(fn: (p: LegalPage) => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}
