import { Logo, type LogoProps } from "./Logo";

/**
 * Marca do Muvuca oficial: símbolo com acento lime + letras pixeladas.
 * Mantido para retrocompatibilidade; internamente renderiza <Logo variant="full" />.
 */
export function Wordmark(props: LogoProps) {
  return <Logo variant="full" {...props} />;
}
