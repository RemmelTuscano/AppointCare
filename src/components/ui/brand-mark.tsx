import Image from 'next/image'

export function BrandMark({ className }: { className?: string }) {
  return <Image src="/appointcare-logo.svg" alt="" aria-hidden="true" width={64} height={64} loading="eager" className={className} />
}
