package bo.edu.umss.windsoft.control_ingreso_backend.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Cola transaccional para asegurar la destruccion eventual de fotos reemplazadas. */
@Entity
@Table(name = "limpieza_foto_biometrica")
public class LimpiezaFotoBiometrica {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ruta", nullable = false, unique = true, length = 500)
    private String ruta;

    // La tabla existente conserva foto_path como columna obligatoria por
    // compatibilidad con la cola original de limpieza. Ambas columnas deben
    // recibir la misma ruta hasta que se haga una migracion de consolidacion.
    @Column(name = "foto_path", nullable = false, length = 500)
    private String fotoPath;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    public Long getId() { return id; }
    public String getRuta() { return ruta; }
    public void setRuta(String ruta) {
        this.ruta = ruta;
        this.fotoPath = ruta;
    }
    public String getFotoPath() { return fotoPath; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
}
