/** Light and dark themes. The inline script in the page head applies the first theme before paint. */
const STORAGE_KEY = 'theme';
const browserColors = { light: '#f7f8fa', dark: '#0e1014' };

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function store(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private windows can refuse storage; the theme still applies for this visit.
  }
}

export function initTheme({ button, canAnimate = () => true, onChange = () => {} } = {}) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen = readStored();
  const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  function apply(theme) {
    root.dataset.theme = theme;
    meta?.setAttribute('content', browserColors[theme]);
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }
    onChange(theme);
  }

  /** Switch themes, revealing the new one in a circle that grows from the origin point. */
  function setTheme(theme, origin) {
    if (theme === current()) return;
    if (!origin || !document.startViewTransition || !canAnimate()) {
      apply(theme);
      return;
    }
    const transition = document.startViewTransition(() => apply(theme));
    transition.ready.then(() => {
      const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
      root.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }, () => {});
  }

  if (!root.dataset.theme) root.dataset.theme = chosen || (systemDark.matches ? 'dark' : 'light');
  apply(current());

  if (button) {
    button.hidden = false;
    button.addEventListener('click', () => {
      chosen = current() === 'dark' ? 'light' : 'dark';
      store(chosen);
      const rect = button.getBoundingClientRect();
      setTheme(chosen, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    });
  }
  // Follow the system setting until the visitor makes a choice of their own.
  systemDark.addEventListener('change', event => {
    if (!chosen) setTheme(event.matches ? 'dark' : 'light');
  });

  return { current };
}
