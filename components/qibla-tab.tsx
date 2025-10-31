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
  const [displayDirection, setDisplayDirection] = useState<number>(0)
  const [distance, setDistance] = useState<number>(0)
  const [location, setLocation] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isAligned, setIsAligned] = useState(false)

  const isIOS = useRef<boolean>(false)
  const smoothedHeading = useRef<number>(0)
  const headingHistory = useRef<number[]>([])
  const animationFrameId = useRef<number | null>(null)
  const lastUpdateTime = useRef<number>(0)
  const alignmentThreshold = useRef<{ on: number; off: number }>({ on: 12, off: 18 })
  const displayDirectionRef = useRef<number>(0)

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    isIOS.current = /iPad|iPhone|iPod/.test(navigator.userAgent)
    requestLocationAndCompass()

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true)
      window.removeEventListener("deviceorientation", handleOrientation, true)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && qiblaDirection > 0) {
      const diff = Math.abs(qiblaDirection - compassHeading)
      const normalizedDiff = Math.min(diff, 360 - diff)

      if (isAligned) {
        // If already aligned, use higher threshold to turn off (hysteresis)
        if (normalizedDiff > alignmentThreshold.current.off) {
          setIsAligned(false)
        }
      } else {
        // If not aligned, use lower threshold to turn on
        if (normalizedDiff <= alignmentThreshold.current.on) {
          setIsAligned(true)
        }
      }
    }
  }, [compassHeading, qiblaDirection, loading, isAligned])

  useEffect(() => {
    if (qiblaDirection === 0) return

    const targetDirection = Math.round(qiblaDirection)
    const currentDirection = displayDirectionRef.current

    // Calculate shortest path considering 360° wrap
    let diff = targetDirection - currentDirection
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360

    // Only update if difference is significant (> 0.5 degrees)
    if (Math.abs(diff) > 0.5) {
      const step = diff * 0.15 // Smooth interpolation factor
      const newDirection = (currentDirection + step + 360) % 360
      displayDirectionRef.current = newDirection
      setDisplayDirection(Math.round(newDirection))

      // Continue animation
      const timeoutId = setTimeout(() => {
        setDisplayDirection((prev) => prev) // Trigger re-render
      }, 50)

      return () => clearTimeout(timeoutId)
    } else {
      displayDirectionRef.current = targetDirection
      setDisplayDirection(targetDirection)
    }
  }, [qiblaDirection, displayDirection])

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

  const smoothHeading = (newHeading: number): number => {
    const maxHistorySize = 5

    // Handle 360/0 degree wrap-around
    if (headingHistory.current.length > 0) {
      const lastHeading = headingHistory.current[headingHistory.current.length - 1]
      const diff = newHeading - lastHeading

      if (diff > 180) {
        newHeading -= 360
      } else if (diff < -180) {
        newHeading += 360
      }
    }

    headingHistory.current.push(newHeading)
    if (headingHistory.current.length > maxHistorySize) {
      headingHistory.current.shift()
    }

    const average = headingHistory.current.reduce((a, b) => a + b, 0) / headingHistory.current.length
    return (average + 360) % 360
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const now = Date.now()
    if (now - lastUpdateTime.current < 33) return // ~30fps
    lastUpdateTime.current = now

    let heading: number

    if ((event as any).webkitCompassHeading !== undefined) {
      heading = (event as any).webkitCompassHeading
    } else if (event.alpha !== null) {
      heading = Math.abs(event.alpha - 360)
    } else {
      return
    }

    const smoothed = smoothHeading(heading)
    smoothedHeading.current = smoothed

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }

    animationFrameId.current = requestAnimationFrame(() => {
      setCompassHeading(smoothed)
    })
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
          <div className="relative w-full aspect-square max-w-sm mx-auto mb-8">
            <div
              className={`absolute inset-0 rounded-full border-[6px] transition-all duration-300 ease-out ${
                isAligned ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" : "border-primary/20"
              }`}
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

            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${qiblaDirection}deg)` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div
                  className={`w-0 h-0 drop-shadow-lg transition-all duration-300 ${isAligned ? "scale-125" : ""}`}
                  style={{
                    borderLeft: "20px solid transparent",
                    borderRight: "20px solid transparent",
                    borderBottom: isAligned ? "80px solid #10b981" : "80px solid #f97316",
                    transform: "translateY(-40px)", // Offset to point upward from center
                  }}
                />
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full z-10 shadow-md" />

            {isAligned && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse whitespace-nowrap">
                  {language === "th" ? "✓ ทิศทางถูกต้อง" : language === "ar" ? "✓ الاتجاه صحيح" : "✓ Aligned"}
                </div>
              </div>
            )}
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
              <p className="text-5xl font-bold text-primary tabular-nums">{displayDirection}°</p>
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
