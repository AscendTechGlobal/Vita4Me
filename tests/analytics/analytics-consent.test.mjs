import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  EVENT_DESTINATION_MAP,
  isSensitiveAuthenticatedPath,
  sanitizeTrackingPath,
  sanitizeTrackingPayload,
  sanitizeTrackingUrl,
} from '../../src/analytics/events.ts';
import {
  acceptAllTrackingConsent,
  applyGoogleConsentDefault,
  getTrackingConsent,
  rejectNonEssentialTrackingConsent,
  resetInMemoryConsentForTests,
  saveCustomTrackingConsent,
  toGoogleConsentModeV2,
  TRACKING_CONSENT_STORAGE_KEY,
} from '../../src/analytics/consent.ts';
import {
  ATTRIBUTION_STORAGE_KEY,
  captureAttributionFromLocation,
  getAttributionSnapshot,
  resetVolatileAttributionForTests,
} from '../../src/analytics/attribution.ts';
import {
  initAnalytics,
  resetAnalyticsForTests,
  trackAiUsage,
  trackEvent,
  trackPageView,
} from '../../src/analytics/analytics.ts';
import {
  recordProductAnalyticsEvent,
  sanitizeAttributionTouchServer,
  upsertUserAttribution,
} from '../../src/server/analytics/analyticsService.ts';
import { isClarityAllowedPath } from '../../src/analytics/providers/clarity.ts';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

function setupBrowserDomShim(initialUrl = 'https://vita4me.com/') {
  const parsed = new URL(initialUrl);
  const appendedScripts = [];
  const head = {
    appendChild: (el) => {
      appendedScripts.push(el);
      return el;
    },
  };
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();

  const windowObj = {
    location: {
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      href: parsed.href,
    },
    innerWidth: 1280,
    localStorage,
    sessionStorage,
    dataLayer: [],
  };

  const documentObj = {
    title: 'Vita4Me',
    referrer: '',
    head,
    createElement: (tag) => ({ tagName: tag.toUpperCase(), id: '', src: '', async: false }),
    getElementById: (id) => appendedScripts.find((s) => s.id === id) || null,
  };

  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  globalThis.window = windowObj;
  globalThis.document = documentObj;

  resetInMemoryConsentForTests();
  resetVolatileAttributionForTests();
  resetAnalyticsForTests();

  return {
    windowObj,
    documentObj,
    appendedScripts,
    localStorage,
    cleanup: () => {
      resetAnalyticsForTests();
      resetVolatileAttributionForTests();
      resetInMemoryConsentForTests();
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevDocument === undefined) delete globalThis.document;
      else globalThis.document = prevDocument;
    },
  };
}

function withTrackingEnv(vars, fn) {
  const keys = [
    'VITE_GTM_ID',
    'VITE_GA_MEASUREMENT_ID',
    'VITE_GOOGLE_ADS_ID',
    'VITE_GOOGLE_ADS_SIGNUP_LABEL',
    'VITE_GOOGLE_ADS_TRIAL_LABEL',
    'VITE_GOOGLE_ADS_PURCHASE_LABEL',
    'VITE_META_PIXEL_ID',
    'VITE_CLARITY_PROJECT_ID',
  ];
  const prev = {};
  for (const k of keys) {
    prev[k] = process.env[k];
    if (vars[k] !== undefined) process.env[k] = vars[k];
    else delete process.env[k];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    });
}

test('1. Sem consentimento: Consent Mode default denied, zero scripts externos e zero atribuição persistida', async () => {
  await withTrackingEnv(
    {
      VITE_GTM_ID: 'GTM-TEST1234',
      VITE_META_PIXEL_ID: '123456789012',
      VITE_CLARITY_PROJECT_ID: 'claritytest1',
    },
    async () => {
      const dom = setupBrowserDomShim(
        'https://vita4me.com/?utm_source=google&utm_medium=cpc&utm_campaign=saude&gclid=GCLID_999'
      );
      try {
        initAnalytics();

        const consent = getTrackingConsent();
        assert.equal(consent.choiceMade, false);
        assert.deepEqual(toGoogleConsentModeV2(consent), {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted',
        });

        const defaultCmd = dom.windowObj.dataLayer.find(
          (entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'default'
        );
        assert.ok(defaultCmd, 'gtag consent default deve ser enfileirado');
        assert.equal(defaultCmd[2].analytics_storage, 'denied');
        assert.equal(defaultCmd[2].ad_storage, 'denied');

        // Zero scripts externos injetados antes do consentimento
        assert.equal(dom.appendedScripts.length, 0);
        // Zero gravação persistente em localStorage
        assert.equal(dom.localStorage.getItem(TRACKING_CONSENT_STORAGE_KEY), null);
        assert.equal(dom.localStorage.getItem(ATTRIBUTION_STORAGE_KEY), null);

        trackEvent('pricing_viewed', { plan_tier: 'individual', source_surface: 'landing' });
        assert.equal(
          dom.windowObj.dataLayer.some((entry) => !Array.isArray(entry) && entry?.event === 'pricing_viewed'),
          false
        );
      } finally {
        dom.cleanup();
      }
    }
  );
});

test('2. Rejeição de cookies não essenciais bloqueia todos os provedores e limpa atribuição', async () => {
  await withTrackingEnv(
    {
      VITE_GTM_ID: 'GTM-TEST1234',
      VITE_META_PIXEL_ID: '123456789012',
      VITE_CLARITY_PROJECT_ID: 'claritytest1',
    },
    async () => {
      const dom = setupBrowserDomShim(
        'https://vita4me.com/?utm_source=meta&utm_medium=paid_social&fbclid=FBCLID_1'
      );
      try {
        initAnalytics();
        const rejected = rejectNonEssentialTrackingConsent();
        assert.equal(rejected.choiceMade, true);
        assert.equal(rejected.analytics, false);
        assert.equal(rejected.marketing, false);

        assert.equal(dom.appendedScripts.length, 0);
        assert.equal(dom.localStorage.getItem(ATTRIBUTION_STORAGE_KEY), null);

        trackEvent('signup_completed', { provider: 'email_password' });
        assert.equal(
          dom.windowObj.dataLayer.some((e) => !Array.isArray(e) && e?.event === 'signup_completed'),
          false
        );
      } finally {
        dom.cleanup();
      }
    }
  );
});

test('3. Analytics ONLY: carrega GTM/Clarity em rota pública, grava UTM sem click IDs e pausa Clarity em /app/*', async () => {
  await withTrackingEnv(
    {
      VITE_GTM_ID: 'GTM-TEST1234',
      VITE_GOOGLE_ADS_ID: 'AW-123456789',
      VITE_GOOGLE_ADS_PURCHASE_LABEL: 'PURCHASE_LBL',
      VITE_META_PIXEL_ID: '123456789012',
      VITE_CLARITY_PROJECT_ID: 'claritytest1',
    },
    async () => {
      const dom = setupBrowserDomShim(
        'https://vita4me.com/?utm_source=google&utm_medium=cpc&utm_campaign=lancamento&gclid=GCLID_ONLY_MKT'
      );
      try {
        initAnalytics();
        saveCustomTrackingConsent({ analytics: true, marketing: false });

        // GTM e Clarity públicos devem ser injetados; Meta Pixel NÃO pode carregar
        const ids = dom.appendedScripts.map((s) => s.id);
        assert.ok(ids.includes('vita4me-gtm-script'));
        assert.ok(ids.includes('vita4me-clarity-script'));
        assert.equal(ids.includes('vita4me-meta-pixel-script'), false);

        const attr = getAttributionSnapshot();
        assert.equal(attr.first_touch?.utm_source, 'google');
        assert.equal(attr.first_touch?.gclid, undefined, 'gclid não deve persistir sem marketing');

        const updateCmd = [...dom.windowObj.dataLayer]
          .reverse()
          .find((entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update');
        assert.equal(updateCmd[2].analytics_storage, 'granted');
        assert.equal(updateCmd[2].ad_storage, 'denied');

        // Navegação para rota privada interrompe Clarity imediatamente (allowlist fail-closed)
        assert.equal(isClarityAllowedPath('/'), true);
        assert.equal(isClarityAllowedPath('/privacidade'), true);
        assert.equal(isClarityAllowedPath('/termos'), true);
        assert.equal(isClarityAllowedPath('/cookies'), true);
        assert.equal(isClarityAllowedPath('/login'), false);
        assert.equal(isClarityAllowedPath('/cadastro'), false);
        assert.equal(isClarityAllowedPath('/app'), false);
        assert.equal(isClarityAllowedPath('/app/exames'), false);
        assert.equal(isClarityAllowedPath('/reset-password'), false);
        assert.equal(isClarityAllowedPath('/auth/confirm'), false);

        trackPageView('/app/exames?exam=hemograma&token=secret', 'Meus Exames');
        const clarityCalls = dom.windowObj.clarity?.q || [];
        assert.ok(clarityCalls.some((c) => c[0] === 'stop'));
        assert.equal(isSensitiveAuthenticatedPath('/app/exames'), true);
        assert.equal(isSensitiveAuthenticatedPath('/reset-password'), true);
        assert.equal(isSensitiveAuthenticatedPath('/auth/confirm'), true);

        // Estratégia GTM-first: GA4 standalone não deve injetar script duplicado quando GTM está ativo
        assert.equal(ids.includes('vita4me-ga4-script'), false);

        // Zero page_view duplicado na mesma rota
        const dlBeforeDup = dom.windowObj.dataLayer.length;
        trackPageView('/app/exames', 'Meus Exames');
        assert.equal(dom.windowObj.dataLayer.length, dlBeforeDup, 'Mesma rota não deve re-emitir page_view duplicado');
      } finally {
        dom.cleanup();
      }
    }
  );
});

test('4. Analytics + Marketing + Revogação posterior revoga Consent Mode, Clarity e limpa click IDs sem injetar Meta/GA4 diretos', async () => {
  await withTrackingEnv(
    {
      VITE_GTM_ID: 'GTM-TEST1234',
      VITE_GOOGLE_ADS_ID: 'AW-123456789',
      VITE_GOOGLE_ADS_PURCHASE_LABEL: 'PURCHASE_LBL',
      VITE_CLARITY_PROJECT_ID: 'claritytest1',
    },
    async () => {
      const dom = setupBrowserDomShim(
        'https://vita4me.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=v4m&fbclid=FB_999'
      );
      try {
        // Simula fbq carregado pelo próprio GTM para verificar revogação defensiva
        const fbqRevokeCalls = [];
        dom.windowObj.fbq = (...args) => fbqRevokeCalls.push(args);

        initAnalytics();
        acceptAllTrackingConsent();

        const attrGranted = getAttributionSnapshot();
        assert.equal(attrGranted.first_touch?.fbclid, 'FB_999');

        const ids = dom.appendedScripts.map((s) => s.id);
        assert.ok(ids.includes('vita4me-gtm-script'));
        assert.equal(ids.includes('vita4me-ga4-script'), false, 'GA4 direto nunca deve ser injetado');
        assert.equal(ids.includes('vita4me-meta-pixel-script'), false, 'Meta Pixel direto nunca deve ser injetado');
        assert.ok(ids.includes('vita4me-clarity-script'));

        trackEvent('subscription_started', {
          plan_tier: 'family',
          billing_interval: 'monthly',
          value: 49.9,
          currency: 'BRL',
          transaction_id: 'sub_tx_123',
        });

        assert.ok(
          dom.windowObj.dataLayer.some(
            (e) => !Array.isArray(e) && e?.event === 'subscription_started' && e?.plan_tier === 'family'
          )
        );
        assert.ok(
          dom.windowObj.dataLayer.some(
            (e) => !Array.isArray(e) && e?.event === 'ads_conversion_subscription_started'
          )
        );

        // Revogação após aceite
        rejectNonEssentialTrackingConsent();
        assert.equal(dom.localStorage.getItem(ATTRIBUTION_STORAGE_KEY), null);
        assert.ok(fbqRevokeCalls.some((c) => c[0] === 'consent' && c[1] === 'revoke'));
        assert.ok((dom.windowObj.clarity?.q || []).some((c) => c[0] === 'stop'));

        const lastUpdate = [...dom.windowObj.dataLayer]
          .reverse()
          .find((entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update');
        assert.equal(lastUpdate[2].analytics_storage, 'denied');
        assert.equal(lastUpdate[2].ad_storage, 'denied');

        const dataLayerLenBefore = dom.windowObj.dataLayer.length;
        trackEvent('pricing_viewed', { plan_tier: 'individual' });
        assert.equal(dom.windowObj.dataLayer.length, dataLayerLenBefore);
      } finally {
        dom.cleanup();
      }
    }
  );
});

test('5. Privacidade clínica: eventos de saúde nunca vão para externos e sanitizer remove PII/tokens', async () => {
  await withTrackingEnv(
    {
      VITE_GTM_ID: 'GTM-TEST1234',
      VITE_META_PIXEL_ID: '123456789012',
    },
    async () => {
      const dom = setupBrowserDomShim('https://vita4me.com/app/exames');
      try {
        initAnalytics();
        acceptAllTrackingConsent();
        const baselineEvents = dom.windowObj.dataLayer.length;
        const baselineFbq = (dom.windowObj.fbq?.queue || []).length;

        const healthEvents = [
          'exam_upload_started',
          'exam_upload_completed',
          'exam_created',
          'document_uploaded',
          'ai_analysis_started',
          'ai_analysis_completed',
          'ai_used',
          'family_member_created',
          'health_indicator_created',
          'medication_created',
          'drawer_opened',
          'exam_viewed',
        ];

        for (const ev of healthEvents) {
          assert.equal(EVENT_DESTINATION_MAP[ev], 'INTERNAL_ONLY');
          trackEvent(ev, {
            patient_name: 'Paciente Teste',
            email: 'paciente@exemplo.com',
            cpf: '123.456.789-00',
            diagnosis: 'Hipotireoidismo',
            medication: 'Levotiroxina',
            raw_text: 'TSH alterado',
            has_file: true,
          });
        }
        trackAiUsage('exam_explanation');

        assert.equal(dom.windowObj.dataLayer.length, baselineEvents, 'Nenhum evento de saúde pode ir ao dataLayer/GTM');
        assert.equal((dom.windowObj.fbq?.queue || []).length, baselineFbq, 'Nenhum evento de saúde pode ir à Meta');

        // URLs sensíveis
        assert.equal(
          sanitizeTrackingPath('/reset-password?token_hash=secret_abc123&type=recovery'),
          '/reset-password'
        );
        assert.equal(
          sanitizeTrackingPath('/auth/confirm?code=oauth_code_123&email=user@test.com#access_token=jwt_xyz'),
          '/auth/confirm'
        );
        assert.equal(sanitizeTrackingPath('/app/exames?search=glicose&patient=joao'), '/app/exames');
        assert.equal(
          sanitizeTrackingUrl('/?utm_source=google&token=secret&email=a@b.com&utm_campaign=v4m'),
          'https://vita4me.com/?utm_source=google&utm_campaign=v4m'
        );

        const sanitizedExternal = sanitizeTrackingPayload('cta_clicked', {
          cta_id: 'hero_cta',
          email: 'leak@test.com',
          diagnosis: 'diabetes',
          cpf: '111.222.333-44',
          source_surface: 'landing',
          custom_secret: 'pacient@secret.com',
        });
        assert.deepEqual(sanitizedExternal, {
          cta_id: 'hero_cta',
          source_surface: 'landing',
        });
      } finally {
        dom.cleanup();
      }
    }
  );
});

test('6. Atribuição First-Touch imutável vs Last-Touch mutável + helpers server-side idempotentes', async () => {
  const dom = setupBrowserDomShim(
    'https://vita4me.com/?utm_source=google&utm_medium=cpc&utm_campaign=first_camp&gclid=G1'
  );
  try {
    acceptAllTrackingConsent();
    const visit1 = captureAttributionFromLocation({
      search: '?utm_source=google&utm_medium=cpc&utm_campaign=first_camp&gclid=G1',
      pathname: '/',
    });
    assert.equal(visit1.first_touch?.utm_source, 'google');
    assert.equal(visit1.first_touch?.utm_campaign, 'first_camp');
    assert.equal(visit1.last_touch?.utm_campaign, 'first_camp');

    const visit2 = captureAttributionFromLocation({
      search: '?utm_source=meta&utm_medium=paid_social&utm_campaign=retargeting&fbclid=FB2',
      pathname: '/?utm_source=meta',
    });
    assert.equal(visit2.first_touch?.utm_source, 'google', 'first_touch deve permanecer imutável');
    assert.equal(visit2.first_touch?.gclid, 'G1');
    assert.equal(visit2.last_touch?.utm_source, 'meta', 'last_touch deve atualizar no último toque');
    assert.equal(visit2.last_touch?.utm_campaign, 'retargeting');
    assert.equal(visit2.last_touch?.fbclid, 'FB2');

    // Server sanitizer remove emails e query tokens
    const sanitizedTouch = sanitizeAttributionTouchServer({
      utm_source: 'google',
      landing_path: '/reset-password?token_hash=secret_xyz',
      utm_campaign: 'user@leak.com',
    });
    assert.deepEqual(sanitizedTouch, {
      utm_source: 'google',
      landing_path: '/reset-password',
    });

    // Mock Supabase Admin para validar idempotência de first_touch e dedupe 23505
    let storedRow = {
      first_touch: { utm_source: 'google', landing_path: '/' },
      first_touch_at: '2026-11-01T10:00:00.000Z',
      last_touch: { utm_source: 'google' },
      last_touch_at: '2026-11-01T10:00:00.000Z',
    };
    let lastUpsert = null;
    const insertedEvents = [];

    const mockSupabase = {
      from: (table) => {
        if (table === 'user_attribution') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: storedRow, error: null }),
              }),
            }),
            upsert: async (row) => {
              lastUpsert = row;
              storedRow = row;
              return { error: null };
            },
          };
        }
        if (table === 'product_analytics_events') {
          return {
            insert: async (row) => {
              if (insertedEvents.some((e) => e.event_id && e.event_id === row.event_id)) {
                return { error: { code: '23505', message: 'duplicate key' } };
              }
              insertedEvents.push(row);
              return { error: null };
            },
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const up = await upsertUserAttribution(mockSupabase, 'user-uuid-1', {
      first_touch: { utm_source: 'bing' },
      last_touch: { utm_source: 'meta', utm_campaign: 'promo' },
    });
    assert.equal(up.saved, true);
    assert.equal(lastUpsert.first_touch.utm_source, 'google', 'Backend nunca sobrescreve first_touch existente');
    assert.equal(lastUpsert.last_touch.utm_source, 'meta');

    const ev1 = await recordProductAnalyticsEvent(mockSupabase, {
      userId: 'user-uuid-1',
      eventName: 'subscription_started',
      properties: { plan_tier: 'individual', value: 29.9, email: 'secret@user.com' },
      eventId: 'stripe:evt_123',
      source: 'stripe_webhook',
    });
    const ev2 = await recordProductAnalyticsEvent(mockSupabase, {
      userId: 'user-uuid-1',
      eventName: 'subscription_started',
      properties: { plan_tier: 'individual', value: 29.9 },
      eventId: 'stripe:evt_123',
      source: 'stripe_webhook',
    });
    assert.deepEqual(ev1, { recorded: true });
    assert.deepEqual(ev2, { recorded: true, deduplicated: true });
    assert.equal(insertedEvents[0].properties.email, undefined);
  } finally {
    dom.cleanup();
  }
});

test('7. E2E Build + CSP + Endpoints /api/analytics + Browser Chrome real (CMP LGPD)', async () => {
  const distServerPath = path.resolve(process.cwd(), 'dist', 'server.cjs');
  assert.equal(fs.existsSync(distServerPath), true, 'dist/server.cjs deve existir');

  const port = 3210 + Math.floor(Math.random() * 500);
  const serverProc = spawn('node', [distServerPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      APP_URL: `http://127.0.0.1:${port}`,
      EDGE_SHARED_SECRET: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    // Aguardar /api/health
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // aguarda subir
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal(ready, true, 'Servidor compilado dist/server.cjs deve responder /api/health');

    // Verificar CSP em /
    const homeRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(homeRes.status, 200);
    const csp = homeRes.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("script-src 'self' https://js.stripe.com"));
    assert.ok(csp.includes('https://www.googletagmanager.com'));
    assert.ok(csp.includes('https://connect.facebook.net'));
    assert.ok(csp.includes('https://www.clarity.ms'));
    const scriptDirective = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
    assert.equal(scriptDirective.includes("'unsafe-inline'"), false, 'CSP script-src nunca deve usar unsafe-inline');

    // /api/analytics/events exige auth
    const unauthEv = await fetch(`http://127.0.0.1:${port}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'cta_clicked' }),
    });
    assert.equal(unauthEv.status, 401);

    // Chrome headless test do CMP banner real
    const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (fs.existsSync(chromeExe)) {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vita4me-cmp-'));
      const debugPort = 9400 + Math.floor(Math.random() * 400);
      const chromeProc = spawn(
        chromeExe,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          `--remote-debugging-port=${debugPort}`,
          `--user-data-dir=${userDataDir}`,
          'about:blank',
        ],
        { stdio: 'ignore' }
      );

      try {
        let targets = null;
        for (let i = 0; i < 30; i++) {
          try {
            const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
            if (listRes.ok) {
              targets = await listRes.json();
              if (Array.isArray(targets) && targets[0]?.webSocketDebuggerUrl) break;
            }
          } catch {
            // aguarda CDP
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        const wsUrl = targets?.[0]?.webSocketDebuggerUrl;
        assert.ok(wsUrl, 'CDP WebSocket do Chrome headless deve conectar');

        const ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', reject, { once: true });
        });

        let msgId = 1;
        const cdpCall = (method, params = {}) =>
          new Promise((resolve, reject) => {
            const id = msgId++;
            const timer = setTimeout(() => reject(new Error(`CDP timeout on ${method}`)), 10000);
            const onMsg = (ev) => {
              const data = JSON.parse(String(ev.data));
              if (data.id === id) {
                clearTimeout(timer);
                ws.removeEventListener('message', onMsg);
                if (data.error) reject(new Error(data.error.message));
                else resolve(data.result);
              }
            };
            ws.addEventListener('message', onMsg);
            ws.send(JSON.stringify({ id, method, params }));
          });

        const evalJs = async (expression) => {
          const out = await cdpCall('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
          });
          return out?.result?.value;
        };

        const trackedHosts = ['googletagmanager.com', 'google-analytics.com', 'analytics.google.com', 'connect.facebook.net', 'facebook.com', 'clarity.ms'];
        const networkLog = [];
        let currentPhase = 'A_BEFORE_CONSENT';
        ws.addEventListener('message', (ev) => {
          try {
            const msg = JSON.parse(String(ev.data));
            if (msg.method === 'Network.requestWillBeSent') {
              const url = msg.params?.request?.url || '';
              if (trackedHosts.some((h) => url.includes(h))) {
                networkLog.push({ phase: currentPhase, url });
              }
            }
          } catch {
            // ignore
          }
        });

        await cdpCall('Network.enable');
        await cdpCall('Page.enable');
        await cdpCall('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            window.__cspViolations = [];
            document.addEventListener('securitypolicyviolation', (e) => {
              window.__cspViolations.push({ directive: e.violatedDirective, blockedURI: e.blockedURI });
            });
          `,
        });

        // CENÁRIO A: Usuário novo antes do consentimento
        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/?utm_source=google&utm_medium=cpc&gclid=GCLID_PRE` });

        // Esperar banner CMP montar
        let bannerVisible = false;
        for (let i = 0; i < 60; i++) {
          bannerVisible = await evalJs(`Boolean(document.querySelector('[aria-label="Preferências de Cookies e Privacidade"]'))`);
          if (bannerVisible) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        assert.equal(bannerVisible, true, 'Banner CMP deve renderizar automaticamente na primeira visita');

        const beforeChoice = await evalJs(`({
          consentKey: localStorage.getItem('${TRACKING_CONSENT_STORAGE_KEY}'),
          attrKey: localStorage.getItem('${ATTRIBUTION_STORAGE_KEY}'),
          defaultDenied: Array.isArray(window.dataLayer) && window.dataLayer.some(
            e => Array.isArray(e) && e[0] === 'consent' && e[1] === 'default' && e[2]?.analytics_storage === 'denied' && e[2]?.ad_storage === 'denied' && e[2]?.ad_user_data === 'denied' && e[2]?.ad_personalization === 'denied'
          ),
          thirdPartyScripts: [...document.querySelectorAll('script[src]')].filter(s =>
            /googletagmanager|connect\\.facebook\\.net|clarity\\.ms/i.test(s.src)
          ).length
        })`);

        assert.equal(beforeChoice.consentKey, null, 'Cenário A: consentimento não persistido');
        assert.equal(beforeChoice.attrKey, null, 'Cenário A: atribuição não persistida');
        assert.equal(beforeChoice.defaultDenied, true, 'Cenário A: Consent Mode default denied');
        assert.equal(beforeChoice.thirdPartyScripts, 0, 'Cenário A: zero scripts externos');
        assert.equal(
          networkLog.filter((r) => r.phase === 'A_BEFORE_CONSENT').length,
          0,
          'Cenário A: zero requests externos antes do consentimento'
        );

        // CENÁRIO B: Rejeitar não essenciais + Reload
        currentPhase = 'B_REJECTED';
        await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            btns.find(b => b.textContent.includes('Rejeitar não essenciais'))?.click();
          })()
        `);
        await new Promise((r) => setTimeout(r, 200));
        await cdpCall('Page.reload');
        await new Promise((r) => setTimeout(r, 700));
        const afterRejectReload = await evalJs(`({
          stored: JSON.parse(localStorage.getItem('${TRACKING_CONSENT_STORAGE_KEY}') || 'null'),
          bannerOpen: Boolean(document.querySelector('[aria-label="Preferências de Cookies e Privacidade"]')),
          thirdPartyScripts: [...document.querySelectorAll('script[src]')].filter(s =>
            /googletagmanager|connect\\.facebook\\.net|clarity\\.ms/i.test(s.src)
          ).length
        })`);
        assert.equal(afterRejectReload.stored?.choiceMade, true);
        assert.equal(afterRejectReload.stored?.analytics, false);
        assert.equal(afterRejectReload.stored?.marketing, false);
        assert.equal(afterRejectReload.bannerOpen, false, 'Cenário B: preferência persiste após reload');
        assert.equal(afterRejectReload.thirdPartyScripts, 0, 'Cenário B: zero scripts após rejeição');
        assert.equal(networkLog.filter((r) => r.phase === 'B_REJECTED').length, 0);

        // CENÁRIO C: Analytics ONLY (Personalizar -> Analytics ON, Marketing OFF)
        currentPhase = 'C_ANALYTICS_ONLY';
        await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            btns.find(b => b.textContent.includes('Preferências de Cookies'))?.click();
          })()
        `);
        await new Promise((r) => setTimeout(r, 150));
        await evalJs(`
          (() => {
            const analyticsCb = document.querySelector('[aria-label="Autorizar cookies de Analytics"]');
            if (analyticsCb && !analyticsCb.checked) analyticsCb.click();
            const mktCb = document.querySelector('[aria-label="Autorizar cookies de Marketing"]');
            if (mktCb && mktCb.checked) mktCb.click();
          })()
        `);
        await new Promise((r) => setTimeout(r, 100));
        await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            btns.find(b => b.textContent.includes('Salvar preferências'))?.click();
          })()
        `);
        await new Promise((r) => setTimeout(r, 1200));

        const afterAnalyticsOnly = await evalJs(`({
          stored: JSON.parse(localStorage.getItem('${TRACKING_CONSENT_STORAGE_KEY}') || 'null'),
          attr: JSON.parse(localStorage.getItem('${ATTRIBUTION_STORAGE_KEY}') || 'null'),
          gtmScript: Boolean(document.getElementById('vita4me-gtm-script')),
          gaStandaloneScript: Boolean(document.getElementById('vita4me-ga4-script')),
          metaScript: Boolean(document.getElementById('vita4me-meta-pixel-script')),
          clarityScript: Boolean(document.getElementById('vita4me-clarity-script')),
          hasGtmRealId: document.getElementById('vita4me-gtm-script')?.src?.includes('GTM-N9WNJPJ5') || false,
          hasClarityRealId: document.getElementById('vita4me-clarity-script')?.src?.includes('zeoezbfi2a') || false
        })`);
        assert.equal(afterAnalyticsOnly.stored?.analytics, true);
        assert.equal(afterAnalyticsOnly.stored?.marketing, false);
        assert.equal(afterAnalyticsOnly.attr?.first_touch?.utm_source, 'google');
        assert.equal(afterAnalyticsOnly.attr?.first_touch?.gclid, undefined, 'Cenário C: gclid bloqueado sem marketing');
        assert.equal(afterAnalyticsOnly.gtmScript, true, 'Cenário C: GTM injetado');
        assert.equal(afterAnalyticsOnly.hasGtmRealId, true, 'Cenário C: GTM real GTM-N9WNJPJ5');
        assert.equal(afterAnalyticsOnly.gaStandaloneScript, false, 'Cenário C: GA4 standalone NÃO duplicado');
        assert.equal(afterAnalyticsOnly.metaScript, false, 'Cenário C: Meta Pixel bloqueado');
        assert.equal(afterAnalyticsOnly.clarityScript, true, 'Cenário C: Clarity permitido na landing pública');
        assert.equal(afterAnalyticsOnly.hasClarityRealId, true, 'Cenário C: Clarity real zeoezbfi2a');

        const cReqs = networkLog.filter((r) => r.phase === 'C_ANALYTICS_ONLY').map((r) => r.url);
        assert.equal(cReqs.some((u) => u.includes('connect.facebook.net') || u.includes('facebook.com/tr')), false);

        // CENÁRIO D: Aceitar todos na landing com click ID
        currentPhase = 'D_ACCEPT_ALL';
        await cdpCall('Page.navigate', {
          url: `http://127.0.0.1:${port}/?utm_source=meta&utm_medium=paid_social&fbclid=FBCLID_LIVE_1`,
        });
        let readyBtn = false;
        for (let i = 0; i < 60; i++) {
          readyBtn = await evalJs(`location.pathname === '/' && [...document.querySelectorAll('button')].some(b => b.textContent.includes('Preferências de Cookies'))`);
          if (readyBtn) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        assert.equal(readyBtn, true, 'Cenário D: botão Preferências de Cookies visível no rodapé');
        const clickedPref = await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => b.textContent.includes('Preferências de Cookies'));
            if (!btn) return false;
            btn.click();
            return true;
          })()
        `);
        assert.equal(clickedPref, true);
        let modalReady = false;
        for (let i = 0; i < 40; i++) {
          modalReady = await evalJs(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Aceitar todos'))`);
          if (modalReady) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        assert.equal(modalReady, true, 'Cenário D: modal CMP reaberto com Aceitar todos');
        const clickedAccept = await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            const btn = btns.find(b => b.textContent.includes('Aceitar todos'));
            if (!btn) return false;
            btn.click();
            return true;
          })()
        `);
        assert.equal(clickedAccept, true);
        await new Promise((r) => setTimeout(r, 1800));

        const afterAcceptAll = await evalJs(`({
          stored: JSON.parse(localStorage.getItem('${TRACKING_CONSENT_STORAGE_KEY}') || 'null'),
          attr: JSON.parse(localStorage.getItem('${ATTRIBUTION_STORAGE_KEY}') || 'null'),
          gtmScript: Boolean(document.getElementById('vita4me-gtm-script')),
          gaStandaloneScript: Boolean(document.getElementById('vita4me-ga4-script')),
          metaDirectScript: Boolean(document.getElementById('vita4me-meta-pixel-script')),
          clarityScript: Boolean(document.getElementById('vita4me-clarity-script')),
          noscriptGtm: Boolean(document.querySelector('body > noscript')),
          cspViolations: window.__cspViolations || []
        })`);
        assert.equal(afterAcceptAll.stored?.analytics, true);
        assert.equal(afterAcceptAll.stored?.marketing, true);
        assert.equal(afterAcceptAll.attr?.last_touch?.fbclid, 'FBCLID_LIVE_1');
        assert.equal(afterAcceptAll.gtmScript, true);
        assert.equal(afterAcceptAll.gaStandaloneScript, false, 'Cenário D: GA4 standalone não é duplicado no código');
        assert.equal(afterAcceptAll.metaDirectScript, false, 'Cenário D: Meta Pixel não é instalado diretamente no código');
        assert.equal(afterAcceptAll.clarityScript, true);
        assert.equal(afterAcceptAll.noscriptGtm, true, 'Cenário D: <noscript> GTM presente após <body>');
        assert.equal(afterAcceptAll.cspViolations.length, 0, 'Cenário D: zero violações de CSP em navegador real');

        // CENÁRIO F (com Analytics + Marketing ativos): Rotas sensíveis nunca executam Clarity nem vazam tokens
        currentPhase = 'F_SENSITIVE_ROUTES';
        await cdpCall('Page.navigate', {
          url: `http://127.0.0.1:${port}/reset-password?token_hash=secret_tok_999&type=recovery`,
        });
        for (let i = 0; i < 40; i++) {
          const loaded = await evalJs(`location.pathname === '/reset-password' && document.readyState === 'complete'`);
          if (loaded) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        await new Promise((r) => setTimeout(r, 400));
        const resetCheck = await evalJs(`({
          clarityScriptOnReset: Boolean(document.getElementById('vita4me-clarity-script')),
          dlHasToken: JSON.stringify(window.dataLayer || []).includes('secret_tok_999')
        })`);
        assert.equal(resetCheck.dlHasToken, false, 'Cenário F: dataLayer nunca contém token_hash');
        assert.equal(resetCheck.clarityScriptOnReset, false, 'Cenário F: Clarity não injeta em /reset-password');

        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/auth/confirm?code=oauth_secret_888` });
        for (let i = 0; i < 40; i++) {
          const loaded = await evalJs(`location.pathname === '/auth/confirm' && document.readyState === 'complete'`);
          if (loaded) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        await new Promise((r) => setTimeout(r, 400));
        const confirmCheck = await evalJs(`({
          clarityScriptOnConfirm: Boolean(document.getElementById('vita4me-clarity-script')),
          dlHasCode: JSON.stringify(window.dataLayer || []).includes('oauth_secret_888')
        })`);
        assert.equal(confirmCheck.dlHasCode, false, 'Cenário F: dataLayer nunca contém OAuth code');
        assert.equal(confirmCheck.clarityScriptOnConfirm, false, 'Cenário F: Clarity não injeta em /auth/confirm');

        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/login` });
        await new Promise((r) => setTimeout(r, 450));
        const loginClarity = await evalJs(`Boolean(document.getElementById('vita4me-clarity-script'))`);
        assert.equal(loginClarity, false, 'Cenário F: Clarity não injeta em /login');

        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/app` });
        await new Promise((r) => setTimeout(r, 450));
        const appClarity = await evalJs(`Boolean(document.getElementById('vita4me-clarity-script'))`);
        assert.equal(appClarity, false, 'Cenário F: Clarity não injeta em /app');

        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/app/exames?exam=hemograma` });
        await new Promise((r) => setTimeout(r, 450));
        const appExamsCheck = await evalJs(`({
          clarity: Boolean(document.getElementById('vita4me-clarity-script')),
          dlHasExam: JSON.stringify(window.dataLayer || []).includes('hemograma')
        })`);
        assert.equal(appExamsCheck.clarity, false, 'Cenário F: Clarity não injeta em /app/exames');
        assert.equal(appExamsCheck.dlHasExam, false, 'Cenário F: dataLayer não contém query exam=hemograma');

        // CENÁRIO E: Limpar flag de recovery de sessão, retornar à landing e revogar via rodapé
        await evalJs(`sessionStorage.clear()`);
        currentPhase = 'D_RETURN_TO_LANDING';
        await cdpCall('Page.navigate', { url: `http://127.0.0.1:${port}/` });
        for (let i = 0; i < 60; i++) {
          const readyFooter = await evalJs(`location.pathname === '/' && [...document.querySelectorAll('button')].some(b => b.textContent.includes('Preferências de Cookies'))`);
          if (readyFooter) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            btns.find(b => b.textContent.includes('Preferências de Cookies'))?.click();
          })()
        `);
        for (let i = 0; i < 30; i++) {
          const rejectBtnReady = await evalJs(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Rejeitar não essenciais'))`);
          if (rejectBtnReady) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        currentPhase = 'E_REVOCATION_ACTION';
        await evalJs(`
          (() => {
            const btns = [...document.querySelectorAll('button')];
            btns.find(b => b.textContent.includes('Rejeitar não essenciais'))?.click();
          })()
        `);
        await new Promise((r) => setTimeout(r, 350));

        const afterRevoke = await evalJs(`({
          stored: JSON.parse(localStorage.getItem('${TRACKING_CONSENT_STORAGE_KEY}') || 'null'),
          attr: localStorage.getItem('${ATTRIBUTION_STORAGE_KEY}'),
          lastConsentUpdate: [...(window.dataLayer || [])].reverse().find(e => Array.isArray(e) && e[0] === 'consent' && e[1] === 'update')
        })`);
        assert.equal(afterRevoke.stored?.analytics, false);
        assert.equal(afterRevoke.stored?.marketing, false);
        assert.equal(afterRevoke.attr, null, 'Cenário E: revogação remove atribuição e click IDs');
        assert.equal(afterRevoke.lastConsentUpdate?.[2]?.analytics_storage, 'denied');
        assert.equal(afterRevoke.lastConsentUpdate?.[2]?.ad_storage, 'denied');

        // Recarregar após revogação e confirmar zero requests externos
        currentPhase = 'E_AFTER_REVOKE_RELOAD';
        await cdpCall('Page.reload');
        await new Promise((r) => setTimeout(r, 800));
        console.log('NETWORK_AUDIT_SUMMARY:', JSON.stringify(networkLog));

        const postRevokeScripts = await evalJs(`[...document.querySelectorAll('script[src]')].filter(s => /googletagmanager|connect\\.facebook\\.net|clarity\\.ms/i.test(s.src)).length`);
        assert.equal(postRevokeScripts, 0, 'Cenário E: zero scripts após reload pós-revogação');
        assert.equal(
          networkLog.filter((r) => r.phase === 'E_AFTER_REVOKE_RELOAD').length,
          0,
          'Cenário E: zero requests externos após reload pós-revogação'
        );

        try {
          await cdpCall('Browser.close');
        } catch {
          // ignore
        }
        ws.close();
      } finally {
        chromeProc.kill();
        await new Promise((r) => setTimeout(r, 400));
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {
          // Windows lock best-effort cleanup
        }
      }
    }
  } finally {
    serverProc.kill();
  }
});
