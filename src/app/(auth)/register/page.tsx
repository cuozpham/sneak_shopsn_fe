"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth";
import { getError } from "@/lib/api";
import { LogIn } from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleRegisterResult = async (payload: { idToken?: string; accessToken?: string }) => {
    if (!payload.idToken && !payload.accessToken) {
      toast.error("Không nhận được token Google");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.googleLogin(payload);
      setAuth(res.data.result);
      toast.success("Đăng ký thành công! Chào mừng đến MANDRO");
      router.push("/");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      await handleRegisterResult({ accessToken: tokenResponse.access_token });
    },
    onError: () => toast.error("Đăng ký Google thất bại, vui lòng thử lại"),
  });

  return (
    <div className="w-full max-w-md space-y-6 px-4 sm:px-0">
      <div className="text-center">
        <Link href="/" className="inline-block text-2xl font-black tracking-tight text-gray-900">
          MANDRO
        </Link>
        <p className="mt-2 text-sm text-gray-500">Tạo tài khoản để mua sắm dễ dàng hơn</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 text-center">Đăng ký tài khoản</h1>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">Chỉ đăng ký bằng tài khoản Google Gmail.</p>
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Đang mở Google..." : "Đăng ký bằng Google"}
          </button>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Đang xử lý...
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 text-center text-sm text-gray-500">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-gray-900 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
