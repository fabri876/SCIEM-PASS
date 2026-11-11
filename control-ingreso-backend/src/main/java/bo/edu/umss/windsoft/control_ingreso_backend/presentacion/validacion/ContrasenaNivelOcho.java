package bo.edu.umss.windsoft.control_ingreso_backend.presentacion.validacion;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Constraint(validatedBy = ContrasenaNivelOchoValidator.class)
@Target(FIELD)
@Retention(RUNTIME)
public @interface ContrasenaNivelOcho {
    String message() default "La nueva contraseña debe tener 12 caracteres, mayúscula, minúscula, número y especial; sin repeticiones o secuencias.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
