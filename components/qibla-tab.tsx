"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { MapPin, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface QiblaTabProps {
  language: Language
}

export default function QiblaTab({ language }: QiblaTabProps) {
  const [qiblaDirection, setQiblaDirection] = useState<number>(0)
  const [compassHeading, setCompassHeading] = useState<number>(0)
  const [distance, setDistance] = useState<number>(0)
  const [location, setLocation] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isAligned, setIsAligned] = useState(false)

  const isIOS = useRef<boolean>(false)

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent)
    requestLocationAndCompass()

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true)
      window.removeEventListener("deviceorientation", handleOrientation, true)
    }
  }, [])

  useEffect(() => {
    if (!loading && qiblaDirection > 0) {
      const diff = Math.abs(qiblaDirection - compassHeading)
      const normalizedDiff = Math.min(diff, 360 - diff)
      setIsAligned(normalizedDiff <= 15)
    }
  }, [compassHeading, qiblaDirection, loading])

  const requestLocationAndCompass = async () => {
    try {
      setLoading(true)
      setError("")

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords
      const qibla = calculateQiblaDirection(latitude, longitude)
      setQiblaDirection(qibla)
      setDistance(Math.round(calculateDistance(latitude, longitude, 21.4225, 39.8262)))
      setLocation(`${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`)

      const setupCompass = () => {
        window.addEventListener("deviceorientationabsolute", handleOrientation, true)
        window.addEventListener("deviceorientation", handleOrientation, true)
      }

      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === "granted") setupCompass()
        else setError("Compass permission was denied.")
      } else {
        setupCompass()
      }
    } catch (err: any) {
      setError("Please enable location and compass access.")
    } finally {
      setLoading(false)
    }
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    let heading: number

    if ((event as any).webkitCompassHeading !== undefined) {
      // iOS devices
      heading = (event as any).webkitCompassHeading
    } else if (event.alpha !== null) {
      // Android devices - using Math.abs(alpha - 360) as per reference
      heading = Math.abs(event.alpha - 360)
    } else {
      return
    }

    setCompassHeading(heading)
  }

  const calculateQiblaDirection = (lat: number, lon: number): number => {
    const kaabaLat = 21.4225
    const kaabaLon = 39.8262

    const latRad = (lat * Math.PI) / 180
    const lonRad = (lon * Math.PI) / 180
    const kaabaLatRad = (kaabaLat * Math.PI) / 180
    const kaabaLonRad = (kaabaLon * Math.PI) / 180

    const dLon = kaabaLonRad - lonRad

    const y = Math.sin(dLon) * Math.cos(kaabaLatRad)
    const x = Math.cos(latRad) * Math.sin(kaabaLatRad) - Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLon)

    const bearing = Math.atan2(y, x)
    const bearingDegrees = (bearing * 180) / Math.PI

    return (bearingDegrees + 360) % 360
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-6 text-center max-w-sm">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={requestLocationAndCompass}>{t("refresh")}</Button>
        </Card>
      </div>
    )

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 md:p-8 rounded-3xl shadow-lg">
          {isAligned && (
            <div className="mb-4 p-3 bg-green-500/10 border-2 border-green-500 rounded-xl text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-2 animate-pulse" />
              <p className="text-green-600 font-semibold">
                {language === "th" ? "✓ ทิศทางถูกต้อง" : language === "ar" ? "✓ الاتجاه صحيح" : "✓ Aligned with Qibla"}
              </p>
            </div>
          )}

          <div className="relative w-full aspect-square max-w-sm mx-auto mb-8">
            <div
              className="absolute inset-0 rounded-full border-[6px] border-primary/20 transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${-compassHeading}deg)` }}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-base font-semibold text-foreground">N</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-base font-semibold text-muted-foreground">
                S
              </div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                W
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                E
              </div>
            </div>

            <div className="absolute inset-0" style={{ transform: `rotate(${qiblaDirection}deg)` }}>
              <div className="absolute top-[1.25rem] left-1/2 -translate-x-1/2">
                <div
                  className={`w-0 h-0 drop-shadow-lg transition-all ${isAligned ? "scale-125" : ""}`}
                  style={{
                    borderLeft: "14px solid transparent",
                    borderRight: "14px solid transparent",
                    borderBottom: isAligned ? "26px solid #10b981" : "26px solid #f97316",
                  }}
                />
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full z-10 shadow-md" />
          </div>

          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 className="text-3xl font-bold">{t("qibla")}</h1>
              <button
                onClick={requestLocationAndCompass}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                aria-label={t("refresh")}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div>
              <p className="text-base text-muted-foreground mb-1">
                {language === "th" ? "ทิศกิบลัต" : language === "ar" ? "اتجاه القبلة" : "Qibla Direction"}
              </p>
              <p className="text-5xl font-bold text-primary">{Math.round(qiblaDirection)}°</p>
            </div>
            <div>
              <p className="text-base text-muted-foreground mb-1">
                {language === "th" ? "ระยะทางถึงมักกะห์" : language === "ar" ? "المسافة إلى مكة" : "Distance to Mecca"}
              </p>
              <p className="text-2xl font-semibold">{distance.toLocaleString()} km</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
