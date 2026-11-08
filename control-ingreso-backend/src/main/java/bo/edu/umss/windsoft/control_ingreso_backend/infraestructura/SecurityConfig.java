package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAccessDeniedHandler;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAuthenticationEntryPoint;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer; // <-- ESTA ES LA LÍNEA QUE FALTABA
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                           JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint,
                           JwtAccessDeniedHandler jwtAccessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
        this.jwtAccessDeniedHandler = jwtAccessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(jwtAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // El navegador manda un preflight OPTIONS sin el header Authorization
                        // antes de cualquier POST/PUT/PATCH (o de cualquier request con ese
                        // header). Si no se deja pasar libre, Spring Security lo bloquea con
                        // 401 antes de que llegue la petición real, y el fetch() del frontend
                        // falla como error de CORS sin ni siquiera intentar autenticar.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/registro", "/api/auth/registro-personal").denyAll()
                        .requestMatchers(HttpMethod.GET, "/api/publico/examenes/proximos", "/api/publico/examenes/cambios", "/api/publico/examenes/pasados", "/api/publico/examenes/pasados/*/pdf").permitAll()
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/ping",
                                "/api/v1/health"
                        ).permitAll()
                        // TC-217 (QA): estas rutas estaban 100% públicas (sin JWT). Ahora
                        // exigen sesión — cualquier rol logueado puede usarlas, ya que
                        // tanto docentes como el administrador trabajan con habilitaciones.
                        .requestMatchers(
                                "/api/motivos-inhabilitacion/**",
                                "/api/motivosinhabilitacion/**",
                                "/api/habilitaciones/**",
                                "/api/habilitacion/**",
                                "/habilitacion/**"
                        ).authenticated()
                        // HU06: el operador puede registrar incidencias (y ver lo que
                        // necesita su formulario), pero no autorizar ingresos
                        // excepcionales ni gestionar incidencias. La materia del
                        // docente se valida en el servicio.
                        .requestMatchers(HttpMethod.POST, "/api/incidencias")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers(HttpMethod.GET, "/api/incidencias/catalogos",
                                "/api/incidencias/ambientes", "/api/incidencias/aulas-asignadas",
                                "/api/incidencias/estudiante")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers(HttpMethod.POST, "/api/ingresos-excepcionales")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers("/api/incidencias/**", "/api/ingresos-excepcionales/**",
                                "/api/monitoreo/**")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/admin/usuarios").hasAnyRole("ADMINISTRADOR", "DOCENTE")
                        .requestMatchers("/api/admin/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/grupos/vinculaciones").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/grupos", "/api/grupos/docentes/asignar")
                                .hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/grupos/**")
                                .hasAnyRole("ADMINISTRADOR", "DOCENTE")
                        // HU14: Expulsiones (antes que /api/examenes/** para que se evalúen primero).
                        .requestMatchers(HttpMethod.POST, "/api/examenes/*/expulsiones")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers(HttpMethod.GET, "/api/examenes/*/expulsiones",
                                "/api/examenes/*/expulsiones/pendientes",
                                "/api/examenes/*/expulsiones/pendientes/total")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers(HttpMethod.PUT, "/api/examenes/*/expulsiones/*/autorizar",
                                "/api/examenes/*/expulsiones/*/denegar")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/expulsiones/pendientes",
                                "/api/expulsiones/historial")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")
                        .requestMatchers("/api/admin/expulsiones").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/face/**").hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR", "ESTUDIANTE")

                        .requestMatchers("/api/v1/control/**").hasAnyRole("DOCENTE", "ADMINISTRADOR", "OPERADOR")

                        .requestMatchers("/api/reportes/intentos-incorrectos/**").hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/examenes/**").hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/usuarios/**").hasAnyRole("ADMINISTRADOR", "DOCENTE")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
