// Pointer capture keeps a held direction paired with its release, including drags and cancellations.
export function touchPad(pad, action, release) {
  const pointers = new Map();
  const buttons = new Map([...pad.querySelectorAll('[data-drive]')].map(button => [button.dataset.drive, button]));

  function change(pointer, direction) {
    const previous = pointers.get(pointer);
    if (previous === direction) return;
    pointers.delete(pointer);
    if (previous && ![...pointers.values()].includes(previous)) {
      buttons.get(previous).classList.remove('pressed');
      release(previous);
    }
    if (!direction) return;
    const alreadyHeld = [...pointers.values()].includes(direction);
    pointers.set(pointer, direction);
    buttons.get(direction).classList.add('pressed');
    if (!alreadyHeld) action(direction);
  }

  function directionAt(element) {
    const button = element?.closest('[data-drive]');
    return pad.contains(button) ? button.dataset.drive : undefined;
  }

  pad.addEventListener('pointerdown', event => {
    const direction = directionAt(event.target);
    if (event.button !== 0 || !direction) return;
    event.preventDefault();
    pad.setPointerCapture(event.pointerId);
    change(event.pointerId, direction);
  });
  pad.addEventListener('pointermove', event => {
    if (!pad.hasPointerCapture(event.pointerId)) return;
    change(event.pointerId, directionAt(document.elementFromPoint(event.clientX, event.clientY)));
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(event, e => change(e.pointerId, undefined));
  }
  pad.addEventListener('contextmenu', event => event.preventDefault());
  pad.addEventListener('click', event => {
    const direction = directionAt(event.target);
    if (event.detail === 0 && direction) { action(direction); release(direction); }
  });
  function clear() {
    for (const pointer of [...pointers.keys()]) change(pointer, undefined);
  }
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  return clear;
}
