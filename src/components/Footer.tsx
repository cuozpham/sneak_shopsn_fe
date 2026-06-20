import Link from "next/link";

const policyLinks = [
  { label: "Điều khoản dịch vụ", href: "/policies/terms" },
  { label: "Chính sách bảo mật", href: "/policies/privacy" },
  { label: "Chính sách đổi trả", href: "/policies/exchange" },
  { label: "Chính sách bảo hành", href: "/policies/warranty" },
];

export default function Footer() {
  return (
    <footer className="mt-auto bg-white text-[#0B1F1A] border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 text-left">
          {/* Column 1: Company Info */}
          <div className="space-y-3">
            <p className="text-base font-semibold text-[#0B1F1A]">CÔNG TY TNHH MANDRO</p>
            <p className="text-sm font-medium text-[#0B1F1A]">MANDRO - BẢN LĨNH TRÊN TỪNG BƯỚC CHÂN</p>
            <p className="text-sm leading-6 text-slate-600">
              Địa chỉ: Số nhà 40, ngõ 438, đường La Phù, Thôn Thắng Lợi, Xã An Khánh, Thành Phố Hà Nội, Việt Nam
            </p>
            <div className="pt-2 space-y-1 text-sm text-slate-600">
              <p>Email: giaydepmandro@gmail.com</p>
              <p>Hotline: 0934762018</p>
            </div>
          </div>

          {/* Column 2: Chính sách */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#0B1F1A]">Chính sách</p>
            <div className="flex flex-col gap-2">
              {policyLinks.map((item) => (
                <Link key={item.label} href={item.href} className="text-sm text-slate-600 transition hover:text-[#0B1F1A]">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
