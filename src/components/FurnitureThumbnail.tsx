export function FurnitureThumbnail({ type, colour }: { type: string; colour: string }) {
  const bed = type.includes('bed') && type !== 'bedside-table';
  const seating = ['sofa', 'armchair', 'bench', 'dining-chair', 'desk-chair'].includes(type);
  const table = type.includes('table') || type.endsWith('desk') || type === 'stool';
  return <svg viewBox="0 0 100 76" aria-hidden="true" className="furniture-thumbnail">
    <ellipse cx="50" cy="61" rx="34" ry="7" fill="#dad6cc" opacity=".4" />
    {type === 'ottoman' ? <g><path d="M20 32 61 20 82 34 41 48Z" fill={colour} /><path d="M20 32V53L41 65V48Z M41 48 82 34V52L41 65Z" fill={colour} style={{ filter: 'brightness(.9)' }} /></g> : seating ? <g>
      <path d="M18 31 65 19 86 32 39 46Z" fill={colour} />
      <path d="M18 31V50L39 62V46Z" fill={colour} style={{ filter: 'brightness(.8)' }} />
      <path d="M39 46 86 32V51L39 62Z" fill={colour} style={{ filter: 'brightness(.92)' }} />
      <path d="M24 27 67 17 67 33 24 43Z" fill={colour} style={{ filter: 'brightness(1.15)' }} />
      <path d="M22 37 35 34 44 40 31 44Z M70 24 81 28 81 42 71 44Z" fill={colour} style={{ filter: 'brightness(1.1)' }} />
      <path d="M39 49V57 M54 44V55 M68 39V51" stroke="#ffffff" opacity=".2" />
    </g> : bed ? <g>
      <path d="M15 36 55 18 87 42 47 61Z" fill={colour} />
      <path d="M15 36V44L47 69V61Z M47 61 87 42V50L47 69Z" fill="#b8ac97" />
      <path d="M17 35 55 18 68 27 30 44Z" fill="#f0eee6" />
      <path d="M15 20 52 5 55 18 15 36Z" fill="#c9b99d" />
      <path d="M22 28 34 23 43 30 31 35Z M38 21 50 16 59 23 47 28Z" fill="#faf8f2" />
    </g> : type === 'plant' ? <g>
      <path d="M38 44H62L58 64H42Z" fill="#bdaa91" /><ellipse cx="50" cy="44" rx="12" ry="4" fill="#95816b" />
      <path d="M50 45V20 M50 31 33 23 M50 26 67 16" stroke="#789071" strokeWidth="3" />
      <ellipse cx="35" cy="22" rx="7" ry="13" fill={colour} transform="rotate(-35 35 22)" /><ellipse cx="64" cy="18" rx="7" ry="13" fill={colour} transform="rotate(35 64 18)" /><ellipse cx="49" cy="16" rx="6" ry="14" fill={colour} />
    </g> : type === 'floor-lamp' ? <g>
      <ellipse cx="50" cy="62" rx="17" ry="5" fill="#bcae95" /><path d="M50 60V27" stroke="#a1917a" strokeWidth="3" /><path d="M36 10H64L72 33H28Z" fill="#e8dfcc" />
    </g> : type === 'rug' ? <g><path d="M12 40 57 19 90 41 45 64Z" fill={colour} /><path d="M18 41 56 25 83 42 45 58Z" fill="none" stroke="#a99980" opacity=".5" /></g> : table ? <g>
      <path d="M23 39V60 M78 32V54 M46 49V68" stroke="#9d896c" strokeWidth="4" />
      <path d="M14 32 65 15 88 32 38 50Z" fill={colour} /><path d="M14 32V37L38 55V50Z M38 50 88 32V37L38 55Z" fill={colour} style={{ filter: 'brightness(.85)' }} />
      {type === 'computer-desk' && <g fill="#35413f" stroke="#52625c" strokeWidth="1"><path d="M22 16 36 12V27L22 31Z M38 11 52 7V22L38 26Z M54 6 68 2V17L54 21Z" /></g>}
    </g> : <g>
      <path d="M25 19 65 10 81 22 42 33Z" fill={colour} /><path d="M25 19V53L42 65V33Z" fill={colour} style={{ filter: 'brightness(.85)' }} /><path d="M42 33 81 22V54L42 65Z" fill={colour} />
      <path d="M62 29V59 M45 45 78 35" stroke="#9c8c78" opacity=".6" /><circle cx="59" cy="45" r="1.5" fill="#8a7f6e" /><circle cx="66" cy="42" r="1.5" fill="#8a7f6e" />
      {type === 'media-unit' && <path d="M30 3 72 0V25L30 32Z" fill="#35413f" />}
    </g>}
  </svg>;
}
