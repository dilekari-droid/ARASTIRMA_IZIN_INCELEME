const uiCss = document.createElement('link');
uiCss.rel = 'stylesheet';
uiCss.href = new URL('./ui-361.css', import.meta.url).href;
document.head.appendChild(uiCss);
await import(new URL('./ui-361.js', import.meta.url));

const PARTS = ['app.part01.js', 'app.part02.js', 'app.part03.js'];
const chunks = await Promise.all(PARTS.map(async name => {
  const response = await fetch(new URL(name, import.meta.url));
  if (!response.ok) throw new Error(`Uygulama modül parçası yüklenemedi: ${name} (${response.status})`);
  return response.text();
}));
let source = chunks.join("");
const coreUrl = new URL("./core-loader.js", import.meta.url).href;
source = source.replace("from './core-loader.js'", `from '${coreUrl}'`);
const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
try { await import(moduleUrl); } finally { URL.revokeObjectURL(moduleUrl); }
