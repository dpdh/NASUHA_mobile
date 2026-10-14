// Campur warna hex dengan alpha di atas warna dasar → hasil solid (opaque).
// Dipakai untuk kartu yang memiliki bayangan: latar semi-transparan + shadow di Android
// membuat bayangan terlihat sebagai bingkai abu-abu di balik kartu.
export function tint(hex: string, alpha: number, baseHex = '#FFFFFF'): string {
  const parse = (value: string) => {
    const clean = value.replace('#', '').slice(0, 6);
    return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(baseHex);
  const mix = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha)).toString(16).padStart(2, '0');
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}
