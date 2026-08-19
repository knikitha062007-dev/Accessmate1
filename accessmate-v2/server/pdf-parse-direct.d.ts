declare module "pdf-parse/lib/pdf-parse.js" {
  type ParseResult = { text: string };
  function parsePdf(data: Buffer): Promise<ParseResult>;
  export default parsePdf;
}
