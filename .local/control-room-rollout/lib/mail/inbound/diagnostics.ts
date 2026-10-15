export const INBOUND_MAIL_STAGES = [
  "webhook.verify",
  "resend.retrieve",
  "resend.validate",
  "resend.parse",
  "supabase.initialize",
  "supabase.find_duplicate_message",
  "supabase.find_duplicate_event",
  "supabase.resolve_thread",
  "supabase.create_thread",
  "supabase.insert_message",
  "supabase.insert_attachment",
  "supabase.update_thread",
] as const;

export type InboundMailStage = (typeof INBOUND_MAIL_STAGES)[number];

export interface InboundMailFailureRecord {
  component: "inbound_mail";
  outcome: "failure";
  stage: InboundMailStage;
  error_name: string;
  error_code?: string;
  message: string;
}

export type InboundMailFailureLogger = (record: InboundMailFailureRecord) => void;

const STANDARD_ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "AggregateError",
]);

export function safeErrorCode(value: unknown): string | undefined {
  const code = typeof value === "number" ? String(value) : value;
  return typeof code === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(code)
    ? code
    : undefined;
}

function safeRuntimeErrorName(error: unknown): string {
  if (!(error instanceof Error)) return "UnknownError";
  return STANDARD_ERROR_NAMES.has(error.name) ? error.name : "Error";
}

export class InboundMailFailure extends Error {
  readonly stage: InboundMailStage;
  readonly errorName: string;
  readonly errorCode?: string;

  constructor(
    stage: InboundMailStage,
    message: string,
    errorName: string,
    errorCode?: unknown,
  ) {
    super(message);
    this.name = "InboundMailFailure";
    this.stage = stage;
    this.errorName = errorName;
    this.errorCode = safeErrorCode(errorCode);
  }
}

export function inboundMailFailureFromUnknown(
  stage: InboundMailStage,
  message: string,
  error: unknown,
): InboundMailFailure {
  if (error instanceof InboundMailFailure) return error;
  return new InboundMailFailure(stage, message, safeRuntimeErrorName(error));
}

export function inboundMailFailureRecord(
  failure: InboundMailFailure,
): InboundMailFailureRecord {
  return {
    component: "inbound_mail",
    outcome: "failure",
    stage: failure.stage,
    error_name: failure.errorName,
    ...(failure.errorCode ? { error_code: failure.errorCode } : {}),
    message: failure.message,
  };
}

export const logInboundMailFailure: InboundMailFailureLogger = (record) => {
  console.error(JSON.stringify(record));
};
