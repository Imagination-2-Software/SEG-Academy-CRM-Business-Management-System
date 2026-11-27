import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #55225c 0%, #3d1642 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 15.5C32 15.5 29 12.5 24 12.5C18.5 12.5 15.5 15.5 15.5 19.5C15.5 25 32.5 23 32.5 29C32.5 33.5 29 35.5 23.5 35.5C18 35.5 15 32.5 15 32.5"
            stroke="#f37032"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="32.5" cy="15.5" r="3.5" fill="#FBB019" />
          <circle cx="15" cy="32.5" r="3.5" fill="#FBB019" />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
