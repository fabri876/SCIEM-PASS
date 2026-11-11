package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.validacion;

import bo.edu.umss.windsoft.control_ingreso_backend.dominio.PoliticaContrasena;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ContrasenaNivelOchoValidator implements ConstraintValidator<ContrasenaNivelOcho, String> {
    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return valor != null && PoliticaContrasena.validarNivelOcho(valor).isEmpty();
    }
}
