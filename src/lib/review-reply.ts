export interface ReviewReplyContent {
  text: string;
  imageUrls: string[];
}

const REPLY_PREFIX = "[[SHOP_REPLY:";
const REPLY_SUFFIX = "]]";

export function encodeReviewReply(text: string, imageUrls: string[]) {
  return `${REPLY_PREFIX}${JSON.stringify({
    text: text.trim(),
    imageUrls: imageUrls.slice(0, 5),
  })}${REPLY_SUFFIX}`;
}

export function decodeReviewReply(reply: string | null | undefined): ReviewReplyContent {
  if (!reply) return { text: "", imageUrls: [] };
  if (!reply.startsWith(REPLY_PREFIX) || !reply.endsWith(REPLY_SUFFIX)) {
    return { text: reply, imageUrls: [] };
  }

  try {
    const parsed = JSON.parse(
      reply.slice(REPLY_PREFIX.length, -REPLY_SUFFIX.length)
    ) as Partial<ReviewReplyContent>;
    return {
      text: typeof parsed.text === "string" ? parsed.text : "",
      imageUrls: Array.isArray(parsed.imageUrls)
        ? parsed.imageUrls.filter((url): url is string => typeof url === "string").slice(0, 5)
        : [],
    };
  } catch {
    return { text: reply, imageUrls: [] };
  }
}
