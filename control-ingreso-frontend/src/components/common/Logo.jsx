import strLogoSciemPass from "../../assets/images/logo-sciem-pass.png";

/**
 * Logo.jsx
 *
 * Isotipo + wordmark de SCIEM-PASS. Antes se dibujaba con divs y CSS;
 * ahora es una sola imagen PNG que ya trae el ícono y el texto
 * "SCIEM-PASS" integrados. Se usa tanto en el Header (arriba de todas
 * las pantallas) como dentro de la tarjeta de Registro/Login, por eso
 * vive en components/common y no en un lugar específico de "registro".
 *
 * Prop "boolCompact": en la tarjeta del formulario el logo aparece un
 * poco más chico (scale .82 en el mockup original). Se mantiene el
 * mismo mecanismo que antes, ahora aplicado sobre la imagen.
 */
export default function Logo({ boolCompact = false }) {
  return (
    <img
      src={strLogoSciemPass}
      alt="SCIEM-PASS"
      className={`h-[87px] w-auto ${boolCompact ? "scale-[0.82] origin-top-left -mb-0.5" : ""
        }`}
    />
  );
}