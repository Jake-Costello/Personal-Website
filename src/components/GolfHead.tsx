export interface GolfHeadProps {
  head: readonly [number, number];
  face?: 'front' | 'quarter';
  tilt: number;
}

const ink = '#18201e';
const skin = '#f0cfb7';
const hair = '#51382a';
const frontCurls = 'M-18-7h-5v4h-2v5h4v5h4V4h3V-4h-4zM15-7h5v4h3v5h-3v5h-4V4h-3V-4h2z';
const profileCurls = 'M-18-9h10v3h5v8h-3v5h-3v2h-7V6h-3V2h-2V-5h3z';
const frontFace = 'M-16-12h31v9h5v14h-5v11h-7v5H-8v-5h-7V11h-5V-3h4z';
const profileFace = 'M-10-17h22v5h8V1h5v6h-6v12h-9v7H-2v-5h-9V9h-6V-8h7z';
const frontHat = 'M-12-25h23v4h7v10h4v10h-43v-10h3v-9h6z';
const profileHat = 'M-11-22H9v4h8v7h5v10H5v-5h-23v-10h7zM7-6h20v4h8v5H15v-4H7z';

/** The same outer shape used by the renderer's rear-arm/club occlusion mask. */
export function GolfHeadSilhouette({ head: [x, y], face, tilt }: GolfHeadProps) {
  const front = face === 'front';
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`} fill="black" stroke="none">
      <path d={front ? frontCurls : profileCurls} />
      <path d={front ? frontFace : profileFace} />
      <path d={front ? frontHat : profileHat} />
    </g>
  );
}

export default function GolfHead({ head: [x, y], face, tilt }: GolfHeadProps) {
  return (
    <g className="golf-golfer-head" transform={`translate(${x} ${y}) rotate(${tilt})`}>
      {face === 'front' ? (
        <>
          {/* Small curls behind the ears and cap; the face stays unobstructed. */}
          <path d={frontCurls} fill={ink} />
          <path d="M-19-4h-3v5h3v3h3V-4zm36 0h3v3h1v3h-3v3h-2V-1h1z" fill={hair} />
          <path d={frontFace} fill={ink} />
          <path d="M-12-8h23v9h5v7h-5v11H5v5H-6v-5h-6V8h-5V1h5z" fill={skin} />
          <path d="M-12 7h4v12h-4zm18 12h5v3H6z" fill="#d8ac91" />
          <path d="M-13-6h8v3h-3v3h-4v3h-3V-2h2zm19 0h7v3h2v5h-4V-1H8v-2H6z" fill={hair} />
          <path d="M-9 3h4v3h-4zm14 0h4v3H5z" fill={ink} />
          <path d="M0 6h3v7h-5v-3h2zm-4 12h10v2H-4z" fill="#b7866c" />
          <path d="M-6 14h5v-1h4v1h5v3H2v-1H0v1h-6z" fill={hair} />
          <path d={frontHat} fill={ink} />
          <path d="M-10-21H9v4h6v6h-30v-7h5z" fill="#343b38" />
          <path d="M-21-8h43v6h-43z" fill="#101916" />
          <path d="M-16-8h31v2h-31z" fill="#454b47" />
        </>
      ) : (
        <>
          <path d={profileFace} fill={ink} />
          <path d="M-8-11H8v5h8V4h5v2h-6v11H6v5H0v-6h-9V6h-5V-4h6z" fill={skin} />
          <path d="M-11-3h7V9h-7zm6 15h8v6h-8z" fill="#d8ac91" />
          <path d="M-9 0h3v5h-3z" fill="#bb876e" />
          {/* A short band of curls wraps the head and covers most of the ear. */}
          <path d={profileCurls} fill={ink} />
          <path d="M-17-7h7v3h5v5h-3v5h-3v2h-4V4h-3V0h-1v-4h2z" fill="#896140" />
          <path d="M-16-4h4v2h-2v2h-2zm5 4h4v2h-2v2h-2z" fill="#bd945f" />
          <path d="M-15 3h3v2h-3zm4-7h2v2h-2z" fill="#62462f" />
          <path d="M-4-8h9v4H2v3h-4v-2h-3z" fill="#896140" />
          <path d="M9 1h4v3H9z" fill={ink} />
          {face === 'quarter' && <path d="M-1 1h3v3h-3z" fill={ink} />}
          <path d="M11 14h6v2h-6z" fill="#ab745d" />
          <path d="M10 10h7v2h2v2h-7v-1h-2z" fill={hair} />
          <path d={profileHat} fill={ink} />
          <path d="M-10-18H7v4h7v5H5v-3h-18v-4h3z" fill="#343b38" />
          <path d="M17-2h10v2H17z" fill="#454b47" />
        </>
      )}
    </g>
  );
}
