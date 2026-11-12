package bo.edu.umss.windsoft.control_ingreso_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class ControlIngresoBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ControlIngresoBackendApplication.class, args);
	}

}
