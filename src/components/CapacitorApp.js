'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'

export default function CapacitorApp() {
  const router = useRouter()

  useEffect(() => {
    const setupBackButton = async () => {
      try {
        await App.addListener('backButton', () => {
          const path = window.location.pathname;
          // If at the login screen, or main dashboard screens, exit the app.
          if (path === '/' || path === '/admin/' || path === '/admin' || path === '/engineer-portal/' || path === '/engineer-portal') {
            App.exitApp();
          } else {
            // If deeper in the app (like editing an employee), go back one step!
            router.back();
          }
        });
      } catch (err) {
        // Safe fail if running on web instead of mobile
      }
    }

    setupBackButton()

    return () => {
      try {
        App.removeAllListeners()
      } catch(e) {}
    }
  }, [router])

  return null
}
