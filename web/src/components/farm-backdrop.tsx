/**
 * Decorative farm scene for the login brand panel.
 *
 * Drawn as an inline SVG in low-opacity white so it reads as a subtle texture
 * over the brand green rather than competing with the lockup and copy. Purely
 * ornamental — hidden from assistive tech.
 */
export function FarmBackdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 600 900"
      preserveAspectRatio="xMidYMax slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}>
      <defs>
        {/* Fades the scene out toward the top so the copy stays legible. */}
        <linearGradient id="farm-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="farm-mask">
          <rect width="600" height="900" fill="url(#farm-fade)" />
        </mask>

        {/* One rice stalk, reused across the paddy rows. */}
        <g id="stalk">
          <path
            d="M0 0 L0 -26"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M0 -26 q -7 -6 -3 -13 q 6 3 3 13 z"
            fill="#fff"
            opacity="0.9"
          />
          <path
            d="M0 -18 q -9 -3 -11 -10 q 9 1 11 10 z"
            fill="#fff"
            opacity="0.65"
          />
          <path
            d="M0 -12 q 9 -3 11 -10 q -9 1 -11 10 z"
            fill="#fff"
            opacity="0.65"
          />
        </g>
      </defs>

      <g mask="url(#farm-mask)" opacity="0.16">
        {/* Rolling hills on the horizon. */}
        <path
          d="M-20 470 q 120 -70 250 -18 q 90 36 180 -6 q 110 -50 210 6 v 470 h -640 z"
          fill="#fff"
          opacity="0.35"
        />
        <path
          d="M-20 560 q 150 -60 300 -6 q 140 50 340 -18 v 400 h -640 z"
          fill="#fff"
          opacity="0.28"
        />

        {/* Paddy terrace bands. */}
        {[625, 700, 782, 872].map((y, row) => (
          <path
            key={y}
            d={`M-20 ${y} q 160 ${row % 2 ? 22 : -20} 320 0 q 160 ${
              row % 2 ? -20 : 22
            } 320 0`}
            stroke="#fff"
            strokeWidth="1.4"
            fill="none"
            opacity="0.5"
          />
        ))}

        {/* Rice stalks, denser and larger toward the foreground. */}
        {[
          { y: 624, count: 9, scale: 0.72 },
          { y: 699, count: 8, scale: 0.9 },
          { y: 781, count: 7, scale: 1.12 },
          { y: 871, count: 6, scale: 1.4 },
        ].map(({ y, count, scale }) =>
          Array.from({ length: count }, (_, i) => {
            const step = 600 / count;
            // Offset alternate rows so stalks don't line up in columns.
            const x = step * i + step / 2 + (y % 2 ? step / 3 : 0);
            return (
              <use
                key={`${y}-${i}`}
                href="#stalk"
                transform={`translate(${x} ${y}) scale(${scale})`}
              />
            );
          }),
        )}
      </g>
    </svg>
  );
}
