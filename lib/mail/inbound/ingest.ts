import {
  DuplicateMessageError,
  type InboundEmail,
  type InboundMailRepository,
} from "./types";
import { isSubjectFallbackAppropriate, normalizeSubject } from "./parsing";

export type IngestResult = { status: "created" | "duplicate"; messageId: string };

function participants(email: InboundEmail) {
  return [...new Set([email.fromAddress, ...email.toAddresses, ...email.ccAddresses, ...email.replyToAddresses])];
}

async function resolveThread(repository: InboundMailRepository, email: InboundEmail, normalized: string | null) {
  if (email.inReplyTo) {
    const threadId = await repository.findThreadByInternetIds(email.mailbox, [email.inReplyTo]);
    if (threadId) return threadId;
  }

  if (email.referenceMessageIds.length) {
    const threadId = await repository.findThreadByInternetIds(
      email.mailbox,
      [...email.referenceMessageIds].reverse(),
    );
    if (threadId) return threadId;
  }

  if (email.internetMessageId) {
    const threadId = await repository.findThreadReferencingInternetId(email.mailbox, email.internetMessageId);
    if (threadId) return threadId;
  }

  if (normalized && isSubjectFallbackAppropriate(email.subject, email.inReplyTo, email.referenceMessageIds)) {
    return repository.findThreadBySubjectAndParticipants(email.mailbox, normalized, participants(email));
  }

  return null;
}

async function finishIngestion(repository: InboundMailRepository, email: InboundEmail, message: { id: string; threadId: string }) {
  for (const attachment of email.attachments) {
    await repository.insertAttachment(message.id, attachment);
  }
  await repository.updateThreadLatestMessage(message.threadId, email.receivedAt);
}

export async function ingestInboundEmail(
  repository: InboundMailRepository,
  email: InboundEmail,
): Promise<IngestResult> {
  const existing = await repository.findDuplicate(email.providerMessageId, email.providerEventId);
  if (existing) {
    await finishIngestion(repository, email, existing);
    return { status: "duplicate", messageId: existing.id };
  }

  const normalized = normalizeSubject(email.subject);
  let threadId = await resolveThread(repository, email, normalized);
  let createdThreadId: string | null = null;
  if (!threadId) {
    threadId = await repository.createThread(email, normalized);
    createdThreadId = threadId;
  }

  try {
    const message = await repository.insertMessage(email, threadId);
    await finishIngestion(repository, email, message);
    return { status: "created", messageId: message.id };
  } catch (error) {
    if (error instanceof DuplicateMessageError) {
      if (createdThreadId) await repository.deleteThreadIfEmpty(createdThreadId);
      const duplicate = await repository.findDuplicate(email.providerMessageId, email.providerEventId);
      if (!duplicate) throw error;
      await finishIngestion(repository, email, duplicate);
      return { status: "duplicate", messageId: duplicate.id };
    }
    if (createdThreadId) await repository.deleteThreadIfEmpty(createdThreadId);
    throw error;
  }
}
