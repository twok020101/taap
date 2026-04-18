import { notFound } from 'next/navigation'
import { GlobeIntro } from '@/components/globe/globe-intro'
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

  const [lng, lat] = city.mapCenter

  return (
    <>
      <GlobeIntro cityName={city.name} target={[lat, lng]} />
      {children}
    </>
  )
}
