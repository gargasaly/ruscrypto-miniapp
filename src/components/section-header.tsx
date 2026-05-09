type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <header className="space-y-4">
      {eyebrow ? (
        <span className="eyebrow-pill">{eyebrow}</span>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-[2rem] font-black leading-[1.05] text-white">
          {title}
        </h1>
        <p className="max-w-[36ch] text-[15px] leading-7 text-zinc-400">
          {description}
        </p>
      </div>
    </header>
  );
}
