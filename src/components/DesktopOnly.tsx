import { QRCodeSVG } from 'qrcode.react';
import { Logo } from './Logo';

export function DesktopOnly() {
  const appUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return (
    <main className="desktop-only">
      <section>
        <Logo />
        <p className="eyebrow">Mobile only</p>
        <h1>请在手机上使用时衡</h1>
        <p>v2.0 专为 Android Chrome 与 Edge 设计。使用手机扫码后，可安装到主屏幕并离线记录。</p>
        <div className="desktop-qr" role="img" aria-label={`应用地址：${appUrl}`}>
          <QRCodeSVG value={appUrl} size={184} level="M" marginSize={2} />
        </div>
        <a href={appUrl}>{appUrl}</a>
      </section>
    </main>
  );
}
