// app/page-loader.tsx
// Pantalla de carga al entrar o recargar la web — la misma que villalen.es
// (repositorio web-villalen: css/style.css "Page loader" + js/page-loader.js):
// fondo verde monte, redondel de carga → aparece el perro → la pantalla sube
// como una puerta de garaje.
//
// Va en el HTML del servidor con un <script> en línea para que se vea desde
// el primer instante, antes de que cargue React. Como vive en el layout raíz,
// que no se vuelve a montar al navegar con el menú, solo aparece en cargas
// completas de página (entrar, F5), nunca al cambiar de sección.

const LOADER_SCRIPT = `(function () {
  var MIN_VISIBLE_MS = 600;
  var MAX_WAIT_MS = 4000;
  // En sintonía con las duraciones de .page-loader--closing / --sliding (globals.css)
  var CLOSE_DURATION_MS = 650;
  var SLIDE_DURATION_MS = 900;

  var startTime = Date.now();
  var loader = document.getElementById('page-loader');
  if (!loader) return;
  var started = false;

  function runCloseSequence() {
    if (started) return;
    started = true;
    // Fase 1: el redondel se desvanece y aparece el perro
    loader.classList.add('page-loader--closing');
    setTimeout(function () {
      // Fase 2: la pantalla sube como una puerta de garaje
      loader.classList.add('page-loader--sliding');
      document.documentElement.classList.remove('is-loading');
      setTimeout(function () {
        loader.style.display = 'none';
      }, SLIDE_DURATION_MS + 50);
    }, CLOSE_DURATION_MS);
  }

  function beginHide() {
    var remaining = MIN_VISIBLE_MS - (Date.now() - startTime);
    if (remaining > 0) setTimeout(runCloseSequence, remaining);
    else runCloseSequence();
  }

  if (document.readyState === 'complete') beginHide();
  else window.addEventListener('load', beginHide);
  setTimeout(runCloseSequence, MAX_WAIT_MS);
})();`;

export default function PageLoader() {
  return (
    <>
      {/* suppressHydrationWarning: el script cambia sus clases antes de que
          React hidrate, y no debe "corregirlas" de vuelta. */}
      <div id="page-loader" suppressHydrationWarning>
        <p className="page-loader__eyebrow">Casa de Aldea &middot; Ribadesella</p>
        <p className="page-loader__brand">Villalén</p>
        <div className="page-loader__mark" role="status" aria-label="Cargando">
          <div className="page-loader__spinner" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="page-loader__mascot" src="/images/loader-dog.png" alt="" aria-hidden="true" />
        </div>
        {/* Firma del autor, igual que en la pantalla de carga de Gym-Web-Administration. */}
        <p className="page-loader__credit">
          by <span>crisvb7</span>
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: LOADER_SCRIPT }} />
    </>
  );
}
