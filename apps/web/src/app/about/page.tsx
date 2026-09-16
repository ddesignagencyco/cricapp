import { AboutValues } from '../../components/AboutValues';
import EditorialDocument from '../../components/EditorialDocument';
import EditorialLayout from '../../components/EditorialLayout';
import { fetchEditorialPage } from '../../services/editorial';

export const metadata = {
  title: 'About',
  description:
    'Learn about PAK CRICZONE — your home for live cricket scores, PSL fixtures, teams, players and in-depth statistics.',
};

export default async function AboutPage() {
  const cms = await fetchEditorialPage('about').catch(() => null);
  if (cms?.content?.trim()) return <EditorialDocument page={cms} />;

  return (
    <EditorialLayout
      title="About PAK CRICZONE"
      slug="about"
      intro="Your home for live cricket scores, PSL fixtures, teams, players and in-depth analysis — built for fans who follow every ball."
    >
      <p>
        PAK CRICZONE is your destination for cricket coverage in Pakistan and beyond. From live
        ball-by-ball scores and PSL fixtures to player profiles and historical statistics, we bring
        the game closer to you.
      </p>
      <p>
        Our mission is to provide fans with fast, accurate and clearly presented cricket information
        — whether you are following the Pakistan Super League, international series or domestic
        tournaments.
      </p>

      <h2 id="what-we-stand-for">What we stand for</h2>
      <div className="not-prose my-6">
        <AboutValues />
      </div>

      <h2 id="our-story">Our story</h2>
      <p>
        PAK CRICZONE was created to fill the gap for a dedicated, fan-first cricket platform focused
        on Pakistani cricket. Starting with PSL coverage, we aim to expand into full international
        reporting, fantasy insights and community features.
      </p>
      <p>Every run, every ball, every wicket — live and at your fingertips.</p>
    </EditorialLayout>
  );
}
