"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { formatVND } from "@/lib/format";
import { toFrontendImageUrl } from "@/lib/image";
import type { ChatProductContext } from "@/lib/chat-message";

type Props = {
  product: ChatProductContext;
  onDismiss: () => void;
};

export default function ProductPreviewCard({ product, onDismiss }: Props) {
  const imageUrl = toFrontendImageUrl(product.imageUrl);
  const originalPrice = product.discountPrice && product.discountPrice > product.price
    ? product.discountPrice
    : null;

  return (
    <div className="mx-2 mt-2 rounded-lg border border-[#eee] bg-white p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:mx-3 sm:mt-3 sm:p-2.5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium leading-snug text-gray-500 sm:text-[11px]">
          Bạn đang trao đổi với Người bán về sản phẩm này
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Đóng sản phẩm đính kèm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white sm:h-[60px] sm:w-[60px]">
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Sản phẩm</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-5 text-gray-900 sm:text-[13px]">{product.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900 sm:text-sm">{formatVND(product.price)}</span>
            {originalPrice && (
              <span className="text-[11px] text-gray-400 line-through sm:text-[12px]">{formatVND(originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
