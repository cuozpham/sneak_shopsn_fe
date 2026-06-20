"use client";

import { Suspense } from "react";
import ProductListingPage from "@/components/products/ProductListingPage";

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductListingPage />
    </Suspense>
  );
}
