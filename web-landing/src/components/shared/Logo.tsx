import iconUrl from "../../assets/djunoeli-icon.png";
import fullUrl from "../../assets/djunoeli-logo-full.png";

/**
 * Logo Djunoeli — adaptable.
 *
 * variant="icon" : juste le cercle (badge camion). Fond transparent →
 *                  s'affiche bien sur fond clair OU sombre. Idéal sidebar.
 * variant="full" : cercle + "DjuNoEli" + slogan. Idéal page de login
 *                  (le texte est bleu foncé, à poser sur fond clair).
 *
 * Les deux images sont en PNG transparent, donc pas de carré blanc.
 */

type Props = {
  variant?: "icon" | "full";
  /** hauteur en px (l'aspect ratio est conservé) */
  height?: number;
  className?: string;
};

export default function Logo({ variant = "icon", height, className }: Props) {
  const src = variant === "full" ? fullUrl : iconUrl;
  const defaultHeight = variant === "full" ? 120 : 34;

  return (
    <img
      src={src}
      alt="Djunoeli"
      className={className}
      style={{ height: height ?? defaultHeight, width: "auto", display: "block" }}
    />
  );
}
