const strokes = {
  CubeStack: (
    <>
      <path d="M12 18.5 32 9l20 9.5-20 9.5z" />
      <path d="m12 18.5 20 9.5 20-9.5" />
      <path d="M32 9v8.8" />
      <path d="M20 14.6v9.2l12 6.2" />
      <path d="m44 14.6 0 9.2-12 6.2" />
    </>
  ),
  DocumentStack: (
    <>
      <path d="m20 14 12-5 12 5v16l-12 5-12-5z" />
      <path d="m20 23 12 5 12-5" />
      <path d="M20 19.5 32 25l12-5.5" />
      <path d="M25 18.5h14" />
      <path d="M25 21.5h8" />
    </>
  ),
  Camera: (
    <>
      <path d="m18 22 10-5 18 8v12l-18 8-10-4.5z" />
      <path d="m18 22 18 8v15" />
      <path d="m28 17 18 8" />
      <circle cx="32" cy="29" r="6.5" />
      <path d="m38 11 6 2.6v6.4" />
      <path d="m21 26 6-2.8" />
    </>
  ),
  Shield: (
    <>
      <path d="m32 12 14 6v12c0 9-6.6 13.5-14 16-7.4-2.5-14-7-14-16V18z" />
      <path d="m24 29 6 5 8-10" />
    </>
  ),
  Checklist: (
    <>
      <path d="m16 15 16-7 16 7v22l-16 7-16-7z" />
      <path d="M24 20h12" />
      <path d="M24 26h8" />
      <path d="m25 31 5 3 7-10" />
      <path d="m20 13 4 2 4-4" />
    </>
  ),
  Spark: (
    <>
      <path d="m32 10 3 12 12 4-12 4-3 12-3-12-12-4 12-4z" />
      <path d="m18 17 6 2" />
      <path d="m40 17-6 2" />
      <path d="m18 39 6-2" />
      <path d="m40 39-6-2" />
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
