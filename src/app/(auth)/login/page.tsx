"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth";
import { getError } from "@/lib/api";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth, user, token } = useAuthStore();

  const handleLoginResult = async (payload: { idToken?: string; accessToken?: string }) => {
    if (!payload.idToken && !payload.accessToken) {
      toast.error("Không nhận được token Google");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.googleLoginOnly(payload);
      setAuth(res.data.result);
      toast.success("Đăng nhập thành công!");
      window.location.replace(res.data.result.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      await handleLoginResult({ accessToken: tokenResponse.access_token });
    },
    onError: () => toast.error("Đăng nhập Google thất bại"),
  });

  useEffect(() => {
    if (!user || !token) return;
    window.location.replace(user.role === "admin" ? "/admin" : "/");
  }, [user, token]);

  return (
    <div className="w-full max-w-md space-y-6 px-4 sm:px-0">
      {/* Brand */}
      <div className="text-center">
        <Link href="/" className="inline-block text-2xl font-black tracking-tight text-gray-900">
          MANDRO
        </Link>
        <p className="mt-1 text-sm text-gray-500">Đăng nhập để tiếp tục mua sắm</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Đăng nhập</h1>

        <div className="space-y-4">
          <p className="text-center text-sm text-gray-500">Chỉ đăng nhập bằng tài khoản Google Gmail.</p>
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Đang mở Google..." : "Đăng nhập bằng Google"}
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-gray-900 hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>

    </div>
  );
}
