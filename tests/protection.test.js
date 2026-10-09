const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function run(file, url, body, extra = {}) {
  const calls = [];
  const context = { $request: { url, headers: { 'user-agent': 'YouTube' } }, $response: { body }, $done: value => calls.push(value), console: { log() {} }, ...extra };
  // Proxy engines execute scripts in a wrapper, allowing their top-level return.
  vm.runInNewContext('(function(){' + fs.readFileSync(path.join(root, file), 'utf8') + '\n})()', context);
  assert.equal(calls.length, 1);
  return calls[0];
}

const pinURL = 'https://api.pinterest.com/v3/feeds/home/?page=1';
test('Pinterest keeps organic commerce/search recommendations/cursors and removes explicit ads', () => {
  const obj = { data: [{ id: 'organic', affiliate_disclosure: {}, promoter: {}, shopping_mdl_browser_type: 'shop' },
    { id: 'search', story_type: 'slp_search_recommendation' }, { id: 'ad', is_promoted: true },
    { type: 'story', objects: [] }], cursor: ['keep'], metadata: { items: [{ is_promoted: true }] } };
  const output = JSON.parse(run('pinterest.js', pinURL, JSON.stringify(obj)).body);
  assert.deepEqual(output.data.map(x => x.id || x.type), ['organic', 'search', 'story']);
  assert.deepEqual(output.cursor, obj.cursor);
  assert.deepEqual(output.metadata, obj.metadata);
});
test('Pinterest removes newly empty ad containers, keeps unrelated nested metadata', () => {
  const body = JSON.stringify({ data: [{ type: 'story', objects: [{ is_promoted: true }] },
    { id: 'keep', metadata: { items: [{ is_promoted: true }] } }] });
  const output = JSON.parse(run('pinterest.js', pinURL, body).body);
  assert.equal(output.data.length, 1);
  assert.equal(output.data[0].metadata.items.length, 1);
});
test('Pinterest fallback and unchanged responses preserve bytes', () => {
  for (const body of ['', '{bad', '{ "data": [] }', '{"other":[]}']) {
    assert.equal(run('pinterest.js', pinURL, body).body, body);
  }
  const body = '{"data":[{"is_promoted":true}]}';
  assert.equal(run('pinterest.js', 'https://api.pinterest.com/v3/account/', body).body, body);
});
test('Bstar exact ad markers preserve download, nonobjects and cursor', () => {
  const body = JSON.stringify({ data: { items: [{ card_type: 'download' }, null, 'keep', { card_type: 'ad' }, { ad: {} }], cursor: 'next' } });
  const output = JSON.parse(run('scripts/bstar.enhance.js', 'https://app.biliintl.com/intl/gateway/v2/app/feed/home', body).body);
  assert.deepEqual(output.data.items, [{ card_type: 'download' }, null, 'keep']);
  assert.equal(output.data.cursor, 'next');
  assert.equal(run('scripts/bstar.enhance.js', 'https://app.biliintl.com/intl/gateway/v2/app/feed/home', '{bad').body, '{bad');
});
test('Shopee rules have exact MITM coverage and reject lookalike paths', () => {
  const module = fs.readFileSync(path.join(root, 'CoSN.sgmodule'), 'utf8');
  const mitm = module.split('hostname = %APPEND% ')[1].trim().split(', ');
  const rules = module.split('\n').filter(line => line.startsWith('URL-REGEX,') && /shopee|akamaihd/.test(line));
  assert.equal(rules.length, 4);
  for (const line of rules) {
    const regex = new RegExp(line.split(',')[1]);
    const source = regex.source.replace(/\\\//g, '/').replace(/\\\./g, '.');
    const host = source.split('//')[1].split('/')[0];
    assert.ok(mitm.includes(host), host);
  }
  const regex = new RegExp(rules[0].split(',')[1]);
  assert.ok(regex.test('https://ubta.tracking.shopee.vn/v4/sac/event_batch?x=1'));
  assert.ok(!regex.test('https://ubta.tracking.shopee.vn/v4/sac/event_batch_other'));
  assert.ok(!regex.test('https://deo.shopeemobile.com/other/debug.json'));
});
test('Clean and Focus are independent; Bili shared owner is Enhanced', () => {
  const clean = fs.readFileSync(path.join(root, 'CoSN.sgmodule'), 'utf8');
  assert.ok(!clean.includes('discovery.api.zaloapp.com'));
  assert.ok(!clean.includes('get\\/config'));
  assert.ok(!clean.includes('bstar.enhance.js'));
  assert.ok(!clean.includes('deviceenrollment.apple.com'));
  const focus = fs.readFileSync(path.join(root, 'zalo-focus.sgmodule'), 'utf8');
  assert.ok(focus.includes('discovery.api.zaloapp.com'));
  const bili = fs.readFileSync(path.join(root, 'Bili-Enhanced.sgmodule'), 'utf8');
  assert.ok(!bili.includes('Teenagers\\/ModeStatus'));
  assert.ok(!bili.includes('history\\/v'));
  assert.equal(bili.split('\n').filter(line => line.includes('/data\\/report') && line.startsWith('^')).length, 1);
});
test('YouTube malformed protobuf exits once unchanged; config logs never contain key dump', () => {
  for (const file of ['youtube.response.js', 'youtube.request.js']) {
    assert.ok(!fs.readFileSync(path.join(root, file), 'utf8').includes('saveKeyConfig:'));
  }
  // Sanitized malformed binary, not a JSON substitute for protobuf.
  const context = { $environment: { 'surge-version': '5' }, $persistentStore: { read: () => null, write: () => true },
    $notification: { post() {} }, $argument: '{"captionLang":"off"}' };
  const result = run('youtube.response.js', 'https://youtubei.googleapis.com/youtubei/v1/player', new Uint8Array([255]), context);
  // Surge $done({}) means no changes, not an empty response.
  assert.equal(Object.keys(result).length, 0);
});
test('YouTube valid player binary removes ad placement, retains unknown organic field', () => {
  const original = new Uint8Array([18, 0, 58, 0, 194, 12, 4, 110, 101, 120, 116]); // field 2 status, field 7 ad, unknown field 200 "next"
  const result = run('youtube.response.js', 'https://youtubei.googleapis.com/youtubei/v1/player', original, {
    $persistentStore: { read: () => null, write: () => true }, $notification: { post() {} },
    $argument: '{"captionLang":"off"}',
  });
  assert.ok(ArrayBuffer.isView(result.body));
  const bytes = Array.from(result.body);
  assert.ok(!bytes.some((value, i) => value === 58 && bytes[i + 1] === 0));
  assert.ok(Buffer.from(bytes).includes(Buffer.from([194, 12, 4, 110, 101, 120, 116])));
});
test('YouTube unknown response endpoint exits unchanged', () => {
  const result = run('youtube.response.js', 'https://youtubei.googleapis.com/youtubei/v1/unknown', new Uint8Array([8, 1]), {
    $persistentStore: { read: () => null, write: () => true }, $notification: { post() {} },
    $argument: '{}',
  });
  assert.equal(Object.keys(result).length, 0);
});
test('YouTube request phase needs no response, preserves body and unrelated headers', () => {
  const calls = [];
  const bytes = new Uint8Array([8, 1]);
  const context = { $request: { url: 'https://youtubei.googleapis.com/youtubei/v1/log_event', body: bytes,
      headers: { 'user-agent': 'YouTube', 'content-encoding': 'gzip', 'x-youtube-hot-hash-data': 'hash', keep: 'yes' } },
    $done: value => calls.push(value), $persistentStore: { read: () => null, write: () => true },
    $notification: { post() {} }, console: { log() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'youtube.request.js'), 'utf8'), context);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.keep, 'yes');
  assert.ok(!('content-encoding' in calls[0].headers));
  assert.ok(!('x-youtube-hot-hash-data' in calls[0].headers));
  assert.equal(context.$request.body, bytes);
  assert.ok(!('response' in calls[0]));
});
test('YouTube request matcher is anchored and only API host is intercepted', () => {
  const module = fs.readFileSync(path.join(root, 'youtube.sgmodule'), 'utf8');
  const line = module.split('\n').find(x => x.startsWith('youtube.request.log_event ='));
  const regex = new RegExp(line.split('pattern=')[1].split(',requires-body')[0]);
  assert.ok(regex.test('https://youtubei.googleapis.com/youtubei/v1/log_event?x=1'));
  assert.ok(!regex.test('https://youtubei.googleapis.com/youtubei/v1/log_event_other'));
  assert.ok(!regex.test('https://youtubei.googleapis.com/youtubei/v1/log_event/child'));
  assert.ok(!module.includes('*.googlevideo.com'));
});
