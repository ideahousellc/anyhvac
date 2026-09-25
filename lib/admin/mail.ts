export const ADMIN_FROM = "Cesar Pepper | AnyHVAC <contact@anyhvac.net>";
export const ADMIN_REPLY_TO = "contact@anyhvac.net";
export const ADMIN_LOGO_URL = "https://www.anyhvac.net/Horizontal%20Logo.png";

export const MAIL_LIMITS = {
  recipient: 254,
  subject: 200,
  message: 10_000,
} as const;

export type AdminMail = {
  to: string;
  subject: string;
  message: string;
};

const EMAIL_PATTERN =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export function isValidEmailAddress(value: string) {
  return Boolean(
    value &&
    value.length <= MAIL_LIMITS.recipient &&
    !/[\r\n,;]/.test(value) &&
    EMAIL_PATTERN.test(value) &&
    value.split("@")[0].length <= 64,
  );
}

export function validateAdminMail(value: unknown) {
  const errors: Partial<Record<keyof AdminMail, string>> = {};
  if (typeof value !== "object" || value === null) {
    return { valid: false as const, errors: { to: "Check the mail fields." } };
  }

  const body = value as Record<string, unknown>;
  const allowedKeys = new Set(["to", "subject", "message", "requestId"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return { valid: false as const, errors: { to: "Check the mail fields." } };
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (
    !isValidEmailAddress(to)
  ) {
    errors.to = "Enter one valid email address.";
  }
  if (!subject) errors.subject = "Enter a subject.";
  else if (subject.length > MAIL_LIMITS.subject || /[\r\n]/.test(subject)) {
    errors.subject = `Subject must be ${MAIL_LIMITS.subject} characters or fewer.`;
  }
  if (!message) errors.message = "Enter a message.";
  else if (message.length > MAIL_LIMITS.message) {
    errors.message = `Message must be ${MAIL_LIMITS.message.toLocaleString()} characters or fewer.`;
  }

  if (Object.keys(errors).length) return { valid: false as const, errors };
  return {
    valid: true as const,
    mail: { to: to.toLowerCase(), subject, message } satisfies AdminMail,
  };
}

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createAdminEmailContent(message: string, mailbox = ADMIN_REPLY_TO) {
  const safeMessage = escapeEmailHtml(message).replace(/\r?\n/g, "<br>");
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#ffffff;color:#1f2a37;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:32px 24px;">
  <div style="font-size:16px;line-height:1.65;white-space:normal;">${safeMessage}</div>
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid #dfe4ea;">
    <img src="${ADMIN_LOGO_URL}" width="220" alt="AnyHVAC" style="display:block;width:220px;max-width:100%;height:auto;margin:0 0 18px;border:0;">
    <div style="font-size:15px;line-height:1.55;color:#1f2a37;"><strong>Cesar Pepper</strong><br>AnyHVAC<br>Free HVAC Calculators &amp; Tools<br><a href="https://www.anyhvac.net" style="color:#0057b8;text-decoration:none;">www.anyhvac.net</a><br><a href="mailto:${mailbox}" style="color:#0057b8;text-decoration:none;">${mailbox}</a></div>
  </div>
</div>
</body></html>`;

  const text = [
    message,
    "",
    "--",
    "Cesar Pepper",
    "AnyHVAC",
    "Free HVAC Calculators & Tools",
    "www.anyhvac.net",
    mailbox,
  ].join("\n");

  return { html, text };
}
