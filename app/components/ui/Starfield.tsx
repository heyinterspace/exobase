/**
 * Decorative starfield for the homepage hero — sits behind PlanetSilhouette,
 * filling the exosphere above the planet horizon with space. A small subset
 * of stars twinkle on staggered CSS animations. Positions come from a seeded
 * PRNG (not Math.random()) so server and client render the same field and
 * hydration doesn't mismatch.
 */
import { classNames } from '~/utils/classNames';

function seededRandom(seed: number) {
  let t = seed;

  return () => {
    t += 0x6d2b79f5;

    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: boolean;
  delay: number;
  duration: number;
}

const STAR_COUNT = 110;

const stars: Star[] = (() => {
  const rand = seededRandom(1337);

  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 100,
    size: rand() * 1.8 + 1,
    opacity: rand() * 0.4 + 0.5,
    twinkle: i % 6 === 0,
    delay: rand() * 5,
    duration: rand() * 2.5 + 2.5,
  }));
})();

export default function Starfield() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
      {stars.map((star, i) => (
        <div
          key={i}
          className={classNames(
            'absolute rounded-full bg-white shadow-[0_0_4px_1px_rgba(255,255,255,0.5)]',
            star.twinkle && 'animate-star-twinkle',
          )}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: star.twinkle ? `${star.delay}s` : undefined,
            animationDuration: star.twinkle ? `${star.duration}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
