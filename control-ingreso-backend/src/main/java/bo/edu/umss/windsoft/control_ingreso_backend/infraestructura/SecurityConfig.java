package bo.edu.umss.windsoft.control_ingreso_backend.infraestructura;

import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAccessDeniedHandler;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAuthenticationEntryPoint;
import bo.edu.umss.windsoft.control_ingreso_backend.infraestructura.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer; // <-- ESTA ES LA LÍNEA QUE FALTABA
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
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
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
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
                        .requestMatchers(HttpMethod.GET, "/api/publico/examenes/proximos", "/api/publico/examenes/cambios").permitAll()
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
                        .requestMatchers("/api/incidencias/**", "/api/ingresos-excepcionales/**",
                                "/api/monitoreo/**")
                                .hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/admin/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.GET, "/api/grupos/vinculaciones").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/grupos", "/api/grupos/docentes/asignar")
                                .hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/api/grupos/**")
                                .hasAnyRole("ADMINISTRADOR", "DOCENTE")
                        .requestMatchers("/api/examenes/**").hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/usuarios/**").hasAnyRole("ADMINISTRADOR", "DOCENTE")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
