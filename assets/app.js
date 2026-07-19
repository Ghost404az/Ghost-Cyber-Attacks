/* ==========================================================================
   Ghost — Cyber Attacks Console
   Boot-line typing animation, shared across all pages.
   Respects prefers-reduced-motion: reduce (skips straight to full text).
   ========================================================================== */

(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.getElementById('bootLine');
  if (!el) return;

  if (prefersReduced) return; // leave the static HTML as-is

  const full = el.innerHTML;
  el.innerHTML = '';
  let i = 0;
  const chunks = full.split(/(<[^>]+>)/g).filter(Boolean);

  function step() {
    if (i >= chunks.length) return;
    const chunk = chunks[i];

    if (chunk.startsWith('<')) {
      el.innerHTML += chunk;
      i++;
      step();
      return;
    }

    let c = 0;
    const iv = setInterval(() => {
      el.innerHTML += chunk[c];
      c++;
      if (c >= chunk.length) {
        clearInterval(iv);
        i++;
        step();
      }
    }, 7);
  }

  step();
})();
