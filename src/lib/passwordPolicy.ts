export interface PasswordValidationResult {
  isValid: boolean;
  error: string | null;
  checks: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Política única de complexidade de senha (A08):
 * - Mínimo de 8 caracteres
 * - Pelo menos 1 letra maiúscula (A-Z)
 * - Pelo menos 1 letra minúscula (a-z)
 * - Pelo menos 1 número (0-9)
 * - Pelo menos 1 símbolo/caractere especial
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const pwd = typeof password === "string" ? password : "";
  const checks = {
    minLength: pwd.length >= 8,
    hasUpperCase: /[A-Z]/.test(pwd),
    hasLowerCase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecialChar: /[^A-Za-z0-9]/.test(pwd),
  };

  const isValid =
    checks.minLength &&
    checks.hasUpperCase &&
    checks.hasLowerCase &&
    checks.hasNumber &&
    checks.hasSpecialChar;

  return {
    isValid,
    error: isValid
      ? null
      : "A senha deve conter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo especial.",
    checks,
  };
}

export const NEUTRAL_PASSWORD_RESET_MESSAGE =
  "Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação em instantes.";

