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
 * "self-start" es necesario porque LoginForm envuelve este componente
 * en un contenedor flex-col (para centrar el resto del formulario más
 * abajo): sin esto, el align-items:stretch por defecto de flexbox
 * estira la imagen al ancho completo del contenedor y la deforma. En
 * cualquier otro lugar donde se use Logo (Header, RegistroForm, que no
 * son flex-col) esta clase simplemente no tiene efecto.
 */
export default function Logo({ boolCompact = false }) {
  return (
    <img
      src={strLogoSciemPass}
      alt="SCIEM-PASS"
      className={
        boolCompact ? "h-[51px] w-auto self-start" : "h-[62px] w-auto self-start"
      }
    />
  );
}
