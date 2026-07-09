import { classNames } from '~/utils/classNames';

/**
 * Exobase logo: three faceted atmospheric shells rising from a horizon to a
 * single point of light, in the Interspace purple gradient (indigo #2C2EA5 at
 * the dense lower layer -> violet #B388FF at the exobase boundary, on a
 * #5E17EB horizon). The mark reads as the layered exosphere culminating at the
 * exobase. Locked to the "exobase" wordmark in Space Grotesk. Color-on-dark
 * only - this app has no light theme.
 *
 * Angular / geometric by design: sharp mitered corners, flat caps, three
 * layers. Replaces the earlier stacked-dome and ringed-planet explorations,
 * which read as a screw and a blob respectively.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <svg viewBox="0 0 100 100" width="28" height="28" className="shrink-0" role="img" aria-label="Exobase">
        <g transform="translate(0 5)">
          {/* point of light above the atmosphere */}
          <circle cx="50" cy="20" r="3.2" fill="#B388FF" />
          {/* exobase boundary - outermost shell */}
          <polyline
            points="16,68 28.92,43.5 50,33 71.08,43.5 84,68"
            fill="none"
            stroke="#B388FF"
            strokeWidth="5.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
          {/* mid atmosphere */}
          <polyline
            points="25.5,68 34.81,51.2 50,44 65.19,51.2 74.5,68"
            fill="none"
            stroke="#6E2AD1"
            strokeWidth="5.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
          {/* dense lower layer */}
          <polyline
            points="35,68 40.7,58.9 50,55 59.3,58.9 65,68"
            fill="none"
            stroke="#2C2EA5"
            strokeWidth="5.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
          {/* horizon */}
          <line x1="13" y1="68" x2="87" y2="68" stroke="#5E17EB" strokeWidth="5.5" strokeLinecap="butt" />
        </g>
      </svg>
      <span className="font-['Space_Grotesk'] font-bold text-2xl tracking-[-0.04em] text-bolt-elements-textPrimary">
        exobase
      </span>
    </div>
  );
}
