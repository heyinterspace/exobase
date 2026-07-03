/**
 * Decorative planet horizon for the homepage hero — sits behind the composer,
 * "Launch your app to the stratosphere". Flat silhouette + a single accent
 * rim-light arc, in keeping with structured.glass's one-accent rule.
 */
export default function PlanetSilhouette() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 w-full h-[45vh] min-h-[280px] max-h-[520px]"
      >
        <defs>
          <radialGradient id="planet-fill" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#2a2440" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
        </defs>
        <circle cx="600" cy="450" r="400" fill="url(#planet-fill)" />
        <path d="M 200 68 A 400 400 0 0 1 1000 68" fill="none" stroke="#a388ee" strokeWidth="2" strokeOpacity="0.6" />
        <circle cx="600" cy="450" r="400" fill="none" stroke="#a388ee" strokeWidth="1" strokeOpacity="0.25" />
      </svg>
    </div>
  );
}
