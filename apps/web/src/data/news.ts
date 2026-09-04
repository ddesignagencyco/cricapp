import { NewsArticle } from '../types/index';

export const news: NewsArticle[] = [
  {
    id: 'n1',
    title: 'Fakhar Zaman blitz guides Lahore Qalandars to a crucial victory',
    category: 'Match Report',
    type: 'featured',
    date: '2026-08-29',
    tag: 'PSL 2026',
    author: 'CricZone Desk',
    readTime: '4 min read',
    excerpt:
      'Fakhar Zaman struck a magnificent 82 off just 47 deliveries as Lahore Qalandars chased down 163 with plenty to spare, keeping their playoff hopes alive in a thrilling PSL encounter at Gaddafi Stadium.',
    content: `Fakhar Zaman played the innings of the season so far, smashing 82 from 47 balls with six fours and four sixes, as Lahore Qalandars cruised to a five-wicket victory over Karachi Kings in PSL 2026.

Chasing a modest target of 163, the Qalandars lost Jason Roy early but Fakhar anchored the chase with a masterclass of aggressive, calculated batting. Abdullah Shafique provided ideal support with a composed 41.

With the win, the Qalandars move level on points with Islamabad United at the top of the table, setting up a fascinating final stretch of the league stage.`,
    image: 'https://images.pexels.com/photos/2799556/pexels-photo-2799556.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-yellow-600 to-green-700',
    relatedMatchId: 'm1',
    relatedTeams: ['lahore-qalandars', 'karachi-kings'],
  },
  {
    id: 'n2',
    title: 'Shaheen returns to form with three-wicket haul in Karachi Kings clash',
    category: 'Match Report',
    type: 'standard',
    date: '2026-08-29',
    tag: 'PSL 2026',
    author: 'CricZone Reporter',
    readTime: '3 min read',
    excerpt:
      'The speedster looked back to his fearsome best, delivering a probing spell of swing bowling that dismantled the Karachi Kings top order and set up a crucial Qalandars win.',
    content: `Shaheen Afridi answered his critics with a fiery performance, finishing with figures of 3/34 in four overs as the Qalandars restricted Karachi Kings to 162/8.

The left-arm quick was particularly effective with the new ball, moving it both ways and unsettling a batting lineup known for its explosive power. His double strike in the middle overs proved decisive.`,
    image: 'https://images.pexels.com/photos/3800517/pexels-photo-3800517.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-cyan-600 to-blue-700',
    relatedMatchId: 'm1',
    relatedTeams: ['lahore-qalandars', 'karachi-kings'],
  },
  {
    id: 'n3',
    title: 'Peshawar Zalmi storm into playoff contention with dominant win',
    category: 'Match Report',
    type: 'standard',
    date: '2026-08-27',
    tag: 'PSL 2026',
    author: 'CricZone Desk',
    readTime: '4 min read',
    excerpt:
      `Shan Masood produced a captain's innings of 92, driving Peshawar Zalmi to a crushing 41-run victory and reviving their playoff charge in the Pakistan Super League.`,
    content: `Shan Masood led from the front with a stunning 92 off just 58 deliveries, powering Peshawar Zalmi to a commanding 191/5 against Quetta Gladiators in Rawalpindi.

In reply, the Gladiators never really threatened the chase and were bundled out for 150, handing Zalmi a comprehensive 41-run win that keeps their postseason hopes very much alive.`,
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-amber-500 to-orange-700',
    relatedMatchId: 'm3',
    relatedTeams: ['peshawar-zalmi', 'quetta-gladiators'],
  },
  {
    id: 'n4',
    title: 'PSL 2026: Points table tightens as league stage reaches climax',
    category: 'PSL News',
    type: 'standard',
    date: '2026-08-28',
    tag: 'PSL 2026',
    author: 'CricZone Analytics',
    readTime: '5 min read',
    excerpt:
      'With just a handful of matches remaining, the race for the Playoffs has never been tighter. Four teams are separated by just a couple of points heading into the business end of the season.',
    content: `The PSL 2026 league stage is building towards a blockbuster conclusion, with Lahore Qalandars and Islamabad United locked on 14 points each at the summit.

Karachi Kings and Peshawar Zalmi are hot on their heels on 12 points, while Multan Sultans and Quetta Gladiators face an uphill battle to stay in contention. Every remaining match now carries enormous significance.`,
    image: 'https://images.pexels.com/photos/9153466/pexels-photo-9153466.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-purple-600 to-indigo-700',
    relatedTeams: ['lahore-qalandars', 'islamabad-united', 'karachi-kings', 'peshawar-zalmi'],
  },
  {
    id: 'n5',
    title: 'Rizwan, Munro form formidable opening partnership for Multan Sultans',
    category: 'Team News',
    type: 'standard',
    date: '2026-08-26',
    tag: 'PSL 2026',
    author: 'CricZone Reporter',
    readTime: '3 min read',
    excerpt:
      'The Multan Sultans opening pair has been the most consistent in the tournament, and their latest stand guided the Sultans to a crucial 21-run win over the Quetta Gladiators.',
    content: `Mohammad Rizwan and Colin Munro have formed a devastating opening combination, and the pair once again laid the platform as Multan Sultans posted 201/6 en route to a 21-run victory.

Munro is aggressive strokeplay early complemented Rizwan stability, manufacturing a platform that the middle order exploited to the full in a top-class team showing.`,
    image: 'https://images.pexels.com/photos/24394759/pexels-photo-24394759.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-emerald-600 to-teal-700',
    relatedMatchId: 'm6',
    relatedTeams: ['multan-sultans', 'quetta-gladiators'],
  },
  {
    id: 'n6',
    title: 'England, Australia set for high-octane T20 series under lights',
    category: 'International',
    type: 'standard',
    date: '2026-08-30',
    tag: 'International T20',
    author: 'CricZone International',
    readTime: '4 min read',
    excerpt:
      "Two of world cricket's biggest rivals lock horns in a three-match T20 series, with both sides boasting fearsome batting lineups and world-class pace attacks.",
    content: `England and Australia renew their storied rivalry in a three-match T20 series beginning at Lord's, with both sides in fine form and desperate to build momentum heading into the next major global tournament.

The series is set to showcase some of the most explosive batting talent in world cricket, with both teams possessing genuine match-winners at the top of the order.`,
    image: 'https://images.pexels.com/photos/28758998/pexels-photo-28758998.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-red-600 to-rose-700',
    relatedMatchId: 'm8',
    relatedTeams: ['england', 'australia'],
  },
  {
    id: 'n7',
    title: 'Top batters aim to finish PSL 2026 as leading run-scorer',
    category: 'Statistics',
    type: 'standard',
    date: '2026-08-29',
    tag: 'PSL 2026',
    author: 'CricZone Analytics',
    readTime: '3 min read',
    excerpt:
      "A fascinating battle for the golden run-scorer crown is unfolding, with several of PSL's premier batters within touching distance of the top spot heading into the final week of the league.",
    content: `The race for the PSL 2026 batting title is one of the tightest in recent memory, with the tournament's premier run-getters separated by the smallest of margins.

Several big names remain in contention, and with crucial matches still to play, the battle promises to go down to the very last ball.`,
    image: 'https://images.pexels.com/photos/31131697/pexels-photo-31131697.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-orange-500 to-red-600',
    relatedTeams: ['lahore-qalandars', 'multan-sultans'],
  },
  {
    id: 'n8',
    title: 'Wicket story: Which PSL 2026 bowlers are leading the charts?',
    category: 'Statistics',
    type: 'standard',
    date: '2026-08-27',
    tag: 'PSL 2026',
    author: 'CricZone Analytics',
    readTime: '3 min read',
    excerpt:
      'We break down the bowlers leading the wickets column this season, and why their accuracy and control have been the key to their success in PSL 2026.',
    content: `Bowlers continue to outshine batsmen in certain key moments of PSL 2026, and those with unerring accuracy and clever variations have consistently held the upper hand.

From express pace to artful spin, the wicket-takers charts provide a fascinating snapshot of the tournament bowling talent.`,
    image: 'https://images.pexels.com/photos/30678437/pexels-photo-30678437.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageGradient: 'from-sky-600 to-blue-800',
    relatedTeams: ['lahore-qalandars', 'karachi-kings'],
  },
];

export default news;
