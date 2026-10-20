/**
 * Cloudflare Worker — 反向代理
 * 把 https://zionfoto.app/*  代理到 WorkBuddy 托管的站点，
 * 地址栏始终显示 zionfoto.app，内容是真实站点（非 iframe 套壳）。
 *
 * 用法：Cloudflare 后台 → Workers 和 Pages → 创建 Worker → 粘贴本文件全部内容 → 部署
 *      → 该 Worker 的「设置 → 触发器 → 自定义域」添加 zionfoto.app
 */

const TARGET_HOST = 'zion-fotogallery.app.workbuddy.host';
const SHARECODE = 'YY2EGNUGIL';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1) 拼出目标地址，并保证带上 sharecode（访问凭证）
    const target = new URL('https://' + TARGET_HOST + url.pathname + url.search);
    if (!target.searchParams.has('sharecode')) {
      target.searchParams.set('sharecode', SHARECODE);
    }

    // 2) 复制请求头，把 Host 改回源站，让源站正常响应
    const headers = new Headers(request.headers);
    headers.set('Host', TARGET_HOST);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');
    headers.delete('Accept-Encoding'); // 让源站返回明文，压缩交给 Cloudflare 边缘

    const init = { method: request.method, headers, redirect: 'manual' };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.arrayBuffer(); // POST /api/photos 等需要转发 body
    }

    let resp;
    try {
      resp = await fetch(target.toString(), init);
    } catch (err) {
      return new Response('Upstream error: ' + err.message, { status: 502 });
    }

    // 3) 改写响应头：源站返回 no-store 导致每次都回源（很慢），这里放开静态资源缓存
    const out = new Headers(resp.headers);
    const p = url.pathname;
    if (/\.(js|css|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(p)) {
      out.set('Cache-Control', 'public, max-age=3600');   // 静态资源缓存 1 小时
    } else if (p === '/' || p.endsWith('.html')) {
      out.set('Cache-Control', 'public, max-age=60');     // 页面缓存 1 分钟，更新能及时生效
    }
    const loc = out.get('Location');
    if (loc) {
      out.set('Location', loc.split('https://' + TARGET_HOST).join('https://' + url.host));
    }
    out.delete('Content-Security-Policy');
    out.delete('X-Frame-Options');

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: out
    });
  }
};
