import { useId } from 'react';
import type { CharacterKey, Encounter } from './deckbuilder-model';

type Look = {
  cape?: boolean;
  signature?: 'crescent' | 'double';
  skin: string;
  hair: string;
  coat: string;
  trousers: string;
  cut: 'crop' | 'spikes' | 'long' | 'puff' | 'hat';
  instrument: 'guitar' | 'bass' | 'mic' | 'drums' | 'keys';
  pose: number;
  detail: string;
};
const LOOKS: Record<CharacterKey, Look> = {
  moth: {
    skin: '#d79b76',
    hair: '#242031',
    coat: '#d75448',
    trousers: '#252d3b',
    cut: 'spikes',
    instrument: 'guitar',
    pose: -9,
    detail: 'a red patched jacket, spiked hair and a battered white guitar',
  },
  penny: {
    skin: '#9f654e',
    hair: '#ede5cd',
    coat: '#333649',
    trousers: '#d95b49',
    cut: 'long',
    instrument: 'bass',
    pose: 8,
    detail: 'a white undercut, striped trousers and a long-necked bass',
  },
  wires: {
    skin: '#edbd91',
    hair: '#b85635',
    coat: '#e8dfbe',
    trousers: '#3c4243',
    cut: 'puff',
    instrument: 'keys',
    pose: -4,
    detail: 'round orange hair, a cream shirt and a homemade keyboard',
  },
  june: {
    skin: '#ac7557',
    hair: '#282235',
    coat: '#b3b979',
    trousers: '#e3d6b8',
    cut: 'hat',
    instrument: 'drums',
    pose: 5,
    detail: 'a bucket hat, green workwear and a little red drum kit',
  },
  static: {
    skin: '#c38a65',
    hair: '#e6dec9',
    coat: '#d25445',
    trousers: '#262537',
    cut: 'spikes',
    instrument: 'mic',
    pose: -8,
    detail: 'a towering white mohawk, red coat and a microphone wound in cable',
  },
  rivet: {
    skin: '#8d5d4c',
    hair: '#242f37',
    coat: '#df883a',
    trousers: '#344f59',
    cut: 'crop',
    instrument: 'guitar',
    pose: 8,
    detail: 'orange workwear, rolled sleeves and a sharp blue guitar',
  },
  axle: {
    skin: '#e4ac80',
    hair: '#3b2c28',
    coat: '#3d8990',
    trousers: '#283a45',
    cut: 'hat',
    instrument: 'bass',
    pose: -7,
    detail: 'a trucker cap, blue work shirt and an orange bass',
  },
  fuse: {
    skin: '#d5a07e',
    hair: '#c65a35',
    coat: '#e7c76c',
    trousers: '#315462',
    cut: 'spikes',
    instrument: 'drums',
    pose: 0,
    detail: 'a red quiff, yellow vest and a wide steel drum kit',
  },
  echo: {
    skin: '#a97c62',
    hair: '#202d3a',
    coat: '#e69444',
    trousers: '#223e50',
    cut: 'long',
    instrument: 'keys',
    pose: 6,
    detail: 'dark braids, an orange jacket and a turquoise synthesizer',
  },
  torque: {
    skin: '#bc805b',
    hair: '#242e36',
    coat: '#e89444',
    trousers: '#264d5b',
    cut: 'hat',
    instrument: 'guitar',
    pose: -8,
    detail: 'two matching mechanics in orange coveralls, playing guitar and bass',
  },
  velvet: {
    cape: true,
    skin: '#a46765',
    hair: '#211c39',
    coat: '#d8a5b9',
    trousers: '#54346e',
    cut: 'puff',
    instrument: 'mic',
    pose: 9,
    detail: 'a high rounded hairstyle, a rose cape and a gold microphone',
  },
  luna: {
    signature: 'crescent',
    skin: '#e4b49b',
    hair: '#503a78',
    coat: '#a7c8bb',
    trousers: '#383563',
    cut: 'long',
    instrument: 'guitar',
    pose: -7,
    detail: 'flowing purple hair, a mint jacket and a crescent-shaped guitar',
  },
  prism: {
    cape: true,
    skin: '#b7816d',
    hair: '#382a54',
    coat: '#d3a457',
    trousers: '#553675',
    cut: 'long',
    instrument: 'mic',
    pose: 4,
    detail: 'a trio of singers in gold, rose and mint capes',
  },
  nova: {
    skin: '#a67063',
    hair: '#e1c29d',
    coat: '#d790ad',
    trousers: '#473768',
    cut: 'spikes',
    instrument: 'keys',
    pose: 6,
    detail: 'star-shaped blond hair, a rose suit and a gold stage keyboard',
  },
  atlas: {
    cape: true,
    signature: 'double',
    skin: '#bc816b',
    hair: '#25203b',
    coat: '#d4ab60',
    trousers: '#563d77',
    cut: 'long',
    instrument: 'guitar',
    pose: -10,
    detail: 'a sweeping gold cape, long dark hair and a double-neck stage guitar',
  },
  maestro: {
    skin: '#c79b80',
    hair: '#ece0b8',
    coat: '#222a47',
    trousers: '#25223f',
    cut: 'hat',
    instrument: 'mic',
    pose: -4,
    detail: 'a tall midnight-blue conductor, gold lapels, a wide hat and a baton',
  },
};

function Instrument({
  kind,
  final,
  signature,
}: {
  kind: Look['instrument'];
  final?: boolean;
  signature?: Look['signature'];
}) {
  if (kind === 'mic')
    return (
      <g>
        <path
          d="M143 129 166 105 171 112 153 141M166 107l-1 111-14 14m14-14 19 13"
          fill="none"
          strokeWidth="5"
        />
        <rect
          x="161"
          y="87"
          width="17"
          height="31"
          rx="8"
          fill="var(--art-light)"
          transform="rotate(20 169 102)"
        />
        <path d="m164 96 11 4m-12 2 10 4m-5 10c-30 23 38 49 4 70" fill="none" strokeWidth="2" />
        {final && <path d="m97 128-30-49m-5-8 8 10" stroke="var(--art-light)" strokeWidth="4" />}
      </g>
    );
  if (kind === 'keys')
    return (
      <g>
        <path d="m67 161 21 70m85-70-22 70M72 231h26m43 0h26" fill="none" strokeWidth="5" />
        <path d="m52 145 138-5 7 29-139 4Z" fill="var(--art-accent)" />
        <path d="m61 158 125-5 2 11-125 5Z" fill="var(--art-light)" strokeWidth="1.5" />
        {[77, 92, 107, 122, 137, 152, 167].map((x) => (
          <path key={x} d={`m${x} 156 1 11`} strokeWidth="3" />
        ))}
        <circle cx="70" cy="148" r="2" fill="var(--art-light)" />
        <circle cx="80" cy="148" r="2" fill="var(--art-light)" />
      </g>
    );
  if (kind === 'drums')
    return (
      <g>
        <path
          d="M59 135v95m-10 0 10-11 10 11m108-95v95m-10 0 10-11 10 11"
          fill="none"
          strokeWidth="3"
        />
        <ellipse cx="59" cy="135" rx="29" ry="5" fill="var(--art-gold)" />
        <ellipse cx="177" cy="135" rx="28" ry="5" fill="var(--art-gold)" />
        <rect x="65" y="153" width="43" height="28" rx="5" fill="var(--art-accent)" />
        <rect x="130" y="151" width="41" height="30" rx="5" fill="var(--art-accent)" />
        <circle cx="120" cy="193" r="39" fill="var(--art-accent)" />
        <circle cx="120" cy="193" r="31" fill="var(--art-light)" />
        <path d="m106 201 14-24 14 24m-22-6h17" fill="none" strokeWidth="3" />
        <path d="m83 126 21 31m48-30-21 28" stroke="var(--art-light)" strokeWidth="4" />
      </g>
    );
  return (
    <g transform={kind === 'bass' ? 'rotate(-9 126 156)' : undefined}>
      {signature === 'double' && (
        <>
          <path d="m113 155 48-84 11 6-47 90" fill="var(--art-light)" />
          <path d="m159 75 6-16 16 9-7 16Z" fill="var(--art-accent)" />
        </>
      )}
      <path d="m132 150 53-75 10 7-54 77" fill="var(--art-light)" />
      <path d="m183 80 7-15 15 10-7 15Z" fill="var(--art-accent)" />
      <path
        d={
          signature === 'crescent'
            ? 'M96 137c-39 10-32 69 6 74 30 5 49-21 34-46-10 31-48 18-40-28Z'
            : 'M111 143c-19-15-34 2-25 18-19 8-17 38 4 42 23 13 43-4 36-23 21-1 22-22 10-27-10 8-19 7-25-10Z'
        }
        fill="var(--art-accent)"
      />
      <path
        d="m105 182 85-103m-80 107 85-103"
        fill="none"
        stroke="var(--art-light)"
        strokeWidth="1.5"
      />
      <path d="m97 187 11 9m12-34 10 7m-17-2 11 8" strokeWidth="4" />
      <circle cx="93" cy="177" r="3" fill="var(--art-gold)" />
    </g>
  );
}
function Performer({
  look,
  final,
  mirrored = false,
}: {
  look: Look;
  final?: boolean;
  mirrored?: boolean;
}) {
  return (
    <g transform={mirrored ? 'translate(240 0) scale(-1 1)' : undefined}>
      <g className="db-performer" transform={`rotate(${look.pose} 120 174)`}>
        {look.cape && (
          <path
            d="M96 92C65 110 77 170 40 214l65-19 25-1 64 27c-31-52-27-101-60-130Z"
            fill={look.coat}
          />
        )}
        {/* Wide stance, patched boots and an angular jacket remain legible at cabinet scale. */}
        <path
          d="m98 169-16 54-16 9 3 12 32-1 18-49 19 45 31 1 3-12-20-10-10-50Z"
          fill={look.trousers}
        />
        <path d="m70 232 28 1m43-4 28 5M105 186l13-11 10 12" fill="none" strokeWidth="2" />
        <path
          d="m99 91-28 17-14 46 17 8 22-28-4 43c19 13 39 11 56-1l-5-44 24 19 13-15-30-34-21-13Z"
          fill={look.coat}
        />
        <path
          d="m99 94 20 30 13-32m-16 28-10 55m18-43 10 37M85 111l-8 30m68-31 12 24"
          fill="none"
          strokeWidth="2.5"
        />
        <path d="m76 143 33 15-5 11-36-13m91-29-22 22 9 10 26-24" fill={look.skin} />
        <path d="m102 77 1 22 16 12 13-17-3-21Z" fill={look.skin} />
        {look.cut === 'long' && (
          <path
            d="M91 48c-7 17-10 39-16 58l23-5 12-24 19 10 19 18c-1-31-1-54-18-65Z"
            fill={look.hair}
          />
        )}
        <path d="M96 51c3-20 43-19 45 5l-5 25-15 12-21-15Z" fill={look.skin} />
        {look.cut === 'spikes' ? (
          <path
            d="m92 62-9-17 15 2-1-18 13 9 7-22 9 19 16-13-1 19 14 2-13 22-4-13-19 1-5 11-9-11Z"
            fill={look.hair}
          />
        ) : look.cut === 'puff' ? (
          <path
            d="M93 62c-18-2-21-20-7-27-2-18 14-26 29-18 12-12 29-2 28 9 21 0 25 24 10 32l-14 7-5-16-22-1-9 16Z"
            fill={look.hair}
          />
        ) : look.cut === 'hat' ? (
          <g>
            <path
              d={final ? 'm94 47 4-34 37-4 8 35Z' : 'm94 48 5-21 35 1 11 22Z'}
              fill={look.hair}
            />
            <path d="m81 50 74-3-1 9-72 3Z" fill={look.hair} />
            <path d="m100 37 35 1" stroke="var(--art-gold)" strokeWidth="5" />
          </g>
        ) : (
          <path d="M95 62c-10-31 36-40 47-14l-4 15-9-15-22 7-5 10Z" fill={look.hair} />
        )}
        <path d="m103 65 7 1m15-2 6-1m-16 17 10-2" fill="none" strokeWidth="2.5" />
        <path d="m119 68-3 7 6 1" fill="none" strokeWidth="1.5" />
        <path
          d="m85 111 7 8-9 5m57 18 3 14"
          fill="none"
          stroke="var(--art-light)"
          strokeWidth="3"
        />
        {final && (
          <path d="m99 95-29 15-16 77 44-18 18-48 13-25 26 20 30 67-39-14-18-45Z" fill="#d7ac60" />
        )}
        <Instrument kind={look.instrument} final={final} signature={look.signature} />
      </g>
    </g>
  );
}
export function EnemyArt({ enemy }: { enemy: Encounter }) {
  const id = useId();
  const look = LOOKS[enemy.character];
  return (
    <svg
      className="db-enemy-art"
      viewBox="0 0 320 270"
      role="img"
      aria-label={`${enemy.name}: ${look.detail}.`}
      data-character={enemy.character}
    >
      <defs>
        <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.3" fill="currentColor" opacity=".22" />
        </pattern>
      </defs>
      <g className="db-portrait-backdrop" fill="none" stroke="var(--art-accent)" strokeWidth="2">
        {enemy.world === 1 ? (
          <>
            <path
              d="m42 42 226-16-10 200-231 9 13-19-6-23 12-20-10-16 12-21-11-18 12-21Z"
              fill="var(--art-paper)"
              stroke="none"
            />
            <path
              d="m41 56 224-16m-222 9 220-16M41 209l231-9"
              stroke="var(--art-ink)"
              opacity=".5"
            />
          </>
        ) : enemy.world === 2 ? (
          <>
            <path d="m35 42 197-16 56 173-197 32Z" fill="var(--art-accent)" opacity=".25" />
            <circle cx="158" cy="131" r="101" fill={`url(#${id}-dots)`} />
            <path d="m35 55 37 0-30 30 36 0m176 72 31 0-28 30 32 0" strokeWidth="7" />
          </>
        ) : (
          <>
            {[105, 88, 71].map((r) => (
              <ellipse key={r} cx="160" cy="135" rx={r} ry={r + 15} />
            ))}
            <path d="M39 199C-8 106 96 17 155 30c109-16 172 125 113 173M53 226c-40-21-36-72-7-73s37 45 7 50m215 23c40-21 36-72 7-73s-37 45-7 50" />
          </>
        )}
      </g>
      <ellipse cx="160" cy="250" rx="103" ry="9" fill="var(--art-ink)" opacity=".35" />
      <g
        fill="none"
        stroke="var(--art-ink)"
        strokeWidth={enemy.world === 1 ? 3.5 : enemy.world === 2 ? 4 : 2.5}
        strokeLinejoin={enemy.world === 1 ? 'miter' : 'round'}
        strokeLinecap="round"
      >
        {enemy.character === 'torque' ? (
          <>
            <g transform="translate(3 31) scale(.83)">
              <Performer look={look} />
            </g>
            <g transform="translate(119 36) scale(.81)">
              <Performer
                look={{ ...look, instrument: 'bass', cut: 'crop', coat: '#43959a', pose: 8 }}
                mirrored
              />
            </g>
          </>
        ) : enemy.character === 'prism' ? (
          <>
            <g transform="translate(0 45) scale(.72)">
              <Performer look={{ ...look, coat: '#a2c6b5', pose: -8 }} />
            </g>
            <g transform="translate(140 45) scale(.72)">
              <Performer look={{ ...look, coat: '#d69ab3', cut: 'puff', pose: 8 }} />
            </g>
            <g transform="translate(68 7) scale(.92)">
              <Performer look={look} />
            </g>
          </>
        ) : (
          <g transform="translate(40 0)">
            <Performer look={look} final={enemy.final} />
          </g>
        )}
      </g>
    </svg>
  );
}

export function VenueArt({
  world,
  boss = false,
  final = false,
}: {
  world: number;
  boss?: boolean;
  final?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 76"
      aria-hidden="true"
      fill="var(--art-paper)"
      stroke="var(--art-ink)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    >
      <ellipse cx="50" cy="69" rx="44" ry="5" fill="var(--art-ink)" opacity=".15" stroke="none" />
      {final ? (
        <>
          <path d="M8 69V29l13-9V12h58v8l13 9v40Z" />
          <path d="M21 69V26h58v43M27 12V5h46v7" />
          <path d="M35 69V45a15 15 0 0 1 30 0v24" fill="var(--art-accent)" />
          <path d="M13 32h74M17 37v22m8-22v22m50-22v22m9-22v22" />
          <path d="m42 17 8-8 8 8" fill="var(--art-gold)" />
        </>
      ) : world === 1 ? (
        <>
          <path d="M17 69V32L7 36 49 5 93 35 83 32v37Z" />
          <path d="m18 28 31-23 34 24" strokeWidth="5" />
          <path d="M43 69V43h16v26" fill="var(--art-accent)" />
          <path d="M23 38h13v14H23zm43 0h12v14H66z" />
          <path d="m21 57 17 7m23-5 20 4" stroke="var(--art-accent)" />
          {boss && <path d="m38 25 12-9 12 9" stroke="var(--art-accent)" strokeWidth="4" />}
        </>
      ) : world === 2 ? (
        <>
          <path d="M9 69V25L29 12h55l8 13v44Z" />
          <path d="M21 69V34h60v35" fill="var(--art-accent)" />
          <path d="M22 41h58m-58 8h58m-58 8h58M13 25h76" />
          <path d="m32 18 37 0" strokeWidth="4" />
          <path d="M29 69V51h43v18" fill="var(--art-ink)" />
          {boss && <path d="m38 24 12-6 12 6" stroke="var(--art-accent)" strokeWidth="4" />}
        </>
      ) : (
        <>
          <path d="M10 69V30l14-16h52l14 16v39Z" />
          <path d="M21 69V33a29 23 0 0 1 58 0v36" />
          <path d="M33 69V38a17 17 0 0 1 34 0v31" fill="var(--art-accent)" />
          <path d="M8 27h84v13H8z" fill="var(--art-gold)" />
          <path d="m25 34 50 0M17 48v14m66-14v14" />
          {boss && <path d="m42 18 8-11 8 11" fill="var(--art-gold)" />}
        </>
      )}
    </svg>
  );
}

export function ScoreBoardArt() {
  return (
    <svg
      className="db-scoreboard-art"
      viewBox="0 0 900 360"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      {/* Six guitar strings form the staff; outlined slots evoke a physical card mat. */}
      {[135, 151, 167, 183, 199, 215].map((y, i) => (
        <path key={y} d={`M0 ${y}H900`} strokeWidth={i < 3 ? '1' : '2'} />
      ))}
      <path d="M132 135v80m136-80v80m136-80v80m136-80v80m136-80v80m136-80v80" opacity=".5" />
      <path
        d="M130 69c-47-35-83 9-62 48-44 26-40 102 14 121 57 27 106-23 86-66 51-10 53-57 20-78-20 23-38 23-58-25Z"
        strokeWidth="3"
      />
      <circle cx="135" cy="174" r="26" strokeWidth="3" />
      <circle cx="135" cy="174" r="31" />
      <path
        d="m630 47 145 0m-145 7h145m-145 7h145m-145 7h145m-145 7h145M652 45v31m75-29v28m-62-13c-13-13-8-29 0-26 11 2-9 37-4 42 8 7 16-2 8-11-12-10-17 5-7 9m33-14 8-3v-14m39 20 8-3v-14"
        strokeWidth="2"
      />
      <rect x="217" y="94" width="111" height="156" rx="9" strokeDasharray="6 7" />
      <rect x="352" y="94" width="111" height="156" rx="9" strokeDasharray="6 7" />
      <rect x="487" y="94" width="111" height="156" rx="9" strokeDasharray="6 7" />
      <path d="m19 323 862 0m-842-7v14m822-14v14" />
    </svg>
  );
}
