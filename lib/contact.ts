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

export function validateContactSubmission(submission: ContactSubmission) {
  const errors: Partial<Record<keyof ContactSubmission, string>> = {};
  if (!submission.message.trim()) errors.message = "Please enter a message.";
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
): Promise<{ delivered: false; reason: "backend-unavailable" }> {
  void submission;
  // TODO: Replace this seam when AnyHVAC has a verified submission backend.
  return { delivered: false, reason: "backend-unavailable" };
}
