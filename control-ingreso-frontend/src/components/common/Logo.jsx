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
 * poco más chico. Antes esto se lograba con un scale() de CSS (mecanismo
 * heredado de cuando el logo se dibujaba con divs), pero sobre una
 * imagen eso deja un hueco vacío reservado del tamaño original — se
 * ve "flotando" mal encajado. Ahora se ajusta directo con una altura
 * más chica, sin transform.
 *
 * Nota: este componente NO lleva "self-start" ni ninguna clase de
 * alineación — eso se decide en cada lugar donde se usa (por ejemplo,
 * LoginForm lo envuelve en un div con self-start para que no se estire
 * dentro de su contenedor flex-col). Ponerlo acá adentro rompía el
 * centrado vertical del Header, que también es flex.
 */
export default function Logo({ boolCompact = false }) {
  return (
    <img
      src={strLogoSciemPass}
      alt="SCIEM-PASS"
      className={boolCompact ? "h-[51px] w-auto" : "h-[62px] w-auto"}
    />
  );
}
