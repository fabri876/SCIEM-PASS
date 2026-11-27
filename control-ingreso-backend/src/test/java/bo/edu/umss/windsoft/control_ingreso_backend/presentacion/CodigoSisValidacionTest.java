package bo.edu.umss.windsoft.control_ingreso_backend.presentacion;

import bo.edu.umss.windsoft.control_ingreso_backend.presentacion.dto.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CodigoSisValidacionTest {
    @Test void ambosRegistrosExigenNueveDigitosSinModificarIdentidadesExistentes() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (int codigo : new int[]{20298113, 202981131, 2026981131}) {
                var admin = new CrearUsuarioDto();
                admin.setCodigoSis(codigo);
                var registro = new RegistroUsuarioRequestDTO();
                registro.setCodigoSis(String.valueOf(codigo));
                boolean invalido = codigo != 202981131;
                assertEquals(invalido, validator.validate(admin).stream()
                        .anyMatch(v -> v.getPropertyPath().toString().equals("codigoSis")));
                assertEquals(invalido, validator.validate(registro).stream()
                        .anyMatch(v -> v.getPropertyPath().toString().equals("codigoSis")));
            }
        }
    }
}
