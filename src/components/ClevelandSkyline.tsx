// Original pixel silhouettes, looking south from Lake Erie: east is on the left.
// The spacing is compressed for the game; these are drawn shapes, not traced assets.
function GoodyearBlimp({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g className="skyline-goodyear-blimp" transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Original pixel airship: classic blue envelope, gold wordmark, fins and gondola. */}
      <path d="M11 13V-8H2v-5h-8v25h9v10zM10 32v26H1v5h-8V37h10z" fill="#6b8790" />
      <path
        d="M24 0h101v4h18v5h13v6h9v8h5v12h-5v8h-9v6h-13v5h-18v4H24v-4H12v-8H5V35H0V23h5V12h7V4h12z"
        fill="#567684"
      />
      <path d="M24 4h99v4h19v5H17V8h7z" fill="#86a3ab" />
      <path d="M13 41h143v5h-14v5h-20v3H25v-4H13z" fill="#d5ca83" />
      <path d="M3 22h20v5H3zm1 9h19v5H4z" fill="#abc0b7" />
      <text
        x="88"
        y="33"
        textAnchor="middle"
        fill="#e8dc91"
        fontFamily="monospace"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.7"
      >
        GOODYEAR
      </text>
      <path d="M82 56h4v7h-4zm31 0h4v7h-4z" fill="#5a7477" />
      <path d="M79 63h43v10h-5v4H84v-4h-5z" fill="#c1d1c4" />
      <path d="M85 65h8v5h-8zm11 0h8v5h-8zm11 0h8v5h-8z" fill="#567684" />
      <path d="M69 60h7v4h-7zm-3-5h3v14h-3z" fill="#789094" />
    </g>
  );
}

export default function ClevelandSkyline({
  width,
  waterline,
  progress,
}: {
  width: number;
  waterline: number;
  progress: number;
}) {
  // Keep both lakefront landmarks in view, including at the end of a mobile ride.
  const scale = width < 560 ? width / 720 : Math.min(1.12, width / 1120);
  const x = width * 0.5 - 320 * scale;
  const parallax = Math.min(40, width * 0.04);
  // The airship shares the ride's gentle parallax, with no independent animation.
  const blimpX = width < 560 ? 442 : 635;
  const blimpY = -Math.min(350, (waterline - 155) / scale);
  return (
    <g
      className="cleveland-skyline"
      transform={`translate(${x + (0.5 - progress) * parallax} ${waterline}) scale(${scale})`}
      shapeRendering="crispEdges"
    >
      <GoodyearBlimp x={blimpX} y={blimpY} scale={width < 560 ? 1.04 : 0.95} />
      <g fill="#b5cbbf">
        <path d="M-650 0v-24h100v-14h50v14h90v-36h48v16h70v-19h65v34h54v-17h63v-15h33v24h72v-31h41v15h43v-22h51v27h55v-17h39v20h50V0z" />
        <path d="M320 0v-49h37v-24h45v17h34v-32h26v15h51v-17h38v50h64v-29h47v32h39v-12h47v14h120v35z" />
      </g>
      <g fill="#8faa9c">
        <path d="M-84 0v-80h13v-14h47v14h11V0zM13 0v-62h50v-12h15V0zM460 0v-82h38v-14h28v96zM620 0v-114h13v-12h29v12h13V0z" />
      </g>
      <g transform="translate(273 0)">
        {/* Terminal Tower: stepped crown and its small observation lantern. */}
        <path
          d="M93 0v-95h9v-21h12v-27h12v-21h8v-17h7v-24h3v-12h3v12h3v24h7v17h8v21h12v27h12v21h9V0z"
          fill="#8faa9c"
        />
        <path d="M135-157h8v139h-8zm17 14h7v125h-7zm-35 43h7v82h-7zm54 0h7v82h-7z" fill="#a7c0b1" />
      </g>
      <g className="skyline-key-tower">
        {/* Key Tower: narrow setbacks, pyramidal crown, and antenna. */}
        <path
          d="M233 0v-169h7v-32h9v-14h8v-12h8v-10h8v-13h3v-21h3v21h3v13h8v10h8v12h8v14h9v32h7V0z"
          fill="#8faa9c"
        />
        <path
          d="M250-190h5v173h-5zm13-22h5v195h-5zm13-22h5v217h-5zm13 22h5v195h-5zm13 22h5v173h-5z"
          fill="#a7c0b1"
        />
        {/* A small, softened red key sign below the crown. */}
        <path
          d="M263-211h9v3h18v4h-5v5h-4v-5h-9v3h-9v-3h-3v-4h3zM264-207v3h5v-3z"
          fill="#b57370"
          fillRule="evenodd"
        />
      </g>
      <g transform="translate(-280 0)">
        {/* 200 Public Square's broad shoulders and sloped crown. */}
        <path d="M350 0v-139h7v-17h9v-16h57v16h9v17h7V0z" fill="#8faa9c" />
        <path
          d="M368-146h6v130h-6zm16-12h6v142h-6zm16 0h6v142h-6zm16 12h6v130h-6z"
          fill="#a7c0b1"
        />
      </g>
      <g className="skyline-sherwin-williams">
        {/* The new HQ's glass planes meet in a crease below two sloping roof fins. */}
        <path d="M490 0v-187h12v3h12v3h12v3h12v4h7v174z" fill="#82a9a7" />
        <path d="M545 0v-174h8v-3h10v-3h10v-4h10V0z" fill="#729a9b" />
        <path
          d="M493-184h4v173h-4zm14 4h3v169h-3zm14 4h3v165h-3zm14 4h3v161h-3zM548-170h3v159h-3zm13-4h3v163h-3zm13-4h3v167h-3z"
          fill="#b5d0c8"
        />
        <path
          d="M542-174h4V0h-4zM490-146h93v3h-93zm0 28h93v3h-93zm0 28h93v3h-93zm0 28h93v3h-93z"
          fill="#96b6ad"
        />
        <path d="M499-163h30v3h-30zm0 5h23v2h-23z" fill="#e1ece4" />
      </g>
      <g fill="#739383">
        {/* Low waterfront buildings keep the taller skyline legible. */}
        <path d="M-530 0v-15h79v-8h60v-12h64v14h51v-9h54v15h54V0zM-116 0v-25h72v-11h30v11h75v8h50V0zM176 0v-28h40v-10h28v10h50v28zM310 0v-22h40v-12h31v12h48v22z" />
        <path d="M647 0v-16h54v-10h73v11h180V0z" />
      </g>
      <g className="skyline-rock-hall" transform="translate(-437 0)">
        {/* Pale glass facets and mullions bring out the Rock Hall's pyramid. */}
        <path
          d="M452 0v-16h29v-8h14v-12h14v-12h14v-12h14v-13h9v13h14v12h14v12h14v12h14v8h22V0zM590 0v-24h15v-22h19v46z"
          fill="#bacfc1"
        />
        <path d="M590-24h15v-22h19V0h-34z" fill="#d6dfce" />
        <g className="skyline-rock-glass">
          <path d="M483-16l57-51v51z" fill="#8aafb0" />
          <path d="M540-67l54 51h-54z" fill="#a8c7c2" />
          <path d="M483-16l57-51 54 51z" fill="none" stroke="#dae5d6" strokeWidth="3" />
          <path
            d="M540-64v48m-1-45-31 45m34-43 31 43M525-51h31m-45 13h58m-72 13h86"
            fill="none"
            stroke="#d0e0d5"
            strokeWidth="2"
          />
        </g>
        <path d="M452-13h172v13H452z" fill="#7f9f8d" />
        <path d="M594-21h22v7h-22zM461-11h32v5h-32z" fill="#b57370" />
        <path d="M598-19h14v2h-14zM466-9h21v1h-21z" fill="#e6dfcf" />
      </g>
      <g className="skyline-browns-stadium">
        {/* Existing lakefront stadium: broad open bowl, exposed tiers and corner towers. */}
        <path d="M268 0v-41h13v-12h23v-10h275v10h23v12h13V0z" fill="#6e8c7e" />
        <path d="M283-48h20v-10h279v10h19v11H283z" fill="#c0cfc0" />
        <path d="M307-55h269v9H307z" fill="#4f6e61" />
        <path d="M298-43h286v8H298zM281-28h320v5H281z" fill="#9ebdaf" />
        <path d="M294-34h294v5H294z" fill="#ab876b" />
        <path d="M271-48h15V0h-15zm329 0h15V0h-15z" fill="#b0c2b3" />
        <path
          d="M299-23h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7zm31 0h7v23h-7z"
          fill="#a8bfb0"
        />
        <path d="M297-71h3v14h-3zm281 0h3v14h-3z" fill="#657f72" />
        <path d="M300-71h13v7h-13zm281 0h13v7h-13z" fill="#ad7854" />
        <path d="M261-4h361v4H261z" fill="#657f72" />
      </g>
    </g>
  );
}
