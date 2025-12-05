export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function show(el: HTMLElement | null) {
  if (el) el.style.display = '';
}

export function hide(el: HTMLElement | null) {
  if (el) el.style.display = 'none';
}

export function setText(el: HTMLElement | null, text: string) {
  if (el) el.textContent = text;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function showToast(message: string, duration = 2000) {
  const existing = $('#toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

