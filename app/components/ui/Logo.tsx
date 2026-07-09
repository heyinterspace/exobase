import { classNames } from '~/utils/classNames';

/**
 * The "12a" mark from the design pass: a 5-layer widening dome (planet
 * silhouette, echoing Starfield/PlanetSilhouette) locked to a Space Grotesk
 * wordmark. Color-on-dark only — this app has no light theme.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <svg viewBox="0 0 100 100" width="28" height="28" className="shrink-0 -mb-1 -mr-0.5">
        <ellipse cx="50" cy="88" rx="14" ry="4" fill="#3a4052" />
        <path d="M 36,86.5 A 14,9 0 0 1 64,86.5 A 14,4 0 0 1 36,86.5 Z" fill="#6b7280" />
        <ellipse cx="50" cy="75" rx="19" ry="5" fill="#414755" />
        <path d="M 31,73.5 A 19,12 0 0 1 69,73.5 A 19,5 0 0 1 31,73.5 Z" fill="#767e8d" />
        <ellipse cx="50" cy="61" rx="24" ry="6.5" fill="#4c5362" />
        <path d="M 26,59.5 A 24,15 0 0 1 74,59.5 A 24,6.5 0 0 1 26,59.5 Z" fill="#828a99" />
        <ellipse cx="50" cy="45" rx="29" ry="8" fill="#565d6b" />
        <path d="M 21,43.5 A 29,18 0 0 1 79,43.5 A 29,8 0 0 1 21,43.5 Z" fill="#8f97a5" />
        <ellipse cx="50" cy="27" rx="34" ry="9.5" fill="#6f45c8" />
        <path d="M 16,25.5 A 34,21 0 0 1 84,25.5 A 34,9.5 0 0 1 16,25.5 Z" fill="#b388ff" />
        <path
          d="M 27,16 A 18,13 0 0 1 43,11"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.35"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-['Space_Grotesk'] font-bold text-2xl tracking-[-0.04em] text-bolt-elements-textPrimary">
        exobase
      </span>
    </div>
  );
}
