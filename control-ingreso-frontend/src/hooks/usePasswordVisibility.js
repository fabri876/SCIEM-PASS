import { useState } from "react";

/**
 * usePasswordVisibility.js
 *
 * Reemplaza la función togglePassword() que estaba suelta en un <script>
 * al final del HTML original. En React esa lógica no debe tocar el DOM
 * directamente (document.getElementById), sino vivir en un estado.
 *
 * La sacamos a un hook aparte (y no la dejamos escrita directo dentro de
 * RegistroForm) porque el Login va a necesitar exactamente el mismo
 * comportamiento para su propio campo de contraseña.
 */
export default function usePasswordVisibility() {
  const [boolShowPassword, setBoolShowPassword] = useState(false);

  const fnToggleShowPassword = () => setBoolShowPassword((prev) => !prev);

  // Lo que hay que ponerle al atributo "type" del <input>
  const strInputType = boolShowPassword ? "text" : "password";

  return { boolShowPassword, fnToggleShowPassword, strInputType };
}
