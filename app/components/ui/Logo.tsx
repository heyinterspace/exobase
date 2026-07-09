import { classNames } from '~/utils/classNames';

/**
 * Exobase logo: three faceted atmospheric shells rising from a horizon to a
 * single point of light that has launched beyond them - the abstracted
 * exosphere culminating at the exobase. One color (Interspace purple
 * #9A3AD9), angular and geometric: sharp mitered corners, flat caps, three
 * layers. Locked to the "exobase" wordmark in Space Grotesk. Color-on-dark
 * only - this app has no light theme.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <svg viewBox="0 0 100 100" width="28" height="28" className="shrink-0" role="img" aria-label="Exobase">
        <g transform="translate(0 4)" fill="none" stroke="#9A3AD9" strokeWidth="4.75" strokeLinejoin="miter" strokeLinecap="butt">
          {/* point of light, launched beyond the atmosphere */}
          <circle cx="50" cy="19" r="3" fill="#9A3AD9" stroke="none" />
          {/* exobase boundary - outermost shell */}
          <polyline points="16,68 28.92,43.5 50,33 71.08,43.5 84,68" />
          {/* mid atmosphere */}
          <polyline points="25.5,68 34.81,51.2 50,44 65.19,51.2 74.5,68" />
          {/* dense lower layer */}
          <polyline points="35,68 40.7,58.9 50,55 59.3,58.9 65,68" />
          {/* horizon */}
          <line x1="14" y1="68" x2="86" y2="68" />
        </g>
      </svg>
      <span className="font-['Space_Grotesk'] font-bold text-2xl tracking-[-0.04em] text-bolt-elements-textPrimary">
        exobase
      </span>
    </div>
  );
}
