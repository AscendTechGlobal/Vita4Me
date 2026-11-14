import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  LEGAL_DOCUMENT_META,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_LAST_UPDATED_LABEL,
  resolveControllerLegalName,
  resolveDpoContactEmail,
} from "../../src/components/LegalDocumentsContent.tsx";

const read = (relPath) => fs.readFileSync(path.resolve(relPath), "utf8");

test("Metadados das páginas legais usam URLs oficiais em https://vita4me.com", () => {
  assert.equal(LEGAL_DOCUMENT_META.privacidade.path, "/privacidade");
  assert.equal(LEGAL_DOCUMENT_META.privacidade.canonicalUrl, "https://vita4me.com/privacidade");
  assert.ok(LEGAL_DOCUMENT_META.privacidade.title.includes("Privacidade"));

  assert.equal(LEGAL_DOCUMENT_META.termos.path, "/termos");
  assert.equal(LEGAL_DOCUMENT_META.termos.canonicalUrl, "https://vita4me.com/termos");
  assert.ok(LEGAL_DOCUMENT_META.termos.title.includes("Termos de Uso"));

  assert.equal(LEGAL_DOCUMENT_META.cookies.path, "/cookies");
  assert.equal(LEGAL_DOCUMENT_META.cookies.canonicalUrl, "https://vita4me.com/cookies");
  assert.ok(LEGAL_DOCUMENT_META.cookies.title.includes("Política de Cookies"));
});

test("Controlador, canal de privacidade, data e versão seguem as definições oficiais sem placeholders", () => {
  const controllerName = resolveControllerLegalName();
  assert.ok(controllerName.length > 0);
  assert.doesNotMatch(controllerName, /Configur[aá]vel|VITE_|placeholder|Ltda\.?/i);
  assert.equal(controllerName, "Luís Eduardo da Silva Weber");

  const dpoEmail = resolveDpoContactEmail();
  assert.equal(dpoEmail, "privacidade@vita4me.com");
  assert.match(dpoEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  assert.equal(LEGAL_DOCUMENT_VERSION, "1.0");
  assert.equal(LEGAL_LAST_UPDATED_LABEL, "Última atualização: 14 de novembro de 2026 • Versão 1.0");
});

test("Modal e páginas públicas compartilham LegalDocumentsContent como fonte única sem inventar CNPJ ou DPO formal", () => {
  const modalSrc = read("src/components/LegalDocumentsModal.tsx");
  const pageSrc = read("src/components/LegalPageView.tsx");
  const contentSrc = read("src/components/LegalDocumentsContent.tsx");

  assert.match(modalSrc, /from "\.\/LegalDocumentsContent"/);
  assert.match(modalSrc, /<LegalDocumentsContent activeTab=/);
  assert.doesNotMatch(modalSrc, /1\. Identificação do Controlador/);

  assert.match(pageSrc, /from "\.\/LegalDocumentsContent"/);
  assert.match(pageSrc, /<LegalDocumentsContent activeTab=\{documentId\}/);
  assert.doesNotMatch(pageSrc, /1\. Identificação do Controlador/);

  assert.doesNotMatch(contentSrc, /Configur[aá]vel via/);
  assert.doesNotMatch(contentSrc, /Tecnologia e Serviços Digitais Ltda/i);
  assert.doesNotMatch(contentSrc, /CNPJ\s*\d/i);
  assert.doesNotMatch(contentSrc, /Encarregado \(DPO\) formalmente designado/i);
  assert.doesNotMatch(contentSrc, /\bSentry\b/i);
  assert.match(contentSrc, /Supabase/);
  assert.match(contentSrc, /Google Cloud/);
  assert.match(contentSrc, /Stripe/);
  assert.match(contentSrc, /Asaas/);
  assert.match(contentSrc, /Resend/);
  assert.match(contentSrc, /Cloudflare/);
});

test("App.tsx registra rotas públicas /privacidade, /termos e /cookies e LandingPage preserva rodapé + modal", () => {
  const appSrc = read("src/App.tsx");
  const landingSrc = read("src/components/LandingPageView.tsx");

  assert.match(appSrc, /<Route path="\/privacidade" element={<LegalPageView documentId="privacidade" \/>} \/>/);
  assert.match(appSrc, /<Route path="\/termos" element={<LegalPageView documentId="termos" \/>} \/>/);
  assert.match(appSrc, /<Route path="\/cookies" element={<LegalPageView documentId="cookies" \/>} \/>/);

  assert.match(landingSrc, /setLegalModalTab\("privacidade"\)/);
  assert.match(landingSrc, /setLegalModalTab\("termos"\)/);
  assert.match(landingSrc, /setLegalModalTab\("cookies"\)/);
  assert.match(landingSrc, /<LegalDocumentsModal/);
});

test("Bundle compilado e arquivos SEO públicos usam https://vita4me.com e não expõem placeholders nem vita4me.app", () => {
  const assetsDir = path.resolve("dist/assets");
  assert.ok(fs.existsSync(assetsDir), "dist/assets deve existir após npm run build");

  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
  const combined = jsFiles.map((f) => fs.readFileSync(path.join(assetsDir, f), "utf8")).join("\n");

  assert.ok(combined.includes("https://vita4me.com/privacidade"), "Bundle deve conter URL canônica /privacidade");
  assert.ok(combined.includes("https://vita4me.com/termos"), "Bundle deve conter URL canônica /termos");
  assert.ok(combined.includes("https://vita4me.com/cookies"), "Bundle deve conter URL canônica /cookies");
  assert.ok(combined.includes("Luís Eduardo da Silva Weber"), "Bundle deve conter o nome do controlador responsável");
  assert.ok(combined.includes("privacidade@vita4me.com"), "Bundle deve conter o canal oficial de privacidade");
  assert.ok(combined.includes("14 de novembro de 2026"), "Bundle deve conter a data de atualização oficial");
  assert.ok(!combined.includes("Configurável via"), "Bundle não pode conter placeholder Configurável via");
  assert.ok(!combined.includes("VITE_CONTROLLER_LEGAL_NAME"), "Bundle não pode exibir nome da env var VITE_CONTROLLER_LEGAL_NAME");
  assert.ok(!combined.includes("Tecnologia e Serviços Digitais Ltda"), "Bundle não pode conter razão social inexistente");
  assert.ok(!combined.includes("vita4me.app"), "Bundle público não pode conter referências ao domínio antigo vita4me.app");

  for (const seoFile of ["index.html", "public/sitemap.xml", "public/robots.txt", "public/llms.txt"]) {
    const seoContent = read(seoFile);
    assert.ok(!seoContent.includes("vita4me.app"), `${seoFile} não pode mais apontar para vita4me.app`);
    assert.ok(seoContent.includes("https://vita4me.com"), `${seoFile} deve apontar para https://vita4me.com`);
  }

  const sitemap = read("public/sitemap.xml");
  assert.ok(sitemap.includes("https://vita4me.com/privacidade"));
  assert.ok(sitemap.includes("https://vita4me.com/termos"));
  assert.ok(sitemap.includes("https://vita4me.com/cookies"));
});
