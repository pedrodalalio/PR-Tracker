// Mail transport. Hoje só loga no console — pra produção, plugar provider real
// (Resend/SES/SMTP) substituindo o corpo das funções.
//
// Política: nunca lança erro pro caller. Falha de envio não pode quebrar o
// fluxo que pediu o e-mail (forgot-password etc.) — ele já fez o trabalho de
// gerar/persistir o token.
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `[mail] Password reset requested for ${to}\n` +
      `       Link válido por 1h: ${resetUrl}`,
  );
}

export async function sendEmailVerification(
  to: string,
  verifyUrl: string,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    `[mail] Email verification for ${to}\n` +
      `       Link válido por 48h: ${verifyUrl}`,
  );
}
