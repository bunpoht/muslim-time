"use client"

import { useState, useEffect } from "react"
import { Home, Compass, Settings } from "lucide-react"
import PrayerTimesTab from "@/components/prayer-times-tab"
import QiblaTab from "@/components/qibla-tab"
import SettingsTab from "@/components/settings-tab"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

type Tab = "home" | "qibla" | "settings"

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [language, setLanguage] = useState<Language>("en")
  const [timeFormat, setTimeFormat] = useState<"12" | "24">("12")

  const t = (key: TranslationKey) => translations[language][key]

  useEffect(() => {
    // Check for saved preferences
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    const savedLanguage = (localStorage.getItem("language") || "en") as Language
    const savedTimeFormat = (localStorage.getItem("timeFormat") || "12") as "12" | "24"

    setIsDarkMode(savedDarkMode)
    setLanguage(savedLanguage)
    setTimeFormat(savedTimeFormat)

    if (savedDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem("darkMode", String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const handleTimeFormatChange = (format: "12" | "24") => {
    setTimeFormat(format)
    localStorage.setItem("timeFormat", format)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Content */}
      <div className="h-full">
        {activeTab === "home" && <PrayerTimesTab language={language} timeFormat={timeFormat} />}
        {activeTab === "qibla" && <QiblaTab language={language} />}
        {activeTab === "settings" && (
          <SettingsTab
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            language={language}
            onLanguageChange={handleLanguageChange}
            timeFormat={timeFormat}
            onTimeFormatChange={handleTimeFormatChange}
          />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 py-3 px-6 transition-colors ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">{t("prayerTimes")}</span>
          </button>
          <button
            onClick={() => setActiveTab("qibla")}
            className={`flex flex-col items-center gap-1 py-3 px-6 transition-colors ${
              activeTab === "qibla" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="w-6 h-6" />
            <span className="text-xs font-medium">{t("qibla")}</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 py-3 px-6 transition-colors ${
              activeTab === "settings" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">{t("settings")}</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
