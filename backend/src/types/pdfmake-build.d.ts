declare module 'pdfmake/build/pdfmake.js' {
  const pdfMake: {
    vfs?: Record<string, string>;
    createPdf: (definition: unknown) => {
      getBuffer: (callback: (buffer: Buffer) => void) => void;
    };
  };

  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
  const fonts: {
    vfs: Record<string, string>;
  };

  export default fonts;
}
