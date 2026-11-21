/** The show's mark: a three-blade fan. Shared by the header, favicon and success screen. */
export const BLADE_PATH = "M0 -9 C 10 -30 34 -46 44 -38 C 52 -31 44 -14 24 -6 C 15 -2.5 7 -2 0 -3 Z";

export function FanMark({ className, spin = false }: { className?: string; spin?: boolean }) {
  return (
    <svg viewBox="-60 -60 120 120" className={className} aria-hidden>
      <g className={spin ? "[transform-origin:0_0] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" : undefined}>
        <path d={BLADE_PATH} fill="var(--color-lime)" />
        <path d={BLADE_PATH} fill="var(--color-pink)" transform="rotate(120)" />
        <path d={BLADE_PATH} fill="var(--color-blue)" transform="rotate(240)" />
      </g>
      <circle r="8" fill="var(--color-paper)" />
      <circle r="3" fill="var(--color-ink)" />
    </svg>
  );
}
