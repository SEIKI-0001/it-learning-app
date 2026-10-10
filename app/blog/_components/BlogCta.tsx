import Link from "next/link";

type BlogCtaProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  compact?: boolean;
};

export default function BlogCta({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  compact = false,
}: BlogCtaProps) {
  return (
    <section
      aria-label="ITパスポート学習コーチの紹介"
      className={`overflow-hidden rounded-[18px] border border-[#d7e8f5] bg-white shadow-[0_14px_32px_rgba(22,94,131,0.10)] ${
        compact ? "p-5" : "p-6 sm:p-7"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f7a600]" />
        <p className="text-xs font-bold text-[#1b75a6]">
          ITパスポート学習コーチ
        </p>
      </div>
      <p
        className={`mt-3 font-bold leading-snug text-[#12384d] ${
          compact ? "text-lg" : "text-xl sm:text-2xl"
        }`}
      >
        {title}
      </p>
      <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
        {description}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex justify-center rounded-full bg-[#f7a600] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(247,166,0,0.28)] transition hover:bg-[#e69600] active:scale-[0.99]"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="inline-flex justify-center rounded-full border border-[#9fcde8] bg-white px-5 py-3 text-sm font-bold text-[#1b75a6] transition hover:border-[#1b75a6] active:scale-[0.99]"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
