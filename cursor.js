/** Pointer play for mice and trackpads: a trailing cursor, magnetic controls, and panels that tilt toward the pointer. */
import { follow } from './motion-utils.mjs?v=4';

const RING = 30;
const RING_LINK = 50;
const RING_LABEL = 78;
const RING_LENS = 66;
const MAGNET_PULL = .28;
const MAGNET_LIMIT = 12;
const TILT_DEGREES = 4.5;
const interactiveSelector = 'a[href], button:not(:disabled), [data-cursor]';

export function initCursor({ isPaused = () => false, reducedMotion } = {}) {
  const root = document.documentElement;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-ring"><span class="cursor-label"></span></span><span class="cursor-dot"></span>';
  const ring = cursor.querySelector('.cursor-ring');
  const label = cursor.querySelector('.cursor-label');
  const dot = cursor.querySelector('.cursor-dot');
  document.body.prepend(glow);
  document.body.append(cursor);

  const pointer = { x: -100, y: -100, inside: false, pressed: false };
  const ringState = { x: -100, y: -100, w: RING, h: RING, press: 1 };
  const glowState = { x: -100, y: -100 };
  let target = null;
  let stuck = null;
  let enabled = false;
  let frame = 0;
  let lastFrame = 0;

  const magnets = Array.from(document.querySelectorAll('[data-magnetic]')).map(element => ({
    element,
    parts: Array.from(element.querySelectorAll(':scope > span, :scope > svg')),
    x: 0, y: 0, tx: 0, ty: 0,
  }));
  const tilts = Array.from(document.querySelectorAll('[data-tilt]')).map(element => ({ element, x: 0, y: 0, tx: 0, ty: 0 }));

  function setStyleTranslate(element, x, y) {
    element.style.translate = Math.abs(x) < .05 && Math.abs(y) < .05 ? '' : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  }

  function classify() {
    const element = pointer.inside ? document.elementFromPoint(pointer.x, pointer.y)?.closest(interactiveSelector) : null;
    target = element || null;
    stuck = target?.hasAttribute('data-magnetic') ? target : null;
    const text = target?.dataset.cursor || '';
    if (text) label.textContent = text;
    cursor.classList.toggle('is-label', Boolean(text));
    // A lens is a hollow ring with its label below, so whatever is under the pointer stays visible.
    cursor.classList.toggle('is-lens', Boolean(text) && target.dataset.cursorStyle === 'lens');
    cursor.classList.toggle('is-stuck', Boolean(stuck) && !text);
    cursor.classList.toggle('is-link', Boolean(target) && !text && !stuck);
  }

  function updateMagnets() {
    magnets.forEach(magnet => {
      if (magnet.element !== stuck) {
        magnet.tx = 0;
        magnet.ty = 0;
        return;
      }
      // Measure without the current pull, so the pull does not feed back into itself.
      const rect = magnet.element.getBoundingClientRect();
      const cx = rect.left - magnet.x + rect.width / 2;
      const cy = rect.top - magnet.y + rect.height / 2;
      magnet.tx = Math.max(-MAGNET_LIMIT, Math.min(MAGNET_LIMIT, (pointer.x - cx) * MAGNET_PULL));
      magnet.ty = Math.max(-MAGNET_LIMIT, Math.min(MAGNET_LIMIT, (pointer.y - cy) * MAGNET_PULL));
    });
  }

  function updateTilts() {
    tilts.forEach(tilt => {
      const rect = tilt.element.getBoundingClientRect();
      const over = pointer.inside && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      tilt.element.classList.toggle('is-lit', over);
      if (!over) {
        tilt.tx = 0;
        tilt.ty = 0;
        return;
      }
      const nx = (pointer.x - rect.left) / rect.width * 2 - 1;
      const ny = (pointer.y - rect.top) / rect.height * 2 - 1;
      tilt.tx = -ny * TILT_DEGREES;
      tilt.ty = nx * TILT_DEGREES;
      tilt.element.style.setProperty('--mx', `${(pointer.x - rect.left).toFixed(1)}px`);
      tilt.element.style.setProperty('--my', `${(pointer.y - rect.top).toFixed(1)}px`);
    });
  }

  function render(delta) {
    let busy = false;
    const settle = (value, goal, rate) => {
      const next = follow(value, goal, rate, delta);
      if (Math.abs(next - goal) > .05) busy = true;
      return Math.abs(next - goal) > .05 ? next : goal;
    };
    let goalX = pointer.x;
    let goalY = pointer.y;
    let goalW = RING;
    let goalH = RING;
    if (cursor.classList.contains('is-label')) {
      goalW = goalH = cursor.classList.contains('is-lens') ? RING_LENS : RING_LABEL;
    } else if (stuck) {
      // The ring wraps the control it is stuck to.
      const rect = stuck.getBoundingClientRect();
      goalX = rect.left + rect.width / 2;
      goalY = rect.top + rect.height / 2;
      goalW = rect.width + 14;
      goalH = rect.height + 14;
    } else if (target) {
      goalW = goalH = RING_LINK;
    }
    ringState.x = settle(ringState.x, goalX, 20);
    ringState.y = settle(ringState.y, goalY, 20);
    ringState.w = settle(ringState.w, goalW, 16);
    ringState.h = settle(ringState.h, goalH, 16);
    ringState.press = settle(ringState.press, pointer.pressed ? .86 : 1, 22);
    glowState.x = settle(glowState.x, pointer.x, 3.5);
    glowState.y = settle(glowState.y, pointer.y, 3.5);
    ring.style.width = `${ringState.w.toFixed(2)}px`;
    ring.style.height = `${ringState.h.toFixed(2)}px`;
    ring.style.transform = `translate3d(${(ringState.x - ringState.w / 2).toFixed(2)}px, ${(ringState.y - ringState.h / 2).toFixed(2)}px, 0) scale(${ringState.press.toFixed(3)})`;
    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    glow.style.transform = `translate3d(${glowState.x.toFixed(1)}px, ${glowState.y.toFixed(1)}px, 0)`;

    magnets.forEach(magnet => {
      magnet.x = settle(magnet.x, magnet.tx, 14);
      magnet.y = settle(magnet.y, magnet.ty, 14);
      setStyleTranslate(magnet.element, magnet.x, magnet.y);
      // Icons and arrows inside travel a little further, for depth.
      magnet.parts.forEach(part => setStyleTranslate(part, magnet.x * .45, magnet.y * .45));
    });
    tilts.forEach(tilt => {
      tilt.x = settle(tilt.x, tilt.tx, 9);
      tilt.y = settle(tilt.y, tilt.ty, 9);
      const angle = Math.hypot(tilt.x, tilt.y);
      tilt.element.style.rotate = angle < .02 ? '' : `${tilt.x.toFixed(3)} ${tilt.y.toFixed(3)} 0 ${angle.toFixed(3)}deg`;
    });
    return busy;
  }

  function tick(now) {
    frame = 0;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 1 / 60;
    lastFrame = now;
    if (render(delta)) frame = requestAnimationFrame(tick);
    else lastFrame = 0;
  }
  function wake() {
    if (enabled && !frame) frame = requestAnimationFrame(tick);
  }

  function onMove(event) {
    if (!enabled || event.pointerType === 'touch') return;
    const entering = !pointer.inside;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    if (entering) {
      // Appear where the pointer is, rather than flying in from the last position.
      Object.assign(ringState, { x: pointer.x, y: pointer.y });
      Object.assign(glowState, { x: pointer.x, y: pointer.y });
    }
    cursor.classList.add('is-visible');
    glow.classList.add('is-visible');
    classify();
    updateMagnets();
    updateTilts();
    wake();
  }
  function onLeave() {
    pointer.inside = false;
    cursor.classList.remove('is-visible');
    glow.classList.remove('is-visible');
    classify();
    updateMagnets();
    updateTilts();
    wake();
  }
  function onScroll() {
    if (!enabled || !pointer.inside) return;
    classify();
    updateMagnets();
    updateTilts();
    wake();
  }
  const onDown = event => {
    if (event.pointerType === 'touch') return;
    pointer.pressed = true;
    wake();
  };
  const onUp = () => {
    pointer.pressed = false;
    wake();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  /** Turn everything off when motion is paused or reduced, or the pointer is not a mouse. */
  function sync() {
    const next = finePointer.matches && !isPaused() && !reducedMotion?.matches;
    if (next === enabled) return;
    enabled = next;
    root.classList.toggle('has-cursor', enabled);
    if (enabled) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    pointer.inside = false;
    target = stuck = null;
    cursor.classList.remove('is-visible', 'is-link', 'is-stuck', 'is-label', 'is-lens');
    glow.classList.remove('is-visible');
    magnets.forEach(magnet => {
      Object.assign(magnet, { x: 0, y: 0, tx: 0, ty: 0 });
      setStyleTranslate(magnet.element, 0, 0);
      magnet.parts.forEach(part => setStyleTranslate(part, 0, 0));
    });
    tilts.forEach(tilt => {
      Object.assign(tilt, { x: 0, y: 0, tx: 0, ty: 0 });
      tilt.element.style.rotate = '';
      tilt.element.classList.remove('is-lit');
    });
  }
  finePointer.addEventListener?.('change', sync);
  sync();

  return { sync };
}
