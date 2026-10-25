// Estado del diseño del panel del ayudante (solo visual).
// La pantalla de registro de ingreso pide "pantalla completa" para ocultar el menú lateral.
import { createContext, useContext } from "react";

export const LayoutAyudanteContexto = createContext({ setBoolPantallaCompleta: () => {} });

export function useLayoutAyudante() {
  return useContext(LayoutAyudanteContexto);
}
