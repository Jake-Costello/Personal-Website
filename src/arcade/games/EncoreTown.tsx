import type { RefObject } from 'react';
import { ENCOUNTERS, WORLDS, encounterAt, venueOptions } from './deckbuilder-model';
import type { Run } from './deckbuilder-model';
import { VenueArt } from './EncoreArt';

export default function EncoreTown({
  run,
  active,
  onChoose,
  buttons,
}: {
  run: Run;
  active: boolean;
  onChoose: (index: number) => void;
  buttons: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const battle = encounterAt(run);
  const start = (battle.world - 1) * 3;
  const floors = battle.final ? [9] : [start, start + 1, start + 2];
  return (
    <>
      <ol className="db-districts" aria-label="Town tour">
        {[...WORLDS, 'Crown Hall'].map((name, i) => {
          const current = battle.final ? i === 3 : i === battle.world - 1;
          const cleared = battle.final ? i < 3 : i < battle.world - 1;
          return (
            <li key={name} aria-current={current ? 'step' : undefined} data-cleared={cleared}>
              <span>{cleared ? '✓' : String(i + 1).padStart(2, '0')}</span>
              {name}
            </li>
          );
        })}
      </ol>
      <div
        className={`db-town ${battle.final ? 'db-town-finale' : ''}`}
        role="group"
        aria-label={`${battle.final ? 'Crown Hall' : WORLDS[battle.world - 1]} street map`}
      >
        <svg
          className="db-town-drawing"
          viewBox="0 0 900 350"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="db-town-river" d="M-30 320C180 235 205 393 411 302S664 347 930 269" />
          <g className="db-town-blocks" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m13 17 94 0v54H13zm267 6h72v47h-72zm239 0h87v51h-87zm227 0h91v45h-91zM8 259h75v31H8zm305 36h62v31h-62zm244-41h65v46h-65zm249-36h72v48h-72z" />
            <path d="m20 24 78 0m-78 8h78m-78 8h78m-78 8h78m183-19h57m-57 8h57m182-7h74m-74 9h74m-74 9h74m154-18h78m-78 8h78m-78 8h78" />
            <path d="M89 140h43m-33-11v22m-10-8 20-5M609 170h48m-32-10v22m170-17h45m-32-10v22" />
          </g>
          {!battle.final && (
            <>
              <path
                className="db-town-road-border"
                d="M-20 175H75Q100 175 111 131L145 92Q180 65 213 92L409 90Q450 90 450 145V205Q450 250 409 250L213 257Q160 274 145 236L111 204Q100 175 75 175M450 175H760Q800 175 930 103"
              />
              <path
                className="db-town-road"
                d="M-20 175H75Q100 175 111 131L145 92Q180 65 213 92L409 90Q450 90 450 145V205Q450 250 409 250L213 257Q160 274 145 236L111 204Q100 175 75 175M450 175H760Q800 175 930 103"
              />
              <path
                className="db-town-route-line"
                d="M180 92 450 92 738 175M180 255 450 255 738 175M180 92 450 255M180 255 450 92"
              />
            </>
          )}
          {battle.final && (
            <>
              <path className="db-town-road-border" d="M0 260 450 160 900 260" />
              <path className="db-town-road" d="M0 260 450 160 900 260" />
              <path className="db-town-route-line" d="M0 260 450 160 900 260" />
            </>
          )}
          <text x="28" y="330">
            BELLWETHER
          </text>
          <text x="570" y="333" className="db-town-street">
            {battle.final
              ? 'CROWN AVENUE'
              : battle.world === 1
                ? 'JUNIPER STREET'
                : battle.world === 2
                  ? 'MOTOR ROW'
                  : 'LANTERN DISTRICT'}
          </text>
        </svg>
        {floors.flatMap((floor, stop) =>
          venueOptions(floor).map((venue, index) => {
            const available = floor === run.floor;
            const cleared = floor < run.floor;
            const chosen = run.route[floor] === index;
            const x = battle.final ? 50 : [20, 50, 82][stop];
            const y = venue.boss ? 49 : index === 0 ? 29 : 73;
            return (
              <button
                key={`${floor}-${index}`}
                className="db-town-node"
                style={{ left: `${x}%`, top: `${y}%` }}
                disabled={!active || !available}
                aria-label={`${venue.venue}. ${venue.boss ? 'Boss: ' : ''}${venue.name}. ${venue.hp} HP.${cleared ? (chosen ? ' Played.' : ' Not visited.') : !available ? ' Locked.' : ''}`}
                aria-pressed={available ? chosen : undefined}
                data-selected={available && chosen}
                data-cleared={cleared && chosen}
                data-bypassed={cleared && !chosen}
                data-available={available}
                ref={(el) => {
                  if (available) buttons.current[index] = el;
                }}
                onFocus={() => {
                  if (available) onChoose(index);
                }}
                onClick={() => onChoose(index)}
              >
                <VenueArt world={venue.world} boss={venue.boss} final={venue.final} />
                <span>{venue.venue}</span>
                <small>
                  {cleared
                    ? chosen
                      ? 'PLAYED'
                      : 'PASSED'
                    : available
                      ? chosen
                        ? 'SELECTED'
                        : 'CHOOSE SHOW'
                      : venue.boss
                        ? 'BOSS'
                        : 'LOCKED'}
                </small>
              </button>
            );
          }),
        )}
      </div>
      <div className="db-next-show" aria-live="polite" aria-atomic="true">
        <span>{battle.boss ? 'BOSS SHOW' : `SHOW ${(run.floor % 3) + 1} OF 3`}</span>
        <b>{battle.venue}</b>
        <p>
          {battle.name} · {battle.hp} HP · First intent:{' '}
          {battle.intents[0].damage ? `Attack ${battle.intents[0].damage}` : ''}
          {battle.intents[0].damage && battle.intents[0].block ? ' + ' : ''}
          {battle.intents[0].block ? `Block ${battle.intents[0].block}` : ''}
        </p>
      </div>
      <p className="db-note">
        {ENCOUNTERS[run.floor].boss
          ? 'The streets meet here. Win to open the next district.'
          : 'Choose either open building. Each show has a different opponent and attack rhythm.'}
      </p>
    </>
  );
}
