export default function IconoCalendario({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v3.4M16 3v3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8.3" cy="13.3" r="1.15" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="13.3" r="1.15" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
