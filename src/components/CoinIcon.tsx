export function CoinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/coin.avif"
      alt="coin"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ verticalAlign: 'middle' }}
    />
  )
}
