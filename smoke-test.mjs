/* 冒烟测试：在 jsdom 里真实挂载构建产物，捕获运行时错误 + 校验渲染结果 */
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const target = process.argv[2] || 'http://127.0.0.1:8765';
const qs = process.argv[3] || '';
const ROOT = process.cwd();

const errors = [];

const html = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
const asset = (html.match(/\/?(assets\/[^"]+\.js)/) || [])[1];
if (!asset) { console.error('找不到构建产物 JS'); process.exit(1); }
const bundle = fs.readFileSync(path.join(ROOT, 'site', asset), 'utf8');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: target + '/',
  pretendToBeVisual: true,
  runScripts: 'outside-only'
});
const win = dom.window;

// polyfill 浏览器 API
win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
win.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
  unobserve() {} disconnect() {}
};
// framer-motion 会调用旧版 addListener/removeListener，必须一并补齐
win.matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return false; }
});

// fetch 代理到目标源（带 sharecode）
win.fetch = (url, opts) => {
  const abs = String(url).startsWith('http') ? String(url) : target + String(url) + qs;
  return fetch(abs, opts);
};

win.addEventListener('error', (e) => errors.push('window.error: ' + e.message));
const origErr = win.console.error;
win.console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); origErr(...a); };

try {
  win.eval(bundle);
} catch (e) {
  errors.push('eval 抛错: ' + e.message);
}

await new Promise((r) => setTimeout(r, 2500));

const root = win.document.getElementById('root');
const text = root ? root.textContent || '' : '';
const imgs = win.document.querySelectorAll('img');
const buttons = win.document.querySelectorAll('button');

console.log('目标        :', target);
console.log('root 内容长度:', text.length);
console.log('渲染 img 数 :', imgs.length);
console.log('渲染 button :', buttons.length);
console.log('含站点标题  :', text.includes('GALLERY') && text.includes('画廊'));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
console.log('页面无 emoji:', !EMOJI.test(text));
// 字标画在 canvas 上，DOM 里只有 aria-label，不能查 textContent
console.log('开始页字标  :', !!win.document.querySelector('[aria-label="ZION"]'));
console.log('开始页提示  :', text.includes('点击任意位置进入画廊') || text.includes('Click anywhere'));
console.log('Canvas 元素 :', win.document.querySelectorAll('canvas').length);
console.log('背景是否黑底:', win.document.body.innerHTML.includes('bg-canvas'));
console.log('运行时错误  :', errors.length ? errors.slice(0, 5) : '无');

// CSS 校验
const cssFile = (html.match(/\/?(assets\/[^"]+\.css)/) || [])[1];
if (cssFile) {
  const css = fs.readFileSync(path.join(ROOT, 'site', cssFile), 'utf8');
  const checks = {
    '页面黑底 #000000': css.includes('#000000') || css.includes('rgb(0 0 0'),
    'hairline #262626': css.includes('#262626'),
    'ink 白 #ffffff': css.includes('#ffffff') || css.includes('#fff'),
    '正字距 4px/2.5px': css.includes('letter-spacing:4px') || css.includes('letter-spacing:2.5px'),
    '无装饰阴影（soft/lift 未生成）': !/\.shadow-(soft|lift)\s*\{/.test(css),
    '旧拿铁色阴影已清除': !css.includes('74,53,38'),
    '旧拿铁色 #F7F1E8 已清除': !css.toUpperCase().includes('#F7F1E8')
  };
  for (const k in checks) console.log((checks[k] ? '✅' : '❌'), k);
}

// 必须显式退出：framer-motion 的 repeat:Infinity 动画会让 event loop 一直有活，
// 进程不会自然结束（表现为被外层 kill，退出码 137，输出全丢）。
win.close();
process.exit(errors.length ? 1 : 0);
