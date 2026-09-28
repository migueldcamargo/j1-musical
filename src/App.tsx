import { useEffect } from 'react';
import { BottomNav, Sidebar, type Area } from './components/Nav';
import { ExamResult, ExamRun, Exams, ExamSetup } from './pages/Exams';
import { Home } from './pages/Home';
import { Learn, ModulePage } from './pages/Learn';
import { History, Profile } from './pages/Profile';
import { Session } from './pages/Session';
import { SkillPage, Train, TrainSetup } from './pages/Train';
import { useRoute, type Route } from './router';
import { useAppData } from './storage/store';

function resolve(route: Route): { area: Area; immersive: boolean; page: React.ReactNode } {
  const [a, b, c] = route.path;
  switch (a) {
    case 'aprender':
      return { area: 'aprender', immersive: false, page: b ? <ModulePage id={b} /> : <Learn /> };
    case 'treinar':
      return { area: 'treinar', immersive: false, page: c ? <TrainSetup skill={b} type={c} /> : b ? <SkillPage skill={b} /> : <Train /> };
    case 'sessao':
      return { area: 'treinar', immersive: true, page: <Session route={route} /> };
    case 'simulados':
      if (b === 'novo') return { area: 'simulados', immersive: false, page: <ExamSetup /> };
      if (b === 'prova') return { area: 'simulados', immersive: true, page: <ExamRun /> };
      return { area: 'simulados', immersive: false, page: b ? <ExamResult id={b} /> : <Exams /> };
    case 'perfil':
      return { area: 'perfil', immersive: false, page: b === 'historico' ? <History /> : <Profile /> };
    default:
      return { area: 'inicio', immersive: false, page: <Home /> };
  }
}

export function App() {
  const route = useRoute();
  const { settings } = useAppData();
  const { area, immersive, page } = resolve(route);

  // Safari (iOS) ignora touch-action para pinça: bloqueia o gesto só fora da partitura.
  useEffect(() => {
    if (settings.allowPageZoom) return;
    const block = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest('.score-zoom')) e.preventDefault();
    };
    document.addEventListener('gesturestart', block);
    return () => document.removeEventListener('gesturestart', block);
  }, [settings.allowPageZoom]);

  return (
    <div className={`app${immersive ? ' app--immersive' : ''}${settings.allowPageZoom ? '' : ' app--no-pinch'}`}>
      <Sidebar active={area} />
      <main className="main" key={route.raw}>
        {page}
      </main>
      <BottomNav active={area} />
    </div>
  );
}
