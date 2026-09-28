import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./landing.module.css";

interface LandingMediaProps {
  number: string;
  label: string;
  title: string;
  description: string;
  format: string;
  className?: string;
}

/** Static, explicitly labelled art slots; replace with localized media when supplied. */
export function LandingMedia({
  number,
  label,
  title,
  description,
  format,
  className,
}: LandingMediaProps) {
  return (
    <figure className={cn(styles.media, className)} data-asset-slot={number}>
      <div className={styles.mediaTopline}>
        <span>MUVUCA / {number}</span>
        <span>{label}</span>
      </div>
      <figcaption className={styles.mediaCaption}>
        <span className={styles.mediaIcon} aria-hidden="true">
          <ImageIcon strokeWidth={1} />
        </span>
        <strong>{title}</strong>
        <p>{description}</p>
      </figcaption>
      <div className={styles.mediaBottomline}>
        <span>{format}</span>
        <span>PT-BR / EN</span>
      </div>
    </figure>
  );
}
