export function parseCookieHeader(cookieHeader?: string | string[]) {
  const rawCookieHeader = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

  if (!rawCookieHeader) {
    return {};
  }

  return rawCookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [name, ...valueParts] = part.trim().split('=');

    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(valueParts.join('=') || '');
    return cookies;
  }, {});
}
