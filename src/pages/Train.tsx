import { ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { EXERCISE_ICONS, SkillIcon } from '../components/icons';
import { Field, PageHeader, Segmented } from '../components/ui';
import { clampLevel, defaultVariant, exercisesForSkill, getExercise, isExerciseId } from '../exercises/registry';
import { SKILL_NAMES, SKILLS, type Skill } from '../exercises/types';
import { recommendations, skillProgress } from '../progress/stats';
import { goBack, href, navigate } from '../router';
import { useAppData } from '../storage/store';

const ORDER: Skill[] = ['intervalos', 'acordes', 'escalas', 'ritmo', 'ditado', 'harmonia', 'alturas'];
const SHORT: Partial<Record<Skill, string>> = { alturas: 'Fundamentos' };

export function Train() {
  const data = useAppData();
  const recs = recommendations(data.attempts, 3);
  return (
    <div className="stack">
      <h1 className="title-lg page-title">Treinar</h1>
      <div className="skill-grid">
        {ORDER.map((skill) => {
          const p = skillProgress(data.attempts, skill);
          return (
            <a key={skill} className="skill-card tap" href={href(`treinar/${skill}`)}>
              <SkillIcon skill={skill} size={22} />
              <span className="skill-card__name">{SHORT[skill] ?? SKILL_NAMES[skill]}</span>
              <span className="chip">Nível {p.level}</span>
            </a>
          );
        })}
        <a className={`skill-card tap${recs.length ? '' : ' list-row--disabled'}`} href={recs.length ? href('sessao?r=1') : undefined} aria-disabled={!recs.length}>
          <span className="skill-icon">
            <RotateCcw size={22} />
          </span>
          <span className="skill-card__name">Revisão</span>
          <span className={`chip ${recs.length ? 'chip--warning' : 'chip--neutral'}`}>{recs.length ? `${recs.length} ite${recs.length > 1 ? 'ns' : 'm'}` : 'Sem erros'}</span>
        </a>
      </div>
    </div>
  );
}

export function SkillPage({ skill }: { skill: string }) {
  if (!(SKILLS as string[]).includes(skill)) return <p className="empty">Competência não encontrada.</p>;
  const s = skill as Skill;
  const defs = exercisesForSkill(s);
  return (
    <div className="stack">
      <PageHeader title={SHORT[s] ?? SKILL_NAMES[s]} onBack={() => goBack('treinar')} />
      <div className="card card--flush list">
        {defs.map((d) => {
          const Icon = EXERCISE_ICONS[d.icon];
          const lv = d.levels.length > 1 ? `Níveis ${d.levels[0]}–${d.levels[d.levels.length - 1]}` : `Nível ${d.levels[0]}`;
          return (
            <a key={d.id} className="list-row" href={href(`treinar/${s}/${d.id}`)}>
              <span className="skill-icon">
                <Icon size={20} />
              </span>
              <span className="list-row__main">
                <span className="list-row__title" style={{ display: 'block' }}>
                  {d.title}
                </span>
                <span className="list-row__sub">{lv}</span>
              </span>
              <ChevronRight size={18} className="chev" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function TrainSetup({ skill, type }: { skill: string; type: string }) {
  const data = useAppData();
  if (!isExerciseId(type)) return <p className="empty">Exercício não encontrado.</p>;
  return <Setup key={type} typeId={type} skill={skill} defaultCount={data.settings.questionCount} userLevel={skillProgress(data.attempts, getExercise(type).skill).level} />;
}

function Setup({ typeId, skill, defaultCount, userLevel }: { typeId: Parameters<typeof getExercise>[0]; skill: string; defaultCount: number; userLevel: number }) {
  const def = getExercise(typeId);
  const [level, setLevel] = useState(() => clampLevel(def, userLevel));
  const [variant, setVariant] = useState<Record<string, string>>(() => defaultVariant(def, clampLevel(def, userLevel)));
  const [count, setCount] = useState(() => ([5, 10, 20].includes(defaultCount) ? defaultCount : 10));
  const Icon = EXERCISE_ICONS[def.icon];

  const start = () => {
    const v = Object.entries(variant)
      .map(([k, val]) => `${k}:${val}`)
      .join(',');
    navigate(`sessao?t=${def.id}&l=${level}&n=${count}${v ? `&v=${encodeURIComponent(v)}` : ''}`);
  };

  return (
    <div className="stack">
      <PageHeader title={def.title} onBack={() => goBack(`treinar/${skill}`)} />
      <div className="row">
        <span className="skill-icon skill-icon--solid tint-blue" style={{ width: 52, height: 52, borderRadius: 16 }}>
          <Icon size={26} />
        </span>
        <p className="muted" style={{ flex: 1 }}>
          {def.help}
        </p>
      </div>
      <div className="card stack">
        {def.levels.length > 1 && (
          <Field label="Nível">
            <Segmented
              label="Nível"
              value={level}
              options={def.levels.map((l) => ({ value: l, label: String(l) }))}
              onChange={(l) => {
                setLevel(l);
                setVariant(defaultVariant(def, l));
              }}
            />
          </Field>
        )}
        {(def.variants ?? []).map((v) => (
          <Field key={v.key} label={v.label}>
            <Segmented label={v.label} value={variant[v.key]} options={v.choices} onChange={(val) => setVariant((cur) => ({ ...cur, [v.key]: val }))} />
          </Field>
        ))}
        <Field label="Questões">
          <Segmented label="Questões" value={count} options={[5, 10, 20].map((n) => ({ value: n, label: String(n) }))} onChange={setCount} />
        </Field>
      </div>
      <button type="button" className="btn btn--primary btn--block" onClick={start}>
        Começar <ChevronRight size={20} />
      </button>
    </div>
  );
}
