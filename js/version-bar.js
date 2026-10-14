/* The version bar on each preview page: switch between the four versions (bottom-right on wide screens, a menu at the
   top-right on narrow ones, where the story's progress bar has the bottom). */
(() => {
  const V = [["paced", "Paced", "Your scroll drives it"], ["snap", "Snap", "Lands on every beat"], ["stepped", "Stepped", "One scroll, one step"], ["video", "Video", "Plays on its own"]];
  const here = document.body.dataset.version;
  const cur = V.find((v) => v[0] === here) || V[0];
  const st = document.createElement('style');
  st.textContent = `.vbar{position:fixed;z-index:2147483000;right:16px;bottom:16px;display:flex;align-items:center;gap:10px;padding:4px 4px 4px 14px;border-radius:999px;
      background:rgba(20,16,13,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 4px 16px rgba(0,0,0,.28);
      font:500 12px/1 Geist,system-ui,-apple-system,sans-serif;color:#f4f0ea}
    .vbar .vb-cap{color:rgba(244,240,234,.6);white-space:nowrap}
    .vbar .vb-cap b{font-weight:500;color:#f4f0ea}
    .vbar nav{display:flex;gap:2px}
    .vbar a{padding:8px 11px;border-radius:999px;color:rgba(244,240,234,.72);text-decoration:none;-webkit-tap-highlight-color:transparent}
    .vbar a:hover{color:#fff;background:rgba(244,240,234,.1)}
    .vbar a[aria-current]{background:#f4f0ea;color:#1a1714}
    .vbar a:focus-visible,.vbar select:focus-visible{outline:2px solid #fff;outline-offset:1px}
    .vbar select{display:none}
    @media (max-width:1359px){.vbar .vb-cap span{display:none}}
    @media (max-width:999px){.vbar{top:max(10px,env(safe-area-inset-top));bottom:auto;right:10px;padding:0}.vbar .vb-cap,.vbar nav{display:none}
      .vbar select{display:block;appearance:none;-webkit-appearance:none;border:0;border-radius:999px;padding:9px 28px 9px 13px;font:inherit;color:#fff;
        background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23fff' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 12px center}}`;
  document.head.appendChild(st);
  const bar = document.createElement('div');
  bar.className = 'vbar';
  bar.innerHTML = `<p class="vb-cap" style="margin:0"><b>${cur[1]}</b><span> · ${cur[2]}</span></p>` +
    `<nav aria-label="Versions">${V.map((v) => `<a href="${v[0]}.html"${v[0] === here ? ' aria-current="page"' : ''}>${v[1]}</a>`).join('')}</nav>` +
    `<select aria-label="Version">${V.map((v) => `<option value="${v[0]}.html"${v[0] === here ? ' selected' : ''}>${v[1]} · ${v[2]}</option>`).join('')}</select>`;
  bar.querySelector('select').onchange = (e) => { location.href = e.target.value; };
  document.body.appendChild(bar);
})();
