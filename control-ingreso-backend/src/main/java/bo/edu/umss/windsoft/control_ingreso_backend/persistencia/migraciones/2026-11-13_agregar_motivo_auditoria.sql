-- HU19: Registrar en auditoría el motivo de expulsión, además de estudiante,
-- examen, aula, responsable y fecha/hora.
-- La tabla historialauditoria aún guarda un campo accion genérico, pero el
-- motivo ya no depende de la longitud de ese texto, así que se persiste de
-- forma separada y siempre completo.
ALTER TABLE historialauditoria
ADD COLUMN IF NOT EXISTS motivo text;
