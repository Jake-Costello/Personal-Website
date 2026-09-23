import './golf-scene.css';

export type GolfPhase = 'idle' | 'swing' | 'flight' | 'reading' | 'falling';

export function GolfClubIcon({
  color,
  className,
  kind = 'iron',
}: {
  color: string;
  className?: string;
  kind?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 76"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M17 4h9v23h-2v34h-5V27h-2z" fill="#17251e" />
      <path d="M20 7h3v17h-3z" fill={color} />
      <path d="M21 29h2v32h-2z" fill="#e0e5d9" />
      {kind === 'driver' ? (
        <>
          <path d="M10 59h18v3h6v9H10v-3H7v-6h3z" fill="#17251e" />
          <path d="M11 62h16v3h4v3H11z" fill={color} />
        </>
      ) : kind === 'putter' ? (
        <>
          <path d="M9 61h27v9H9z" fill="#17251e" />
          <path d="M12 63h21v3H12z" fill={color} />
        </>
      ) : (
        <>
          <path d="M19 58h5v3h12v10H14v-7h5z" fill="#17251e" />
          <path d="M21 64h12v4H17v-3h4z" fill={color} />
        </>
      )}
    </svg>
  );
}

function Cloud({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`} fill="#fff0dd">
      <path d="M0 18h14V8h20V0h30v8h17v10h19v13H0z" />
      <path d="M12 31h77v5H12z" opacity=".42" />
    </g>
  );
}

function Pine({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path d="M-3-18h6v22h-6z" fill="#314d40" />
      <path d="M-4-68h8v11h7v10h7v11h8v12h8v10h-68v-10h8v-12h8v-11h7v-10h7z" fill="#436d57" />
      <path d="M0-68h4v11h7v10h7v11h8v12h8v10H0z" fill="#355c49" />
      <path d="M-13-34h13v4h-13zm-11 15H0v4h-24z" fill="#5c8463" />
    </g>
  );
}

function GolfBag() {
  return (
    <g className="golf-scene__bag">
      <path d="M117 347h74v7h-74z" fill="#668453" opacity=".6" />
      <path d="M123 278h6v62h-6zm58 1h5v66h-5z" fill="#314d40" />
      <path
        d="M132 255h5v-59h-7v-8h16v12h-8v55zm15 0h5v-79h-8v-10h17v13h-8v76zm15 0h5v-67h-5v-11h17v12h-11v66z"
        fill="#17251e"
      />
      <path d="M134 204h2v51h-2zm15-20h2v71h-2zm15 11h2v60h-2z" fill="#f5f3ed" />
      <path d="M129 188h14v8h-14z" fill="#f399bf" />
      <path d="M144 166h14v9h-14z" fill="#dfff7f" />
      <path d="M162 177h14v8h-14z" fill="#bfa7db" />
      <path d="M124 246h56v12h5v78h-5v12h-49v-6h-7z" fill="#17251e" />
      <path d="M130 260h48v68h-6v12h-37v-6h-5z" fill="#bfa7db" />
      <path d="M158 260h20v69h-6v11h-14z" fill="#9277ae" />
      <path d="M130 251h44v8h-44z" fill="#f5f3ed" />
      <path d="M130 275h21v49h-21z" fill="#17251e" />
      <path d="M134 279h13v41h-13z" fill="#f399bf" />
      <path d="M133 288h15v4h-15z" fill="#f5f3ed" />
      <path d="M163 267h6v40h-6zm-2 43h10v4h-10z" fill="#f5f3ed" />
      <path d="M180 263h14v6h-8v42h-6z" fill="#17251e" />
    </g>
  );
}

function Golfer({ clubColor }: { clubColor: string }) {
  return (
    <g className="golf-scene__golfer">
      <path d="M427 337h99v6h-99z" fill="#668453" opacity=".65" />
      {/* The feet and lower body stay planted while the arms change swing pose. */}
      <path d="M453 278h48v23h-8v13h-17v-18h-6v17h-18z" fill="#17251e" />
      <path d="M457 282h40v14h-8v12h-9v-18h-12v18h-11z" fill="#f5f3ed" />
      <path d="M475 282h22v14h-8v12h-9v-20h-5z" fill="#d7d5c7" />
      <path d="M452 310h17v19h-5v5h-15v-7h3zm27-1h15v17h9v8h-24z" fill="#17251e" />
      <path d="M456 312h9v15h-9zm27 0h7v17h-7z" fill="#c88760" />
      <path d="M448 327h16v3h5v9h-27v-6h6zm32 1h13v2h13v9h-26z" fill="#17251e" />
      <path d="M447 334h19v3h-19zm36-1h19v4h-19z" fill="#f5f3ed" />
      {/* Cap, ear, face, and a small high-contrast visor keep the sprite readable. */}
      <path d="M463 190h26v6h7v22h-7v12h-24v-8h-7v-25h5z" fill="#17251e" />
      <path d="M466 201h26v15h-7v9h-16v-9h-7v-10h4z" fill="#c88760" />
      <path d="M469 215h9v9h-9zm-7-9h5v8h-5z" fill="#a76146" />
      <path d="M485 205h4v5h-4z" fill="#17251e" />
      <path d="M462 186h26v5h8v10h-38v-10h4z" fill="#17251e" />
      <path d="M466 190h19v5h7v3h-30v-4h4z" fill="#bfa7db" />
      <path d="M480 198h25v5h-25z" fill="#17251e" />
      <path d="M483 198h19v2h-19z" fill="#dfff7f" />
      <path d="M467 224h18v10h-18z" fill="#17251e" />
      <path d="M471 224h10v8h-10z" fill="#c88760" />
      <path d="M453 231h39v7h8v19h-7v22h8v7h-48v-32h-7v-16h7z" fill="#17251e" />
      <path d="M456 235h12v6h15v-6h6v7h7v11h-7v25h-32v-28h-7v-9h6z" fill="#f399bf" />
      <path d="M479 241h10v37h-10z" fill="#cf6d9a" />
      <path d="M459 248h7v3h-7zm0 26h18v4h-18z" fill="#ffc2d8" />
      <g className="golf-scene__pose golf-scene__pose--address">
        <path
          d="M487 246h10v11h8v12h-8v-8h-9zm-36 2h11v12h15v7h19v8h-23v-6h-18v-7h-4z"
          fill="#17251e"
        />
        <path d="M491 249h3v11h7v7h-4v-8h-6zm-36 2h4v12h17v7h20v3h-22v-7h-19z" fill="#c88760" />
        <path d="M494 266h11v10h-11z" fill="#f5f3ed" />
        <path d="M503 273l31 53-4 2-31-53z" fill="#17251e" />
        <path d="M505 280l26 45-1 1-26-45z" fill="#f5f3ed" />
        <path d="M528 323h15v9h-15z" fill="#17251e" />
        <path d="M531 325h9v4h-9z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--backswing">
        <path
          d="M487 245h9v12h-16v-8h-14v-11h-8v-14h10v11h8v10zm-35 3h12v-8h-7v-15h-8v17z"
          fill="#17251e"
        />
        <path
          d="M489 249h4v5h-10v-7h-13v-11h-8v-8h3v10h8v11zm-36 2h8v-9h-7v-13h-2v15z"
          fill="#c88760"
        />
        <path d="M451 218h16v12h-16z" fill="#f5f3ed" />
        <path d="M454 221l-22-60 4-2 22 61z" fill="#17251e" />
        <path d="M453 214l-17-48 1-1 17 48z" fill="#f5f3ed" />
        <path d="M425 152h14v11h-14z" fill="#17251e" />
        <path d="M428 155h8v5h-8z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--downswing">
        <path
          d="M485 245h12v11h11v12h-11v-7h-12zm-33 4h10v12h18v7h18v9h-22v-7h-20v-6h-4z"
          fill="#17251e"
        />
        <path d="M489 249h5v11h10v5h-4v-8h-11zm-33 3h3v12h19v7h21v3h-23v-7h-20z" fill="#c88760" />
        <path d="M498 266h11v10h-11z" fill="#f5f3ed" />
        <path d="M506 273l56 19-2 5-56-20z" fill="#17251e" />
        <path d="M514 277l44 16-1 1-44-15z" fill="#f5f3ed" />
        <path d="M556 289h14v11h-14z" fill="#17251e" />
        <path d="M559 292h8v5h-8z" fill={clubColor} />
      </g>
      <g className="golf-scene__pose golf-scene__pose--followthrough">
        <path
          d="M452 248h11v-7h16v-13h11v-12h10v17h-10v15h-23v8h-15zm34-1h10v-11h8v-11h-9v8h-9z"
          fill="#17251e"
        />
        <path
          d="M455 251h6v-7h20v-13h12v-12h4v11h-10v15h-23v8h-9zm35-7h3v-10h8v-6h-3v8h-8z"
          fill="#c88760"
        />
        <path d="M489 212h15v12h-15z" fill="#f5f3ed" />
        <path d="M492 215l-53-43 3-4 53 43z" fill="#17251e" />
        <path d="M485 207l-42-34 1-1 42 34z" fill="#f5f3ed" />
        <path d="M430 163h15v12h-15z" fill="#17251e" />
        <path d="M433 166h9v6h-9z" fill={clubColor} />
      </g>
    </g>
  );
}

export default function GolfScene({ phase, clubColor }: { phase: GolfPhase; clubColor: string }) {
  return (
    <svg
      className={`golf-scene golf-scene--${phase}`}
      viewBox="0 0 900 430"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M0 0h900v430H0z" fill="#f5bca6" />
      <path d="M0 0h900v64H0z" fill="#f4b1a6" />
      <path d="M0 64h900v48H0z" fill="#f5b9a7" />
      <path d="M727 35h40v6h10v10h6v40h-6v10h-10v6h-40v-6h-10V91h-6V51h6V41h10z" fill="#ffe6ae" />
      <Cloud x={60} y={58} size={1.25} />
      <Cloud x={332} y={32} size={0.75} />
      <Cloud x={603} y={113} size={0.6} />
      <Cloud x={824} y={62} size={1.05} />
      <path
        d="M0 174h52v-12h72v-9h83v9h46v12h49v-15h64v-14h91v11h63v20h48v-7h52v-16h105v8h68v13h66v-11h41v267H0z"
        fill="#92a480"
      />
      <path
        d="M0 202h47v-10h43v-13h91v12h72v14h75v-9h103v-13h75v12h88v17h91v-17h68v-13h65v17h62v15h20v216H0z"
        fill="#638568"
      />
      <Pine x={42} y={218} size={0.9} />
      <Pine x={80} y={219} size={0.65} />
      <Pine x={842} y={226} size={1.3} />
      <Pine x={883} y={232} size={0.95} />
      <Pine x={245} y={210} size={0.55} />
      <Pine x={285} y={211} size={0.72} />
      {/* Stepped fairway stripes lead the eye from the tee to the distant pin. */}
      <path
        d="M612 207h149v10h-16v10h-44v12h-58v15h-40v18h-67v28H386v-22h76v-16h48v-17h57v-16h28v-12h17z"
        fill="#a5c17b"
      />
      <path
        d="M613 207h61v10h-16v10h-35v12h-42v15h-43v18h-45v15h-72v-9h41v-16h48v-17h57v-16h28v-12h18z"
        fill="#b7d385"
      />
      <path
        d="M685 207h40v10h-18v10h-38v12h-40v15h-50v18h-48v15h-36v-15h41v-18h67v-15h40v-12h29v-10h13z"
        fill="#c6da8f"
      />
      <path d="M634 200h99v4h18v8H630v-4h-9v-4h13z" fill="#c6da8f" />
      <path d="M682 151h3v58h-3z" fill="#f5f3ed" />
      <path d="M679 208h10v3h-10z" fill="#314d40" />
      <g className="golf-scene__flag">
        <path d="M685 151h25v5h10v5h-10v5h-25z" fill="#17251e" />
        <path d="M688 154h19v5h8v1h-8v3h-19z" fill="#f399bf" />
      </g>
      <path d="M766 236h28v5h17v11h-49v-5h-9v-7h13z" fill="#f2ddb2" />
      <path d="M99 243h40v5h25v9h-76v-8h11z" fill="#f2ddb2" />
      <path d="M0 278h91v-10h132v8h120v-8h149v11h155v-10h115v12h138v149H0z" fill="#789659" />
      <path d="M0 306h79v-13h120v9h123v-8h114v9h174v-8h102v14h188v121H0z" fill="#a9c877" />
      <path d="M77 337h182v-12h130v-7h207v10h107v13h122v37H77z" fill="#dfff7f" />
      <path d="M77 373h748v5h-29v9H98v-9H77z" fill="#b9d971" />
      <path
        d="M116 350h36v3h-36zm157-14h21v3h-21zm56 28h33v3h-33zm61-35h15v3h-15zm166 26h36v3h-36zm96-19h23v3h-23zm102 26h28v3h-28z"
        fill="#bddb73"
      />
      <path
        d="M0 399h56v-9h90v11h103v-7h116v10h99v-9h146v9h122v-10h103v9h65v27H0z"
        fill="#90ae65"
      />
      <path
        d="M35 333h5v-10h3v10h8v4H35zm42 65h5v-11h4v7h6v4H77zm126-99h5v-8h3v8h7v4h-15zm579 26h4v-11h4v11h8v4h-16zm70 46h5v-10h3v7h7v4h-15zm-298 35h4v-11h3v11h8v4h-15zm-177-3h5v-8h3v8h7v4h-15z"
        fill="#638568"
      />
      <path d="M372 336h11v11h-11zm287 0h11v11h-11z" fill="#17251e" />
      <path d="M374 334h7v7h-7zm287 0h7v7h-7z" fill="#f399bf" />
      <GolfBag />
      <Golfer clubColor={clubColor} />
      <path d="M533 333h4v9h-4z" fill="#f5f3ed" />
      <path d="M530 332h10v3h-10z" fill="#f5f3ed" />
      <g className="golf-scene__tee-ball">
        <path d="M532 322h6v2h3v6h-3v2h-6v-2h-3v-6h3z" fill="#17251e" />
        <path d="M532 324h6v6h-6z" fill="#f5f3ed" />
        <path d="M536 328h2v2h-2z" fill="#b6c5af" />
      </g>
      <g className="golf-scene__impact" fill="#f5f3ed">
        <path d="M516 313h4v8h-4zm33 0h4v8h-4zm-12-14h4v9h-4zm-34 28h10v4h-10zm50-1h12v4h-12z" />
      </g>
    </svg>
  );
}
