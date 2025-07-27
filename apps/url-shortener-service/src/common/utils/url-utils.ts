export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Aceitar apenas HTTP e HTTPS por segurança
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Verificar se tem hostname válido
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      return false;
    }

    // Bloquear IPs locais/privados em produção
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function generateRandomCode(length = 6): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
