import * as React from "react"
import { useTheme } from "next-themes"

import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [_, startTransition] = React.useTransition()

    // NOTE: This is a workaround for a bug in next-themes
    // See: https://github.com/pacocoursey/next-themes/issues/169 & https://github.com/pacocoursey/next-themes/pull/171
    // TODO: Fix this when the bug has been resolved
    const [mounted, setMounted] = React.useState(false)
    // // useEffect only runs on the client, so now we can safely show the UI
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <Button
            className="w-9 h-9 p-2 bg-background hover:bg-accent rounded-md flex items-center justify-center border border-border"
            onClick={() => {
                startTransition(() => {
                    setTheme(theme == "light" ? "dark" : "light")
                })
            }}
        >
            {!theme ? null : theme == "dark" ? (
                <Moon className="h-5 w-5 transition-all" />
            ) : (
                <Sun className="h-5 w-5 transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
