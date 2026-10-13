import { ImageResponse } from 'next/og';

export const alt = 'MonMix — your MON and USDC allocation, kept in view.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: 'center', background: '#f3f1e9', color: '#10120f', display: 'flex', height: '100%', justifyContent: 'center', padding: 72, width: '100%' }}>
      <div style={{ border: '2px solid #10120f', borderRadius: 38, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 52, width: '100%' }}>
        <div style={{ alignItems: 'center', display: 'flex', fontSize: 40, fontWeight: 800, gap: 20 }}>
          <div style={{ alignItems: 'center', background: '#171b17', borderRadius: 18, color: '#d9ff64', display: 'flex', height: 72, justifyContent: 'center', width: 72 }}>M</div>
          <span>MonMix</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 82, fontWeight: 800, letterSpacing: '-4px', lineHeight: 1 }}><span>Your crypto,</span><span>your mix.</span></div>
          <div style={{ color: '#4d544a', fontSize: 28, marginTop: 30 }}>Portfolio clarity for MON + USDC, powered by Kuru on Monad.</div>
        </div>
        <div style={{ alignItems: 'center', display: 'flex', fontSize: 22, gap: 14 }}><span style={{ background: '#93b900', borderRadius: 99, display: 'flex', height: 12, width: 12 }} /><span>Live market reads · deterministic policy · wallet control</span></div>
      </div>
    </div>,
    size,
  );
}
