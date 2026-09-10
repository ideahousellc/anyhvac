export const CONTACT_REASONS = [
  "Report a Calculation Issue",
  "Suggest a Tool",
  "General Feedback",
  "Other",
] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number];

export type ContactSubmission = {
  reason: ContactReason;
  name: string;
  email: string;
  message: string;
};

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
} as const;

export function isContactReason(value: unknown): value is ContactReason {
  return (
    typeof value === "string" &&
    CONTACT_REASONS.some((reason) => reason === value)
  );
}

export function validateContactSubmission(submission: ContactSubmission) {
  const errors: Partial<Record<keyof ContactSubmission, string>> = {};
  if (!isContactReason(submission.reason)) {
    errors.reason = "Select a valid reason for contacting us.";
  }
  if (submission.name.length > CONTACT_LIMITS.name) {
    errors.name = `Name must be ${CONTACT_LIMITS.name} characters or fewer.`;
  }
  if (!submission.message.trim()) errors.message = "Please enter a message.";
  if (submission.message.length > CONTACT_LIMITS.message) {
    errors.message = `Message must be ${CONTACT_LIMITS.message} characters or fewer.`;
  }
  if (submission.email.length > CONTACT_LIMITS.email) {
    errors.email = `Email must be ${CONTACT_LIMITS.email} characters or fewer.`;
  }
  if (
    submission.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email.trim())
  ) {
    errors.email = "Enter a valid email address or leave this field blank.";
  }
  return errors;
}

export async function submitContactSubmission(
  submission: ContactSubmission,
  antiSpam: { website: string; startedAt: number },
): Promise<{ delivered: boolean }> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...submission, ...antiSpam }),
  });

  if (!response.ok) return { delivered: false };

  const result: unknown = await response.json().catch(() => null);
  return {
    delivered:
      typeof result === "object" &&
      result !== null &&
      "delivered" in result &&
      result.delivered === true,
  };
}
