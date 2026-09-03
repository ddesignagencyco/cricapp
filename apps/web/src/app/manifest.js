export default function manifest() {
  return {
    name: 'PAK CRICZONE',
    short_name: 'PAK CRICZONE',
    description: 'Cricket live scores, PSL fixtures, teams, players and statistics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07111F',
    theme_color: '#07111F',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}