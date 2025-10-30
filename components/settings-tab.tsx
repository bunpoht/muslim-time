"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Globe, Calculator, Bell, Clock, Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface SettingsTabProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
  language: Language
  onLanguageChange: (lang: Language) => void
  timeFormat: "12" | "24"
  onTimeFormatChange: (format: "12" | "24") => void
}

export default function SettingsTab({
  isDarkMode,
  toggleDarkMode,
  language,
  onLanguageChange,
  timeFormat,
  onTimeFormatChange,
}: SettingsTabProps) {
  const [calculationMethod, setCalculationMethod] = useState("2")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    const savedMethod = localStorage.getItem("calculationMethod") || "2"
    const savedNotifications = localStorage.getItem("notifications") === "true"

    setCalculationMethod(savedMethod)
    setNotificationsEnabled(savedNotifications)
  }, [])

  const handleLanguageChange = (lang: Language) => {
    onLanguageChange(lang)
    showSavedIndicator()
  }

  const handleTimeFormatChange = (format: "12" | "24") => {
    onTimeFormatChange(format)
    showSavedIndicator()
  }

  const handleMethodChange = (method: string) => {
    setCalculationMethod(method)
    localStorage.setItem("calculationMethod", method)
    localStorage.removeItem("cachedPrayerTimes")
    localStorage.removeItem("lastFetchDate")
    showSavedIndicator()
  }

  const showSavedIndicator = () => {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      if (!("Notification" in window)) {
        alert("This browser does not support notifications")
        return
      }

      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        setNotificationsEnabled(true)
        localStorage.setItem("notifications", "true")
        showSavedIndicator()
      }
    } else {
      setNotificationsEnabled(false)
      localStorage.setItem("notifications", "false")
      showSavedIndicator()
    }
  }

  const languages = [
    { code: "en" as Language, name: "English" },
    { code: "ar" as Language, name: "العربية" },
    { code: "th" as Language, name: "ไทย" },
  ]

  const calculationMethods = [
    { code: "1", name: "University of Islamic Sciences, Karachi" },
    { code: "2", name: "Islamic Society of North America (ISNA)" },
    { code: "3", name: "Muslim World League (MWL)" },
    { code: "4", name: "Umm Al-Qura University, Makkah" },
    { code: "5", name: "Egyptian General Authority of Survey" },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t("settings")}</h1>
          {showSaved && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
        </div>

        {/* Appearance */}
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <div>
                <Label htmlFor="dark-mode" className="text-base font-semibold">
                  {t("darkMode")}
                </Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </Card>

        {/* Language */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <Label className="text-base font-semibold">{t("language")}</Label>
              <p className="text-sm text-muted-foreground">Select your preferred language</p>
            </div>
          </div>
          <div className="space-y-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={language === lang.code ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.name}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <Label className="text-base font-semibold">{t("timeFormat")}</Label>
              <p className="text-sm text-muted-foreground">Choose time display format</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant={timeFormat === "12" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleTimeFormatChange("12")}
            >
              {t("format12")}
            </Button>
            <Button
              variant={timeFormat === "24" ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleTimeFormatChange("24")}
            >
              {t("format24")}
            </Button>
          </div>
        </Card>

        {/* Calculation Method */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-5 h-5 text-primary" />
            <div>
              <Label className="text-base font-semibold">{t("calculationMethod")}</Label>
              <p className="text-sm text-muted-foreground">Prayer time calculation method</p>
            </div>
          </div>
          <div className="space-y-2">
            {calculationMethods.map((method) => (
              <Button
                key={method.code}
                variant={calculationMethod === method.code ? "default" : "outline"}
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => handleMethodChange(method.code)}
              >
                <span className="text-sm leading-relaxed">{method.name}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Prayer times will update when you return to the Prayer Times tab
          </p>
        </Card>

        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="notifications" className="text-base font-semibold">
                  {t("notifications")}
                </Label>
                <p className="text-sm text-muted-foreground">Get notified for prayer times</p>
              </div>
            </div>
            <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
        </Card>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Muslim Prayer Times v1.0</p>
          <p className="mt-1">Made with ❤️ for the Muslim community</p>
        </div>
      </div>
    </div>
  )
}
