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
  const [compass, setCompass] = useState<number>(0)
  const [pointDegree, setPointDegree] = useState<number>(0)
  const [distance, setDistance] = useState<number>(0)
  const [location, setLocation] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [showPoint, setShowPoint] = useState(false)
  const [isStarted, setIsStarted] = useState(false)

  const isIOS = useRef<boolean>(false)

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    isIOS.current = !!(navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/))

    navigator.geolocation.getCurrentPosition(locationHandler, (err) => {
      setError("Please enable location access.")
      setLoading(false)
    })

    return () => {
      window.removeEventListener("deviceorientation", handler, true)
      window.removeEventListener("deviceorientationabsolute", handler, true)
    }
  }, [])

  const locationHandler = (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords
    const degree = calcDegreeToPoint(latitude, longitude)

    let adjustedDegree = degree
    if (degree < 0) {
      adjustedDegree = degree + 360
    }

    setPointDegree(adjustedDegree)
    setDistance(Math.round(calculateDistance(latitude, longitude, 21.422487, 39.826206)))
    setLocation(`${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`)
    setLoading(false)
  }

  const calcDegreeToPoint = (latitude: number, longitude: number): number => {
    const point = {
      lat: 21.422487,
      lng: 39.826206,
    }

    const phiK = (point.lat * Math.PI) / 180.0
    const lambdaK = (point.lng * Math.PI) / 180.0
    const phi = (latitude * Math.PI) / 180.0
    const lambda = (longitude * Math.PI) / 180.0
    const psi =
      (180.0 / Math.PI) *
      Math.atan2(
        Math.sin(lambdaK - lambda),
        Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda),
      )
    return Math.round(psi)
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

  const startCompass = async () => {
    if (isIOS.current) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        try {
          const response = await (DeviceOrientationEvent as any).requestPermission()
          if (response === "granted") {
            window.addEventListener("deviceorientation", handler, true)
            setIsStarted(true)
          } else {
            setError("Compass permission denied!")
          }
        } catch (err) {
          setError("Compass not supported on this device")
        }
      }
    } else {
      window.addEventListener("deviceorientationabsolute", handler, true)
      setIsStarted(true)
    }
  }

  const handler = (e: DeviceOrientationEvent) => {
    const compassHeading = (e as any).webkitCompassHeading || Math.abs((e.alpha || 0) - 360)
    setCompass(compassHeading)

    if (pointDegree) {
      const diff = Math.abs(pointDegree - compassHeading)
      const normalizedDiff = Math.min(diff, 360 - diff)
      setShowPoint(normalizedDiff < 15)
    }
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
          <Button onClick={() => window.location.reload()}>{t("refresh")}</Button>
        </Card>
      </div>
    )

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 md:p-8 rounded-3xl shadow-lg">
          <div className="relative w-full aspect-square max-w-sm mx-auto mb-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 z-10">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "20px solid transparent",
                  borderRight: "20px solid transparent",
                  borderBottom: "30px solid #ef4444",
                }}
              />
            </div>

            <div
              className="absolute inset-0 rounded-full border-4 border-primary/20 transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${-compass}deg)` }}
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

              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/5 to-primary/10" />
            </div>

            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-500 rounded-full transition-opacity duration-500 ${
                showPoint ? "opacity-100 animate-pulse" : "opacity-0"
              }`}
            />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full z-20" />
          </div>

          {!isStarted && (
            <div className="text-center mb-6">
              <Button onClick={startCompass} size="lg" className="w-full">
                {language === "th" ? "เริ่มเข็มทิศ" : language === "ar" ? "ابدأ البوصلة" : "Start Compass"}
              </Button>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 className="text-3xl font-bold">{t("qibla")}</h1>
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label={t("refresh")}
              >
                <RefreshCw className="w-5 h-5" />
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
              <p className="text-5xl font-bold text-primary tabular-nums">{Math.round(pointDegree)}°</p>
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
