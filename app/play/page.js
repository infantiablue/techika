import Game from './game';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const metadata = {
  title: 'Hearth & Horizon — A little Greek island',
  description: 'Wander a sunlit Greek village, explore ancient ruins, and follow the coast in a small Three.js game.',
  alternates: { canonical: '/play/' },
  robots: { index: false, follow: false },
};

export default function PlayPage() {
  const bakeryUrl=['/play-assets/bakery.glb','/play-assets/bakery/scene.gltf'].find(url=>existsSync(path.join(process.cwd(),'public',url)))||null;
  return <Game bakeryUrl={bakeryUrl} />;
}
