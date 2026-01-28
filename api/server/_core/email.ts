import nodemailer from 'nodemailer';

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'dedi-13565186.ilutas.com.br';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'no-reply@souesporte.com.br';
const SMTP_PASS = process.env.SMTP_PASS || '0102030405Gm$';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'Sou Esporte';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'no-reply@souesporte.com.br';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }
    
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        // Do not fail on invalid certs (useful for self-signed certificates)
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
    
    console.log(`[Email] Sending email to ${options.to} with subject: ${options.subject}`);
    
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[Email] Message sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string | null,
  code: string
): Promise<boolean> {
  const subject = 'Código de Recuperação de Senha - Sou Esporte';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏃 Sou Esporte</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Olá${userName ? `, ${userName}` : ''}!</h2>
    
    <p>Você solicitou a recuperação de senha da sua conta no <strong>Sou Esporte</strong>.</p>
    
    <p>Use o código abaixo para redefinir sua senha:</p>
    
    <div style="background: #84cc16; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
      ${code}
    </div>
    
    <p style="color: #666; font-size: 14px;">
      ⏱️ Este código é válido por <strong>15 minutos</strong>.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Se você não solicitou a recuperação de senha, ignore este e-mail. Sua conta permanecerá segura.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Este é um e-mail automático. Por favor, não responda.<br>
      © ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;
  
  const text = `
Olá${userName ? `, ${userName}` : ''}!

Você solicitou a recuperação de senha da sua conta no Sou Esporte.

Use o código abaixo para redefinir sua senha:

${code}

Este código é válido por 15 minutos.

Se você não solicitou a recuperação de senha, ignore este e-mail. Sua conta permanecerá segura.

---
Este é um e-mail automático. Por favor, não responda.
© ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}

/**
 * Send OTP verification code email
 */
export async function sendOTPEmail(
  to: string,
  code: string
): Promise<boolean> {
  const subject = 'Código de Verificação - Sou Esporte';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏃 Sou Esporte</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A maior plataforma de corridas do Brasil</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0; text-align: center;">Código de Verificação</h2>
    
    <p style="text-align: center;">Use o código abaixo para acessar sua conta:</p>
    
    <div style="background: #84cc16; color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 25px; border-radius: 10px; letter-spacing: 10px; margin: 25px 0;">
      ${code}
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      ⏱️ Este código é válido por <strong>5 minutos</strong>.
    </p>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Se você não solicitou este código, ignore este e-mail.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Este é um e-mail automático. Por favor, não responda.<br>
      © ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;
  
  const text = `
Código de Verificação - Sou Esporte

Use o código abaixo para acessar sua conta:

${code}

Este código é válido por 5 minutos.

Se você não solicitou este código, ignore este e-mail.

---
Este é um e-mail automático. Por favor, não responda.
© ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}

/**
 * Verify SMTP connection
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection verification failed:', error);
    return false;
  }
}


/**
 * Send email verification code (V12.9)
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<boolean> {
  const subject = 'Verifique seu E-mail - Sou Esporte';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação de E-mail</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏃 Sou Esporte</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Bem-vindo à maior plataforma de corridas do Brasil!</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0; text-align: center;">Verifique seu E-mail</h2>
    
    <p style="text-align: center;">Para completar seu cadastro, use o código abaixo:</p>
    
    <div style="background: #84cc16; color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 25px; border-radius: 10px; letter-spacing: 10px; margin: 25px 0;">
      ${code}
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      ⏱️ Este código é válido por <strong>15 minutos</strong>.
    </p>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Se você não criou uma conta no Sou Esporte, ignore este e-mail.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Este é um e-mail automático. Por favor, não responda.<br>
      © ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;
  
  const text = `
Verificação de E-mail - Sou Esporte

Bem-vindo ao Sou Esporte!

Para completar seu cadastro, use o código abaixo:

${code}

Este código é válido por 15 minutos.

Se você não criou uma conta no Sou Esporte, ignore este e-mail.

---
Este é um e-mail automático. Por favor, não responda.
© ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}

/**
 * Send account recovery email for blocked accounts (V12.9)
 */
export async function sendAccountRecoveryEmail(
  to: string,
  userName: string | null,
  code: string
): Promise<boolean> {
  const subject = 'Recuperação de Conta - Sou Esporte';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Conta</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Sou Esporte</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Recuperação de Conta</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Olá${userName ? `, ${userName}` : ''}!</h2>
    
    <p>Sua conta foi temporariamente bloqueada por motivos de segurança (múltiplas tentativas de login incorretas).</p>
    
    <p>Use o código abaixo para desbloquear sua conta:</p>
    
    <div style="background: #ef4444; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
      ${code}
    </div>
    
    <p style="color: #666; font-size: 14px;">
      ⏱️ Este código é válido por <strong>30 minutos</strong>.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      Se você não reconhece esta atividade, recomendamos alterar sua senha após desbloquear a conta.
    </p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Dica de segurança:</strong> Nunca compartilhe este código com ninguém. A equipe do Sou Esporte nunca pedirá seu código de recuperação.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      Precisa de ajuda? Entre em contato: suporte@souesporte.com.br<br>
      © ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `;
  
  const text = `
Olá${userName ? `, ${userName}` : ''}!

Sua conta foi temporariamente bloqueada por motivos de segurança (múltiplas tentativas de login incorretas).

Use o código abaixo para desbloquear sua conta:

${code}

Este código é válido por 30 minutos.

Se você não reconhece esta atividade, recomendamos alterar sua senha após desbloquear a conta.

⚠️ Dica de segurança: Nunca compartilhe este código com ninguém. A equipe do Sou Esporte nunca pedirá seu código de recuperação.

---
Precisa de ajuda? Entre em contato: suporte@souesporte.com.br
© ${new Date().getFullYear()} Sou Esporte - Todos os direitos reservados.
  `;
  
  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}
