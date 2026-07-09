import { classNames } from '~/utils/classNames';

/**
 * Exobase logo: a ringed-planet mark in the Interspace purple gradient
 * (indigo #2C2EA5 -> purple #9A3AD9, violet #5E17EB ring), locked to the
 * "exobase" wordmark in Space Grotesk. Color-on-dark only - this app has no
 * light theme.
 *
 * Replaces the earlier "12a" stacked-dome mark, which read as an upside-down
 * screw/mushroom (discs widened toward the top) with an off-brand grey stack.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <svg viewBox="0 0 100 100" width="28" height="28" className="shrink-0" role="img" aria-label="Exobase">
        <defs>
          <linearGradient id="exobaseLogoGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9A3AD9" />
            <stop offset="1" stopColor="#2C2EA5" />
          </linearGradient>
        </defs>
        {/* orbit ring - back half */}
        <g transform="rotate(-18 50 51)">
          <ellipse cx="50" cy="51" rx="45" ry="14.5" fill="none" stroke="#5E17EB" strokeWidth="5" />
        </g>
        {/* planet */}
        <circle cx="50" cy="51" r="25" fill="url(#exobaseLogoGradient)" />
        <ellipse cx="41.5" cy="42.5" rx="10" ry="6.5" fill="#ffffff" opacity="0.16" />
        {/* orbit ring - front half, drawn over the planet */}
        <g transform="rotate(-18 50 51)">
          <path
            d="M 5,51 A 45,14.5 0 0 0 95,51"
            fill="none"
            stroke="#5E17EB"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="font-['Space_Grotesk'] font-bold text-2xl tracking-[-0.04em] text-bolt-elements-textPrimary">
        exobase
      </span>
    </div>
  );
}
