"use client";

import { useEffect, useState } from "react";
import { policiesApi } from "@/lib/api/policies";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [privacy, setPrivacy] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    policiesApi
      .getPrivacy()
      .then((res) => {
        if (alive) {
          setPrivacy(res.data.result || "");
        }
      })
      .catch(() => {
        if (alive) {
          toast.error("Không thể tải chính sách bảo mật");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-black mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Link>

        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-10 md:p-12">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-2/3 rounded-xl" />
              <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
              </div>
              <div className="space-y-3 pt-6">
                <Skeleton className="h-5 w-1/3 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>
            </div>
          ) : (
            <article className="prose prose-slate max-w-none">
              <div className="text-sm leading-7 text-slate-600 sm:text-base sm:leading-8" dangerouslySetInnerHTML={{ __html: privacy }} />
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
