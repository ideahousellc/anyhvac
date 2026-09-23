import { SupabaseInboundMailRepository } from "@/lib/mail/inbound/repository";
import { ResendReceivingClient, ResendWebhookVerifier } from "@/lib/mail/inbound/resend";
import { createResendWebhookHandler } from "@/lib/mail/inbound/webhook";

const defaultHandler = createResendWebhookHandler({
  environment: process.env,
  verifier: new ResendWebhookVerifier(),
  createReceivingClient: (apiKey) => new ResendReceivingClient(apiKey),
  createRepository: () => new SupabaseInboundMailRepository(),
});

export async function POST(request: Request) {
  return defaultHandler(request);
}
