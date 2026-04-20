import { notFound } from 'next/navigation'
import { getCity } from '@/cities'

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ city: string }>
}) {
  const { city: cityId } = await params
  const city = getCity(cityId)
  if (!city) notFound()

  return <>{children}</>
}
