declare module 'cookie-parser' {
  export default function cookieParser(secret?: string): (
    req: unknown,
    res: unknown,
    next: () => void
  ) => void;
}
