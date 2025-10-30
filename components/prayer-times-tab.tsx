"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Sunrise, Sun, CloudSun, Sunset, Moon, MapPin, Calendar, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface PrayerTimes {
  Fajr: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

interface HijriDate {
  date: string
  month: { en: string; ar: string }
  year: string
}

interface PrayerTimesTabProps {
  language: Language
  timeFormat: "12" | "24"
}

export default function PrayerTimesTab({ language, timeFormat }: PrayerTimesTabProps) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null)
  const [hijriDate, setHijriDate] = useState<HijriDate | null>(null)
  const [location, setLocation] = useState<string>("Loading...")
  const [nextPrayer, setNextPrayer] = useState<string>("")
  const [timeUntilNext, setTimeUntilNext] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const t = (key: TranslationKey) => translations[language][key]

  const prayerIcons = {
    Fajr: Sunrise,
    Dhuhr: Sun,
    Asr: CloudSun,
    Maghrib: Sunset,
    Isha: Moon,
  }

  const formatTime = (time: string) => {
    if (timeFormat === "24") return time
    const [hours, minutes] = time.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  useEffect(() => {
    fetchPrayerTimes()
  }, [])

  useEffect(() => {
    if (prayerTimes) {
      const interval = setInterval(() => {
        calculateNextPrayer()
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [prayerTimes])

  useEffect(() => {
    if (prayerTimes && typeof window !== "undefined") {
      const notificationsEnabled = localStorage.getItem("notifications") === "true"
      if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
        schedulePrayerNotifications()
      }
    }
  }, [prayerTimes, language])

  const schedulePrayerNotifications = () => {
    if (!prayerTimes) return

    Object.entries(prayerTimes)
      .filter(([name]) => ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(name))
      .forEach(([name, time]) => {
        const [hours, minutes] = time.split(":").map(Number)
        const now = new Date()
        const prayerTime = new Date()
        prayerTime.setHours(hours, minutes, 0, 0)

        if (prayerTime > now) {
          const timeUntilPrayer = prayerTime.getTime() - now.getTime()
          setTimeout(() => {
            new Notification(`${t(name.toLowerCase() as TranslationKey)} ${t("nextPrayer")}`, {
              body: `${t("nextPrayer")}: ${formatTime(time)}`,
              icon: "/icon-192.png",
              tag: name,
            })
          }, timeUntilPrayer)
        }
      })
  }

  const fetchPrayerTimes = async () => {
    try {
      setLoading(true)
      setError("")

      const savedMethod = localStorage.getItem("calculationMethod") || "2"

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords

      const response = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${savedMethod}`,
      )
      const data = await response.json()

      if (data.code === 200) {
        setPrayerTimes(data.data.timings)
        setHijriDate(data.data.date.hijri)
        const locationName = data.data.meta.timezone || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
        setLocation(locationName)

        localStorage.setItem("cachedPrayerTimes", JSON.stringify(data.data.timings))
        localStorage.setItem("cachedHijriDate", JSON.stringify(data.data.date.hijri))
        localStorage.setItem("cachedLocation", locationName)
        localStorage.setItem("lastFetchDate", new Date().toDateString())
      } else {
        setError(t("enableLocation"))
      }
    } catch (err) {
      const cachedTimes = localStorage.getItem("cachedPrayerTimes")
      const cachedHijri = localStorage.getItem("cachedHijriDate")
      const cachedLoc = localStorage.getItem("cachedLocation")

      if (cachedTimes && cachedHijri && cachedLoc) {
        setPrayerTimes(JSON.parse(cachedTimes))
        setHijriDate(JSON.parse(cachedHijri))
        setLocation(cachedLoc + " (Cached)")
        setError(t("usingCached"))
      } else {
        setError(t("enableLocation"))
        fetchPrayerTimesByCity("Bangkok")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPrayerTimesByCity = async (city: string) => {
    try {
      const savedMethod = localStorage.getItem("calculationMethod") || "2"
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Thailand&method=${savedMethod}`,
      )
      const data = await response.json()

      if (data.code === 200) {
        setPrayerTimes(data.data.timings)
        setHijriDate(data.data.date.hijri)
        setLocation(city)
      }
    } catch (err) {
      console.error("Error fetching prayer times by city:", err)
    }
  }

  const handleRefresh = () => {
    fetchPrayerTimes()
  }

  const calculateNextPrayer = () => {
    if (!prayerTimes) return

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const prayers = Object.entries(prayerTimes)
      .filter(([name]) => ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(name))
      .map(([name, time]) => {
        const [hours, minutes] = time.split(":").map(Number)
        return { name, time: hours * 60 + minutes }
      })

    const nextPrayerData = prayers.find((prayer) => prayer.time > currentTime)

    if (nextPrayerData) {
      setNextPrayer(nextPrayerData.name)
      const diff = nextPrayerData.time - currentTime
      const hours = Math.floor(diff / 60)
      const minutes = diff % 60
      setTimeUntilNext(`${hours}h ${minutes}m`)
    } else {
      setNextPrayer("Fajr")
      const fajrTime = prayers[0].time
      const diff = 24 * 60 - currentTime + fajrTime
      const hours = Math.floor(diff / 60)
      const minutes = diff % 60
      setTimeUntilNext(`${hours}h ${minutes}m`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (error && !prayerTimes) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-6 text-center max-w-sm">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchPrayerTimes}>{t("retry")}</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <div className="gradient-islamic text-white px-4 pt-3 pb-4 rounded-b-3xl flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-balance">
              {hijriDate?.date} {language === "ar" ? hijriDate?.month.ar : hijriDate?.month.en} {hijriDate?.year}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
            aria-label={t("refresh")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            {timeFormat === "24"
              ? new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
          </h1>
          <p className="text-white/80 text-xs">
            {new Date().toLocaleDateString(language === "th" ? "th-TH" : language === "ar" ? "ar-SA" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4 flex-shrink-0">
        {nextPrayer && (
          <Card className="bg-card shadow-xl border-2 overflow-hidden">
            <div className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("nextPrayer")}</p>
              <p className="text-2xl font-bold text-primary mb-1">{t(nextPrayer.toLowerCase() as TranslationKey)}</p>
              <p className="text-xl font-semibold mb-2">{timeUntilNext}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 border-t">
                <MapPin className="w-3 h-3" />
                <span className="text-balance">{location}</span>
              </div>
            </div>
          </Card>
        )}

        {error && prayerTimes && (
          <Card className="mt-2 p-2 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center">{error}</p>
          </Card>
        )}
      </div>

      <div className="px-4 mt-3 pb-20 flex-1 overflow-y-auto space-y-1.5">
        {prayerTimes &&
          Object.entries(prayerTimes)
            .filter(([name]) => ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(name))
            .map(([name, time]) => {
              const Icon = prayerIcons[name as keyof typeof prayerIcons]
              const isNext = name === nextPrayer

              return (
                <Card
                  key={name}
                  className={`transition-all ${
                    isNext
                      ? "bg-primary/90 text-primary-foreground shadow-lg border-primary scale-[1.01]"
                      : "bg-card hover:shadow-md border-border"
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className={`p-2 rounded-lg ${isNext ? "bg-white/20" : "bg-primary/10"}`}>
                          <Icon className={`w-4 h-4 ${isNext ? "text-white" : "text-primary"}`} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-sm">{t(name.toLowerCase() as TranslationKey)}</h3>
                        {isNext && <p className="text-[10px] mt-0.5 text-white/80">{t("nextPrayer")}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">{formatTime(time)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
      </div>
    </div>
  )
}
