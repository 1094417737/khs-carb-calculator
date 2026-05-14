export default function Footer() {
  return (
    <footer className="mt-16 pb-8 text-center">
      <div className="max-w-[880px] mx-auto px-4">
        <div className="h-px bg-black/5 dark:bg-white/8 mb-6" />
        <p className="text-xs text-[#86868b] dark:text-[#8e8e93] leading-relaxed">
          计算结果仅供参考，不构成医疗建议。请在专业教练或运动营养师指导下制定补给方案。
        </p>
        <p className="text-xs text-[#aeaeb2] dark:text-[#636366] mt-1.5">
          基于 ACSM / ISSN / IOC 运动营养共识
        </p>
      </div>
    </footer>
  )
}
