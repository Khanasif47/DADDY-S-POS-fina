export const PageHeader = ({ eyebrow, title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-6 mb-8 fade-up">
    <div>
      {eyebrow && <div className="label-eyebrow mb-2">{eyebrow}</div>}
      <h1
        className="font-serif-display text-4xl sm:text-5xl"
        style={{ color: "#2c1b18", lineHeight: 1.05 }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-[#5a3a31] max-w-xl">{subtitle}</p>
      )}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);
