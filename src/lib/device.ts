export function isDesktopOnly() {
  return window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
}
