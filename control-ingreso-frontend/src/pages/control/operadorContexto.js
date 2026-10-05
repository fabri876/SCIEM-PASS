import { createContext, useContext } from "react";

export const ContextoOperador = createContext(null);

export function useOperador() {
  const ctx = useContext(ContextoOperador);
  if (!ctx) throw new Error("useOperador debe usarse dentro de OperadorProvider");
  return ctx;
}