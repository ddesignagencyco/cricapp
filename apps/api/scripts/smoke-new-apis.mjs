/**
 * Smoke-test the APIs added in the QA backend pass against a running server.
 * Does not truncate the database.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';
const prisma = new PrismaClient();
const stamp = Date.now();
const results = [];

function cookieHeader(setCookie) {
  if (!setCookie) return '';
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  return parts.map((c) => c.split(';')[0]).join('; ');
}

async function req(method, path, { body, cookie, expectStatus } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const setCookie = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : res.headers.get('set-cookie');
  if (expectStatus !== undefined && res.status !== expectStatus) {
    throw new Error(`${method} ${path} expected ${expectStatus}, got ${res.status}: ${text.slice(0, 400)}`);
  }
  return { status: res.status, json, cookie: cookieHeader(setCookie), headers: res.headers };
}

function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail ?? '' });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const fanEmail = `smoke.fan.${stamp}@example.com`;
  const adminEmail = `smoke.admin.${stamp}@example.com`;
  const superEmail = `smoke.super.${stamp}@example.com`;
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  // --- Auth: signup does not return a session ---
  const signup = await req('POST', '/auth/signup', {
    body: { email: fanEmail, username: `smokefan${stamp}`, password, displayName: 'Smoke Fan' },
    expectStatus: 201,
  });
  check('POST /auth/signup returns no access_token', signup.json.access_token === undefined);
  check('POST /auth/signup returns no session cookie', !signup.cookie.includes('cricapp_access_token'));
  check('POST /auth/signup user is unverified', signup.json.user?.emailVerified === false);
  check('POST /auth/signup asks to verify', String(signup.json.message || '').toLowerCase().includes('verify'));

  const unverifiedLogin = await req('POST', '/auth/login', {
    body: { email: fanEmail, password },
  });
  check('POST /auth/login unverified is 403', unverifiedLogin.status === 403, `status=${unverifiedLogin.status}`);

  const fan = await prisma.user.findUniqueOrThrow({ where: { email: fanEmail } });
  const rawVerify = crypto.randomUUID();
  await prisma.emailVerificationToken.update({
    where: { userId: fan.id },
    data: {
      tokenHash: await bcrypt.hash(rawVerify, 10),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      usedAt: null,
    },
  });
  const tokenRow = await prisma.emailVerificationToken.findUniqueOrThrow({ where: { userId: fan.id } });
  const verified = await req('POST', '/auth/verify-email', {
    body: { token: rawVerify, tokenId: tokenRow.id },
    expectStatus: 200,
  });
  check('POST /auth/verify-email succeeds', Boolean(verified.json.message));

  const login = await req('POST', '/auth/login', {
    body: { email: fanEmail, password },
    expectStatus: 200,
  });
  check('POST /auth/login sets HttpOnly cookie', login.cookie.includes('cricapp_access_token'));
  check('POST /auth/login body has no access_token', login.json.access_token === undefined);
  const fanCookie = login.cookie;

  const me = await req('GET', '/auth/me', { cookie: fanCookie, expectStatus: 200 });
  check('GET /auth/me with cookie', me.json.email === fanEmail);

  const logout = await req('POST', '/auth/logout', { cookie: fanCookie, expectStatus: 200 });
  check('POST /auth/logout', String(logout.json.message || '').toLowerCase().includes('logged out'));

  // Reset via link token (not OTP)
  const forgot = await req('POST', '/auth/forgot-password', {
    body: { email: fanEmail },
    expectStatus: 200,
  });
  check('POST /auth/forgot-password', String(forgot.json.message || '').includes('If an account exists'));
  const resetRow = await prisma.passwordResetToken.findFirst({
    where: { userId: fan.id },
    orderBy: { createdAt: 'desc' },
  });
  const rawReset = crypto.randomUUID();
  await prisma.passwordResetToken.update({
    where: { id: resetRow.id },
    data: { tokenHash: await bcrypt.hash(rawReset, 10), usedAt: null, expiresAt: new Date(Date.now() + 3600 * 1000) },
  });
  const reset = await req('POST', '/auth/reset-password', {
    body: { tokenId: resetRow.id, token: rawReset, password: 'newpassword123' },
    expectStatus: 200,
  });
  check('POST /auth/reset-password with token+tokenId', Boolean(reset.json.message));
  const oldLogin = await req('POST', '/auth/login', { body: { email: fanEmail, password } });
  check('old password rejected after reset', oldLogin.status === 401, `status=${oldLogin.status}`);
  const newLogin = await req('POST', '/auth/login', {
    body: { email: fanEmail, password: 'newpassword123' },
    expectStatus: 200,
  });
  const fanCookie2 = newLogin.cookie;

  // --- Admin / superadmin ---
  let superUser = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (!superUser) {
    superUser = await prisma.user.create({
      data: {
        email: superEmail,
        username: `smokesuper${stamp}`,
        passwordHash: hash,
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
        displayName: 'Smoke Super',
      },
    });
  }
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      username: `smokeadmin${stamp}`,
      passwordHash: hash,
      isAdmin: true,
      isSuperAdmin: false,
      emailVerified: true,
      displayName: 'Smoke Admin',
    },
  });
  const adminLogin = await req('POST', '/auth/login', {
    body: { email: adminEmail, password },
    expectStatus: 200,
  });
  const adminCookie = adminLogin.cookie;
  check('admin profile isSuperAdmin false', adminLogin.json.user?.isSuperAdmin === false);
  check('superadmin exists for protection tests', Boolean(superUser?.id));

  const demote = await req('PATCH', `/admin/users/${superUser.id}`, {
    cookie: adminCookie,
    body: { isAdmin: false },
  });
  check('admin cannot demote superadmin', demote.status === 403, `status=${demote.status}`);
  const delSuper = await req('DELETE', `/admin/users/${superUser.id}`, { cookie: adminCookie });
  check('admin cannot delete superadmin', delSuper.status === 403, `status=${delSuper.status}`);
  const delSelf = await req('DELETE', `/admin/users/${adminUser.id}`, { cookie: adminCookie });
  check('admin cannot delete self', delSelf.status === 403 || delSelf.status === 400, `status=${delSelf.status}`);

  // --- Categories + slugs + 50-word title ---
  const cat = await req('POST', '/news/categories', {
    cookie: adminCookie,
    body: { name: `Smoke Category ${stamp}`, slug: `smoke-cat-${stamp}` },
    expectStatus: 201,
  });
  check('POST /news/categories', cat.json.slug === `smoke-cat-${stamp}`);
  const getCat = await req('GET', `/news/categories/smoke-cat-${stamp}`, { expectStatus: 200 });
  check('GET /news/categories/:slug', getCat.json.id === cat.json.id);
  const patchCat = await req('PATCH', `/news/categories/smoke-cat-${stamp}`, {
    cookie: adminCookie,
    body: { name: `Smoke Category Updated ${stamp}` },
    expectStatus: 200,
  });
  check('PATCH /news/categories/:slug', patchCat.json.name.includes('Updated'));

  const fiftyOne = Array.from({ length: 51 }, (_, i) => `w${i}`).join(' ');
  const tooLong = await req('POST', '/news', {
    cookie: adminCookie,
    body: { title: fiftyOne, content: 'body', isPublished: true },
  });
  check('POST /news rejects 51-word title', tooLong.status === 400, `status=${tooLong.status}`);

  const article = await req('POST', '/news', {
    cookie: adminCookie,
    body: {
      title: `Smoke article ${stamp}`,
      slug: `smoke-article-${stamp}`,
      content: 'Smoke content',
      isPublished: true,
      categoryId: cat.json.id,
    },
    expectStatus: 201,
  });
  check('POST /news stores slug', article.json.slug === `smoke-article-${stamp}`);
  const bySlug = await req('GET', `/news/smoke-article-${stamp}`, { expectStatus: 200 });
  check('GET /news/:slug', bySlug.json.id === article.json.id);

  await req('DELETE', `/news/${article.json.id}`, { cookie: adminCookie });
  const delCat = await req('DELETE', `/news/categories/${patchCat.json.slug}`, { cookie: adminCookie, expectStatus: 200 });
  check('DELETE /news/categories/:slug', delCat.status === 200);

  // --- Tours pagination ---
  const tours = await req('GET', '/tours?page=1&limit=5', { expectStatus: 200 });
  check(
    'GET /tours is paginated',
    Array.isArray(tours.json.data) && tours.json.meta && typeof tours.json.meta.totalRecords === 'number',
    `keys=${Object.keys(tours.json).join(',')}`,
  );

  // --- Live matches: only live ---
  const live = await req('GET', '/matches/live', { expectStatus: 200 });
  const liveList = Array.isArray(live.json) ? live.json : live.json.data ?? [];
  const nonLive = liveList.filter((m) => m.status && m.status !== 'live');
  check('GET /matches/live returns only live statuses', nonLive.length === 0, `count=${liveList.length} nonLive=${nonLive.length}`);

  // --- Stream comments ---
  const stream = await req('POST', '/admin/streams', {
    cookie: adminCookie,
    body: {
      title: `Smoke stream ${stamp}`,
      streamUrl: 'https://example.com/embed/smoke',
      status: 'live',
    },
    expectStatus: 201,
  });
  const posted = await req('POST', `/streams/${stream.json.id}/comments`, {
    cookie: fanCookie2,
    body: { body: 'What a match!' },
    expectStatus: 201,
  });
  check('POST /streams/:id/comments', posted.json.targetType === 'stream' && posted.json.body === 'What a match!');
  const listed = await req('GET', `/streams/${stream.json.id}/comments`, { expectStatus: 200 });
  check(
    'GET /streams/:id/comments',
    Array.isArray(listed.json.data) && listed.json.data.some((c) => c.body === 'What a match!'),
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
