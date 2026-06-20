"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "...")[] = [];
  if (current <= 3) {
    pages.push(0, 1, 2, 3, 4, "...", total - 1);
  } else if (current >= total - 4) {
    pages.push(0, "...", total - 5, total - 4, total - 3, total - 2, total - 1);
  } else {
    pages.push(0, "...", current - 1, current, current + 1, "...", total - 1);
  }
  return pages;
}

export default function AdminPagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-sm text-gray-400">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className="h-9 w-9 text-sm"
              onClick={() => onPageChange(p as number)}
            >
              {(p as number) + 1}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
