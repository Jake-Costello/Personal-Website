// Original pixel silhouettes, inspired by Cleveland's view from Lake Erie.
// These are hand-drawn shapes, not a photograph or a traced image asset.
export default function ClevelandSkyline({
  width,
  waterline,
  progress,
}: {
  width: number;
  waterline: number;
  progress: number;
}) {
  const scale = width < 560 ? 0.58 : Math.min(1.12, width / 1120);
  const x = width < 560 ? width * 0.5 - 300 * scale : width * 0.54 - 250 * scale;
  return (
    <g
      className="cleveland-skyline"
      transform={`translate(${x - progress * 65} ${waterline}) scale(${scale})`}
      shapeRendering="crispEdges"
    >
      <g fill="#b5cbbf">
        <path d="M-650 0v-24h100v-14h50v14h90v-36h48v16h70v-19h65v34h54v-17h63v-15h33v24h72v-31h41v15h43v-22h51v27h55v-17h39v20h50V0z" />
        <path d="M320 0v-49h37v-24h45v17h34v-32h26v15h51v-17h38v50h64v-29h47v32h39v-12h47v14h120v35z" />
      </g>
      <g fill="#8faa9c">
        {/* Terminal Tower: stepped crown and its small observation lantern. */}
        <path d="M93 0v-95h9v-21h12v-27h12v-21h8v-17h7v-24h3v-12h3v12h3v24h7v17h8v21h12v27h12v21h9V0z" />
        {/* Key Tower: narrow setbacks, pyramidal crown, and antenna. */}
        <path d="M233 0v-169h7v-32h9v-14h8v-12h8v-10h8v-13h3v-21h3v21h3v13h8v10h8v12h8v14h9v32h7V0z" />
        {/* 200 Public Square's broad shoulders and sloped crown. */}
        <path d="M350 0v-139h7v-17h9v-16h57v16h9v17h7V0z" />
        <path d="M-84 0v-80h13v-14h47v14h11V0zM13 0v-62h50v-12h15V0zM460 0v-82h38v-14h28v96zM559 0v-114h13v-12h29v12h13V0z" />
      </g>
      <g fill="#a7c0b1">
        <path d="M135-157h8v139h-8zm17 14h7v125h-7zm-35 43h7v82h-7zm54 0h7v82h-7zM250-190h5v173h-5zm13-22h5v195h-5zm13-22h5v217h-5zm13 22h5v195h-5zm13 22h5v173h-5zM368-146h6v130h-6zm16-12h6v142h-6zm16 0h6v142h-6zm16 12h6v130h-6z" />
      </g>
      <g fill="#739383">
        {/* Low waterfront buildings keep the taller skyline legible. */}
        <path d="M-530 0v-15h79v-8h60v-12h64v14h51v-9h54v15h54V0zM-116 0v-25h72v-11h30v11h75v8h50V0zM176 0v-28h40v-10h28v10h50v28zM310 0v-22h40v-12h31v12h48v22z" />
        {/* Rock Hall's low, angular lakefront silhouette. */}
        <path d="M452 0v-16h29v-8h14v-12h14v-12h14v-12h14v-13h9v13h14v12h14v12h14v12h14v8h22V0z" />
        <path d="M590 0v-24h15v-22h19v46zM647 0v-16h54v-10h73v11h180V0z" />
      </g>
      <g fill="#c5d9cf">
        <path d="M500-17h77v4h-77zm16-14h45v4h-45zm15-13h15v4h-15z" />
      </g>
    </g>
  );
}
