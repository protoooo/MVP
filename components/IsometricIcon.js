const strokes = {
  CubeStack: (
    <>
      <path d="M32 10 50 20 32 30 14 20Z" />
      <path d="M14 20v16l18 10 18-10V20" />
      <path d="M32 30v16" />
      <path d="m18 22 14 8 14-8" />
      <path d="m18 30 14 8 14-8" />
    </>
  ),
  DocumentStack: (
    <>
      <path d="m22 18 16-8 14 8v20l-16 8-14-8z" />
      <path d="m22 26 16 8 14-8" />
      <path d="M28 22h10" />
      <path d="M28 27h14" />
      <path d="M28 32h8" />
    </>
  ),
  Camera: (
    <>
      <path d="m18 24 16-8 16 8v16l-16 8-16-8z" />
      <path d="m18 30 16 8 16-8" />
      <circle cx="34" cy="32" r="6" />
      <path d="m24 22 6-3" />
      <path d="m42 20 8 4" />
    </>
  ),
  Shield: (
    <>
      <path d="m32 12 14 8v14c0 8-5.5 12-14 16-8.5-4-14-8-14-16V20z" />
      <path d="m24 30 6 5 8-10" />
    </>
  ),
  Checklist: (
    <>
      <path d="m18 16 14-6 14 6v20l-14 6-14-6z" />
      <path d="M26 20h12" />
      <path d="M26 26h8" />
      <path d="m26 32 6 4 8-12" />
      <path d="M20 14l4 2 4-4" />
    </>
  ),
  Spark: (
    <>
      <path d="m32 10 3 11 11 3-11 3-3 11-3-11-11-3 11-3z" />
      <path d="m20 20 4 1" />
      <path d="m44 20-4 1" />
      <path d="m20 40 4-1" />
      <path d="m44 40-4-1" />
    </>
  ),
}

export default function IsometricIcon({ variant = 'CubeStack', size = 72, strokeWidth = 1.5, className = '' }) {
  const content = strokes[variant] || strokes.CubeStack
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {content}
    </svg>
  )
}
