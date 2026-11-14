import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePasswordPolicy, NEUTRAL_PASSWORD_RESET_MESSAGE } from "../../src/lib/passwordPolicy.ts";

const read = (relPath) => fs.readFileSync(path.resolve(relPath), "utf8");

test("Política de senha rejeita senhas fracas e aceita senha forte compatível", () => {
  const shortPwd = validatePasswordPolicy("Ab1!");
  assert.equal(shortPwd.isValid, false);
  assert.equal(shortPwd.checks.minLength, false);

  const noUpper = validatePasswordPolicy("vita4me!1");
  assert.equal(noUpper.isValid, false);
  assert.equal(noUpper.checks.hasUpperCase, false);

  const noLower = validatePasswordPolicy("VITA4ME!1");
  assert.equal(noLower.isValid, false);
  assert.equal(noLower.checks.hasLowerCase, false);

  const noNumber = validatePasswordPolicy("VitaFourMe!");
  assert.equal(noNumber.isValid, false);
  assert.equal(noNumber.checks.hasNumber, false);

  const noSpecial = validatePasswordPolicy("Vita4Me123");
  assert.equal(noSpecial.isValid, false);
  assert.equal(noSpecial.checks.hasSpecialChar, false);

  const strong = validatePasswordPolicy("Vita4Me#2026!");
  assert.equal(strong.isValid, true);
  assert.equal(strong.error, null);
});

test("Mensagem neutra de recuperação preserva proteção contra enumeração de contas", () => {
  assert.match(NEUTRAL_PASSWORD_RESET_MESSAGE, /Se existir uma conta associada/i);
  assert.doesNotMatch(NEUTRAL_PASSWORD_RESET_MESSAGE, /não encontrado|inexistente|cadastrado/i);
});

test("AuthContext usa domínio oficial https://vita4me.com/reset-password e trata PASSWORD_RECOVERY + updateUser", () => {
  const authCtx = read("src/contexts/AuthContext.tsx");

  assert.match(authCtx, /const OFFICIAL_RECOVERY_REDIRECT_URL = ['"]https:\/\/vita4me\.com\/reset-password['"]/);
  assert.match(authCtx, /return OFFICIAL_RECOVERY_REDIRECT_URL;/);
  assert.doesNotMatch(authCtx, /\/#reset-password/);
  assert.doesNotMatch(authCtx, /vita4me\.app|run\.app|railway/i);

  assert.match(authCtx, /const redirectUrl = getPasswordRecoveryRedirectUrl\(\);/);
  assert.match(authCtx, /supabase\.auth\.resetPasswordForEmail\(cleanEmail,\s*\{\s*redirectTo:\s*redirectUrl/s);
  assert.match(authCtx, /event === ['"]PASSWORD_RECOVERY['"]/);
  assert.match(authCtx, /supabase\.auth\.updateUser\(\{\s*password\s*\}\)/);
});

test("supabase.ts captura type=recovery e erros antes de o GoTrueClient limpar o hash", () => {
  const supabaseFile = read("src/lib/supabase.ts");

  const captureIdx = supabaseFile.indexOf("hasUrlError");
  const clientIdx = supabaseFile.indexOf("export const supabase = createClient(");
  assert.ok(captureIdx > -1 && clientIdx > -1 && captureIdx < clientIdx, "Captura síncrona deve rodar antes de createClient()");

  assert.match(supabaseFile, /PASSWORD_RECOVERY_STORAGE_KEY = ['"]vita4me_password_recovery['"]/);
  assert.match(supabaseFile, /urlType === ['"]recovery['"]/);
});

test("App.tsx expõe rota pública /reset-password e redireciona fallback de recovery na home", () => {
  const appFile = read("src/App.tsx");

  assert.match(appFile, /<Route path="\/reset-password" element={<ResetPasswordView \/>} \/>/);
  assert.match(appFile, /urlErrorCode === ["']otp_expired["']/);
  assert.match(appFile, /return <Navigate to=\{`\/reset-password\$\{location\.search\}\$\{location\.hash\}`\} replace \/>/);
});

test("AuthConfirmView.tsx não captura links de password recovery como signup/email", () => {
  const confirmFile = read("src/components/AuthConfirmView.tsx");

  assert.match(confirmFile, /urlType === ["']recovery["']/);
  assert.match(confirmFile, /window\.location\.replace\(`\/reset-password\$\{search\}\$\{hash\}`\)/);
  assert.doesNotMatch(confirmFile, /type:\s*otpType === ["']signup["'] \? ["']signup["'] : ["']email["']/);
});

test("ResetPasswordView.tsx trata token_hash, PKCE, PASSWORD_RECOVERY, erros, validação e signOut pós-sucesso", () => {
  const resetView = read("src/components/ResetPasswordView.tsx");

  assert.match(resetView, /if \(urlType !== ["']recovery["']\)/);
  assert.match(resetView, /verifyOtp\(\{\s*token_hash:\s*tokenHash,\s*type:\s*["']recovery["']/s);
  assert.match(resetView, /exchangeCodeForSession\(code\)/);
  assert.match(resetView, /code === ["']otp_expired["']/);
  assert.match(resetView, /err === ["']access_denied["']/);
  assert.match(resetView, /validatePasswordPolicy\(newPassword\)/);
  assert.match(resetView, /newPassword !== confirmPassword/);
  assert.match(resetView, /updateUserPassword\(newPassword\)/);
  assert.match(resetView, /await signOut\(\)/);
  assert.match(resetView, /navigate\(["']\/login\?passwordReset=success["']/);
  assert.match(resetView, /navigate\(["']\/login\?tab=reset["']/);
});

test("ProtectedRoute.tsx impede bypass de sessão temporária de recovery para /app", () => {
  const protectedRoute = read("src/components/ProtectedRoute.tsx");
  assert.match(protectedRoute, /if \(isPasswordRecovery \|\| hasActivePasswordRecoveryFlag\(\)\)/);
  assert.match(protectedRoute, /return <Navigate to="\/reset-password" replace \/>/);
});

test("AuthPageView.tsx suporta ?tab=reset, ?passwordReset=success e redirecionamento seguro de recovery", () => {
  const authPage = read("src/components/AuthPageView.tsx");

  assert.match(authPage, /requestedTab === ["']reset["']/);
  assert.match(authPage, /passwordReset["']?\) === ["']success["']/);
  assert.match(authPage, /if \(isPasswordRecovery \|\| hasActivePasswordRecoveryFlag\(\)\)/);
  assert.match(authPage, /navigate\(["']\/reset-password["']/);
});

test("Bundle de produção em dist/assets contém https://vita4me.com/reset-password e não contém /#reset-password", () => {
  const assetsDir = path.resolve("dist/assets");
  assert.ok(fs.existsSync(assetsDir), "dist/assets deve existir após npm run build");

  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
  const combinedBundle = jsFiles.map((f) => fs.readFileSync(path.join(assetsDir, f), "utf8")).join("\n");

  assert.ok(combinedBundle.includes("https://vita4me.com/reset-password"), "Bundle deve conter URL oficial de redirect");
  assert.ok(combinedBundle.includes("/reset-password"), "Bundle deve conter rota /reset-password");
  assert.ok(!combinedBundle.includes("/#reset-password"), "Bundle não deve conter hash legado /#reset-password");
});
