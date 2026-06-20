"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { getError } from "@/lib/api";

type Step = "info" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email, phone, fullName);
      toast.success("Mã OTP đã được gửi vào email của bạn");
      setStep("otp");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email, otp);
      setResetToken(res.data.result);
      toast.success("Xác nhận thành công");
      setStep("password");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      router.push("/login");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: "info",     label: "Xác minh", icon: Mail },
    { key: "otp",      label: "Nhập OTP",  icon: ShieldCheck },
    { key: "password", label: "Mật khẩu", icon: KeyRound },
  ] as const;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <Link href="/" className="inline-block text-2xl font-black tracking-tight text-gray-900">
          MANDRO
        </Link>
        <p className="mt-1 text-sm text-gray-500">Đặt lại mật khẩu</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const active = s.key === step;
          const done = steps.findIndex((x) => x.key === step) > i;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${active ? "bg-gray-900 text-white" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-px ${done ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* Step 1 — Xác minh danh tính */}
        {step === "info" && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Xác minh danh tính</h1>
            <p className="text-sm text-gray-400 mb-6">Nhập thông tin tài khoản để nhận mã OTP</p>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Họ tên đầy đủ</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — Nhập OTP */}
        {step === "otp" && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Nhập mã OTP</h1>
            <p className="text-sm text-gray-400 mb-6">
              Mã 6 số đã được gửi tới <span className="font-medium text-gray-700">{email}</span>.<br />
              Có hiệu lực trong 5 phút.
            </p>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Mã OTP</label>
                <input
                  type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-center tracking-[0.5em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <button type="submit" disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? "Đang xác nhận..." : "Xác nhận"}
              </button>
              <button type="button" onClick={() => setStep("info")}
                className="w-full text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Gửi lại mã
              </button>
            </form>
          </>
        )}

        {/* Step 3 — Mật khẩu mới */}
        {step === "password" && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Mật khẩu mới</h1>
            <p className="text-sm text-gray-400 mb-6">Đặt mật khẩu mới cho tài khoản của bạn</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                <div className="relative">
                <input type={showPwd ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                <input type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {loading ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </form>
          </>
        )}

        <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
          <Link href="/login" className="flex items-center justify-center gap-1 hover:text-gray-800">
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
