import { Heart, Shield, Target, Zap } from 'lucide-react';

export const metadata = {
  title: 'About',
  description:
    'Learn about PAK CRICZONE — your home for live cricket scores, PSL fixtures, teams, players and in-depth statistics.',
};

const values = [
  {
    icon: Zap,
    title: 'Real-Time Coverage',
    text: 'Ball-by-ball updates, live scores and instant match alerts so you never miss a moment.',
  },
  {
    icon: Shield,
    title: 'Trusted Data',
    text: 'Accurate statistics, verified results and comprehensive player profiles you can rely on.',
  },
  {
    icon: Target,
    title: 'Deep Analysis',
    text: 'Expert match reports, tactical breakdowns and statistical insights beyond the surface.',
  },
  {
    icon: Heart,
    title: 'For Fans',
    text: 'Built by cricket lovers, for cricket lovers. Every feature designed with the fan experience in mind.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">
            About PAK CRICZONE
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stext">
            PAK CRICZONE is your ultimate destination for cricket coverage in Pakistan and beyond.
            From live ball-by-ball scores and PSL 2026 fixtures to in-depth player profiles and
            historical statistics, we bring the game closer to you.
          </p>
          <p className="mt-3 text-base leading-relaxed text-stext">
            Our mission is to provide fans with fast, accurate and beautifully presented cricket
            information — whether you&apos;re following the Pakistan Super League, international series
            or domestic tournaments.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl bg-card p-6 ring-1 ring-lborder"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <v.icon size={20} />
              </div>
              <h3 className="text-base font-bold text-mtext">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stext">{v.text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
          <h2 className="text-lg font-bold text-mtext">Our Story</h2>
          <p className="mt-3 text-sm leading-relaxed text-stext">
            PAK CRICZONE was created to fill the gap for a dedicated, fan-first cricket platform
            focused on Pakistani cricket. Starting with PSL 2026 coverage, we aim to expand into
            full international cricket reporting, fantasy insights and community features.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stext">
            Every run, every ball, every wicket — live and at your fingertips.
          </p>
        </div>
      </div>
    </div>
  );
}
