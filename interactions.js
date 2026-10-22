/** Small, finite interactions that leave the page readable without JavaScript. */
const TRAVEL = 620;
const DWELL = 620;
const travelEasing = 'cubic-bezier(.65,0,.35,1)';
const settleEasing = 'cubic-bezier(.16,1,.3,1)';

export function initInteractions({ isPaused = () => false, reducedMotion } = {}) {
  let destroyed = false;
  const animations = new Map();
  const cleanups = [];
  const canMove = () => !destroyed && !isPaused() && !reducedMotion?.matches;

  function stopAnimation(element) {
    const animation = animations.get(element);
    if (!animation) return;
    animation.cancel();
    animations.delete(element);
  }

  function track(element, animation) {
    animations.set(element, animation);
    const release = () => {
      if (animations.get(element) === animation) animations.delete(element);
    };
    animation.finished.then(release, release);
    return animation;
  }

  function move(element, transform, animate = false, duration = 460, easing = travelEasing) {
    if (!element) return;
    const previous = getComputedStyle(element).transform;
    stopAnimation(element);
    // The final state is always in the document, including after cancellation.
    element.style.transform = transform;
    if (!animate || !canMove() || !element.animate) return;
    track(element, element.animate(
      [{ transform: previous === 'none' ? transform : previous }, { transform }],
      { duration, easing },
    ));
  }

  /** Restart a CSS animation that is keyed to a class. */
  function replayClass(element, className) {
    element.classList.remove(className);
    if (!canMove()) return;
    void element.offsetWidth;
    element.classList.add(className);
  }

  const workflows = Array.from(document.querySelectorAll('.workflow')).map(element => {
    const steps = Array.from(element.querySelectorAll('button.flow-step[data-step-description]'));
    const state = {
      element,
      steps,
      description: element.querySelector('.workflow-description'),
      line: element.querySelector('.workflow-line'),
      packet: element.querySelector('.flow-packet'),
      fill: element.querySelector('.flow-fill'),
      replay: element.querySelector('button.workflow-replay'),
      active: Math.max(0, steps.findIndex(step => step.getAttribute('aria-pressed') === 'true' || step.classList.contains('is-active'))),
      timer: null,
      seen: false,
    };
    if (!steps.length) return state;
    element.classList.add('is-enhanced');
    if (state.fill) state.fill.style.transformOrigin = 'left center';
    steps.forEach((step, index) => {
      step.disabled = false;
      step.addEventListener('animationend', () => step.classList.remove('is-arriving'));
      const onClick = () => {
        cancelSequence(state, { snap: false });
        state.seen = true;
        const from = state.active;
        selectStep(state, index, { announce: true });
        if (index !== from) travel(state, from, index, TRAVEL * .75, () => arrive(state));
      };
      step.addEventListener('click', onClick);
      cleanups.push(() => step.removeEventListener('click', onClick));
    });
    if (state.replay) {
      const onReplay = () => {
        state.seen = true;
        playSequence(state);
      };
      state.replay.addEventListener('click', onReplay);
      cleanups.push(() => state.replay.removeEventListener('click', onReplay));
    }
    selectStep(state, state.active);
    drawFlow(state);
    return state;
  });

  function drawFlow(state, index = state.active, animate = false, duration) {
    const progress = state.steps.length > 1 ? index / (state.steps.length - 1) : 1;
    // The connector spans the first node's centre to the last, so the packet travels its full width.
    const span = state.line?.clientWidth || 0;
    state.element.style.setProperty('--flow-progress', String(progress));
    move(state.packet, `translate3d(${span * progress}px, 0, 0)`, animate, duration);
    // A zero scale cannot be interpolated as a matrix, so the fill would jump instead of growing.
    move(state.fill, `scaleX(${Math.max(progress, .0001)})`, animate, duration);
  }

  /** Send the packet between nodes, then call back once it lands. */
  function travel(state, from, to, duration, onArrive) {
    if (!canMove()) {
      drawFlow(state, to);
      onArrive?.();
      return;
    }
    state.element.dataset.direction = to < from ? 'back' : 'forward';
    state.element.classList.add('is-traveling');
    drawFlow(state, to, true, duration);
    state.timer = setTimeout(() => {
      state.timer = null;
      state.element.classList.remove('is-traveling');
      onArrive?.();
    }, duration);
  }

  /** The node the packet lands on pings, and its icon draws itself in. */
  function arrive(state) {
    const step = state.steps[state.active];
    if (!step || !canMove()) return;
    replayClass(step, 'is-arriving');
    step.querySelectorAll('.step-symbol path').forEach((path, index) => {
      if (!path.animate) return;
      track(path, path.animate(
        [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }],
        { duration: 520, delay: index * 90, easing: settleEasing, fill: 'backwards' },
      ));
    });
  }

  function setDescription(state, text) {
    const description = state.description;
    if (!description || description.textContent === text) return;
    description.textContent = text;
    if (!canMove() || !description.animate) return;
    stopAnimation(description);
    track(description, description.animate(
      [{ opacity: 0, transform: 'translate3d(0, 6px, 0)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, easing: settleEasing },
    ));
  }

  function selectStep(state, index, { announce = false, describe = false } = {}) {
    if (!state.steps.length) return;
    state.active = Math.min(Math.max(index, 0), state.steps.length - 1);
    state.steps.forEach((step, position) => {
      const active = position === state.active;
      step.classList.toggle('is-active', active);
      step.classList.toggle('is-done', position < state.active);
      step.setAttribute('aria-pressed', String(active));
    });
    if ((announce || describe) && state.description) {
      if (announce) state.description.setAttribute('aria-live', 'polite');
      setDescription(state, state.steps[state.active].dataset.stepDescription);
    }
  }

  /** Stop automatic playback. Without snap, a packet in flight is left for the next move to retarget. */
  function cancelSequence(state, { snap = true } = {}) {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
    state.element.classList.remove('is-playing', 'is-traveling');
    state.description?.setAttribute('aria-live', 'polite');
    if (!snap) return;
    stopAnimation(state.packet);
    stopAnimation(state.fill);
    drawFlow(state);
  }

  function playSequence(state, lead = DWELL) {
    cancelSequence(state);
    if (!state.steps.length) return;
    if (!canMove()) {
      selectStep(state, state.steps.length - 1, { describe: true });
      drawFlow(state);
      return;
    }
    state.element.classList.add('is-playing');
    state.description?.setAttribute('aria-live', 'off');
    selectStep(state, 0, { describe: true });
    drawFlow(state);
    arrive(state);
    let next = 1;
    const advance = () => {
      state.timer = null;
      if (!canMove()) {
        cancelSequence(state);
        return;
      }
      if (next >= state.steps.length) {
        state.element.classList.remove('is-playing');
        state.description?.setAttribute('aria-live', 'polite');
        return;
      }
      const target = next++;
      // Keep visible explanations in sync without announcing every automatic step.
      travel(state, target - 1, target, TRAVEL, () => {
        selectStep(state, target, { describe: true });
        arrive(state);
        state.timer = setTimeout(advance, DWELL);
      });
    };
    state.timer = setTimeout(advance, lead);
  }

  let workflowObserver;
  if ('IntersectionObserver' in window) {
    workflowObserver = new IntersectionObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const state = workflows.find(item => item.element === entry.target);
        if (!state || state.seen) return;
        state.seen = true;
        workflowObserver.unobserve(state.element);
        // Wait for the panel's own entrance before the flow starts.
        if (canMove()) playSequence(state, 900);
        else drawFlow(state);
      });
    }, { threshold: .45 });
    workflows.filter(state => state.steps.length).forEach(state => workflowObserver.observe(state.element));
  }

  function countUp(element) {
    const match = element.textContent.trim().match(/^(\D*)(\d+)(\D*)$/);
    if (!match || !canMove()) return;
    const [, prefix, digits, suffix] = match;
    const target = Number(digits);
    const duration = 1400;
    const start = performance.now();
    // Hold the final width so neighbouring figures do not shift while counting.
    element.style.minWidth = `${element.getBoundingClientRect().width}px`;
    const finish = () => {
      element.textContent = prefix + digits + suffix;
    };
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1 || !canMove()) {
        finish();
        return;
      }
      element.textContent = prefix + Math.round(target * (1 - Math.pow(1 - progress, 4))) + suffix;
      requestAnimationFrame(tick);
    };
    element.textContent = prefix + '0' + suffix;
    requestAnimationFrame(tick);
    cleanups.push(finish);
  }

  const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));
  const revealed = new WeakSet();
  function reveal(element, order = 0) {
    if (destroyed || revealed.has(element)) return;
    revealed.add(element);
    // Elements entering together, such as a row of timeline entries, cascade left to right.
    element.style.setProperty('--reveal-delay', `${Math.min(order, 4) * 90}ms`);
    element.classList.add('is-revealed');
    element.querySelectorAll('.community-figures strong').forEach(countUp);
  }
  let revealObserver;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      if (destroyed) return;
      entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, order) => {
          revealObserver.unobserve(entry.target);
          reveal(entry.target, order);
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-revealed'));
  }
  document.documentElement.classList.add('motion-ready');

  const timelineEntries = Array.from(document.querySelectorAll('.timeline-entry[data-chapter]'));
  const timelineTrack = document.querySelector('.timeline-track');
  function updateTimeline() {
    if (destroyed || !timelineEntries.length) return;
    const viewportHeight = window.innerHeight;
    const focus = viewportHeight * .48;
    const positions = timelineEntries.map((element, index) => ({ element, index, rect: element.getBoundingClientRect() }));
    const visible = positions.filter(item => item.rect.bottom > 0 && item.rect.top < viewportHeight);
    const candidates = visible.length ? visible : positions;
    const nearest = candidates.reduce((best, item) => {
      const distance = Math.abs(item.rect.top + item.rect.height / 2 - focus);
      return !best || distance < best.distance ? { ...item, distance } : best;
    }, null);
    const horizontal = window.matchMedia('(min-width: 768px)').matches;
    const trackRect = timelineTrack?.getBoundingClientRect();
    const progress = horizontal && trackRect
      ? Math.max(0, Math.min(1, (viewportHeight * .85 - trackRect.top) / (trackRect.height * .6 + viewportHeight * .35)))
      : (timelineEntries.length > 1 ? nearest.index / (timelineEntries.length - 1) : 1);
    const activeIndex = horizontal ? Math.min(timelineEntries.length - 1, Math.floor(progress * timelineEntries.length)) : nearest.index;
    timelineEntries.forEach((element, index) => {
      element.classList.toggle('is-current', index === activeIndex);
      element.classList.toggle('is-reached', index < activeIndex);
    });
    timelineTrack?.style.setProperty('--journey-progress', String(progress));
  }
  let timelineObserver;
  if ('IntersectionObserver' in window && timelineEntries.length) {
    timelineObserver = new IntersectionObserver(updateTimeline, {
      rootMargin: '-12% 0px -28% 0px',
      threshold: [0, .1, .25, .5, .75, 1],
    });
    timelineEntries.forEach(element => timelineObserver.observe(element));
  }
  updateTimeline();

  let resizeObserver;
  if ('ResizeObserver' in window) {
    const lineStates = new Map(workflows.filter(state => state.line).map(state => [state.line, state]));
    resizeObserver = new ResizeObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        const state = lineStates.get(entry.target);
        if (state && !state.element.classList.contains('is-traveling')) drawFlow(state);
      });
      updateTimeline();
    });
    lineStates.forEach((state, line) => resizeObserver.observe(line));
    if (timelineTrack) resizeObserver.observe(timelineTrack);
  } else {
    const onResize = () => {
      workflows.forEach(state => drawFlow(state));
      updateTimeline();
    };
    window.addEventListener('resize', onResize, { passive: true });
    cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  function syncMotion() {
    if (destroyed) return;
    const paused = !canMove();
    workflows.forEach(state => {
      state.element.classList.toggle('is-motion-paused', paused);
      if (paused) {
        cancelSequence(state);
        state.steps.forEach(step => step.classList.remove('is-arriving'));
      }
    });
    if (paused) Array.from(animations.keys()).forEach(stopAnimation);
  }
  if (reducedMotion?.addEventListener) {
    reducedMotion.addEventListener('change', syncMotion);
    cleanups.push(() => reducedMotion.removeEventListener('change', syncMotion));
  }
  syncMotion();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    workflows.forEach(state => {
      cancelSequence(state);
      state.element.classList.remove('is-enhanced', 'is-motion-paused');
    });
    Array.from(animations.keys()).forEach(stopAnimation);
    workflowObserver?.disconnect();
    revealObserver?.disconnect();
    timelineObserver?.disconnect();
    resizeObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup());
  }

  return { syncMotion, destroy };
}
