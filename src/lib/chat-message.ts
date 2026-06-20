export interface ChatProductContext {
  productId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number;
  discountPrice?: number | null;
  variantId?: number | null;
  colorId?: number | null;
  size?: string | null;
  color?: string | null;
}

export interface ChatImageContext {
  url: string;
}

type ChatMessagePayload = {
  text: string;
  product: ChatProductContext | null;
  images: ChatImageContext[];
};

const CHAT_MESSAGE_PREFIX = "[[CHAT_MESSAGE:";
const CHAT_MESSAGE_SUFFIX = "]]";
const LEGACY_PRODUCT_CONTEXT_PREFIX = "[[PRODUCT_CONTEXT:";
const LEGACY_PRODUCT_CONTEXT_SUFFIX = "]]";

export function encodeChatMessage(
  content: string,
  product: ChatProductContext | null,
  images: string[] = []
) {
  const text = content.trim();
  const normalizedImages = images
    .filter((url) => typeof url === "string" && url.trim())
    .map((url) => ({ url: url.trim() }));
  if (!product && normalizedImages.length === 0) return text;
  return `${CHAT_MESSAGE_PREFIX}${JSON.stringify({ text, product, images: normalizedImages })}${CHAT_MESSAGE_SUFFIX}`;
}

export function decodeChatMessage(content: string): {
  text: string;
  product: ChatProductContext | null;
  images: ChatImageContext[];
} {
  if (content.startsWith(CHAT_MESSAGE_PREFIX)) {
    const metadataEnd = content.indexOf(CHAT_MESSAGE_SUFFIX, CHAT_MESSAGE_PREFIX.length);
    if (metadataEnd < 0) {
      return { text: content, product: null, images: [] };
    }

    try {
      const payload = JSON.parse(
        content.slice(CHAT_MESSAGE_PREFIX.length, metadataEnd)
      ) as Partial<ChatMessagePayload>;
      return {
        text: payload.text ?? "",
        product: payload.product ?? null,
        images: Array.isArray(payload.images) ? payload.images.filter((item): item is ChatImageContext => Boolean(item?.url)) : [],
      };
    } catch {
      return { text: content, product: null, images: [] };
    }
  }

  if (!content.startsWith(LEGACY_PRODUCT_CONTEXT_PREFIX)) {
    return { text: content, product: null, images: [] };
  }

  const metadataEnd = content.indexOf(LEGACY_PRODUCT_CONTEXT_SUFFIX, LEGACY_PRODUCT_CONTEXT_PREFIX.length);
  if (metadataEnd < 0) {
    return { text: content, product: null, images: [] };
  }

  try {
    const product = JSON.parse(
      content.slice(LEGACY_PRODUCT_CONTEXT_PREFIX.length, metadataEnd)
    ) as ChatProductContext;
    const text = content.slice(metadataEnd + LEGACY_PRODUCT_CONTEXT_SUFFIX.length).trimStart();
    return { text, product, images: [] };
  } catch {
    return { text: content, product: null, images: [] };
  }
}
