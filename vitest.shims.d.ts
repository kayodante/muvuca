/// <reference types="@vitest/browser-playwright" />
declare module "*.html?raw" {
  const content: string;
  export default content;
}
