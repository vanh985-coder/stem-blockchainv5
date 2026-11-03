/** Màn chuyển giữa hai màn ở chế độ danh sách: màn đen phủ kín, số màn và tên màn chữ to (để dễ cắt video). Nền phẳng, không bóng, không filter. */
let el: HTMLDivElement | null = null;

export function showTransition(title: string, name: string): void {
  hideTransition();
  const d = document.createElement('div');
  d.dataset.demoTransition = 'true';
  d.setAttribute('aria-hidden', 'true');
  Object.assign(d.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483600',
    background: '#000',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    textAlign: 'center',
    padding: '24px',
  } as Partial<CSSStyleDeclaration>);
  const a = document.createElement('div');
  a.textContent = title;
  Object.assign(a.style, { fontSize: '56px', fontWeight: '800', fontFamily: 'inherit' });
  const b = document.createElement('div');
  b.textContent = name;
  Object.assign(b.style, { fontSize: '96px', fontWeight: '800', fontFamily: 'inherit', lineHeight: '1.1' });
  d.append(a, b);
  document.body.appendChild(d);
  el = d;
}

export function hideTransition(): void {
  el?.remove();
  el = null;
}
