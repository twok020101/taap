import { Card, CardContent } from '@/components/ui/card'
import { Map } from 'lucide-react'

export function MapPlaceholder() {
  return (
    <Card className="flex h-64 items-center justify-center border-dashed md:h-80">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="rounded-full bg-muted p-4">
          <Map className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">Map layer — v0.2</p>
          <p className="mt-1 text-sm text-muted-foreground">
            MapLibre GL heatmap overlay coming in v0.2.
            <br />
            Will show spatial LST delta across Bangalore.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
