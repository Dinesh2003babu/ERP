export const dynamic = "force-static";

export default function manifest() {
  return {
    name: 'PS Infra Construction ERP',
    short_name: 'Civil ERP',
    description: 'Manage labor, attendance, and site costs efficiently.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0ea5e9',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
