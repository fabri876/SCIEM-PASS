# Comparacion local de hashing de contrasenas

Fecha: 2026-10-30. Rama: isma.

## Objetivo y configuraciones

Comprobar si sustituir BCrypt reduce el tiempo y la CPU del registro y del login.
Se midieron las implementaciones reales de Spring Security Crypto 7.1.1:

- BCrypt, costo 10: configuracion actual de `new BCryptPasswordEncoder()`.
- PBKDF2 con HMAC-SHA-256, 600.000 iteraciones, salt aleatorio de 16 bytes
  y salida de 256 bits. Se uso la recomendacion de iteraciones de OWASP,
  sin reducir la proteccion para favorecer el resultado.

Fuentes: [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
y [API de Spring Security](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/crypto/password/Pbkdf2PasswordEncoder.html).

## Metodo

Windows, Java Temurin 21.0.12.1, procesador Intel Family 6 Model 140 Stepping 2.
JVM con heap inicial de 64 MB y maximo de 256 MB.
Se uso una contrasena sintetica, sin acceder a usuarios reales ni a la BD.
Calentamiento de 15 registros y verificaciones por algoritmo, seguido de dos rondas
en orden inverso. Cada operacion tiene 30 muestras por ronda.
El tiempo de CPU corresponde al hilo de la prueba, obtenido con ThreadMXBean.

## Resultados en milisegundos

| Algoritmo | Ronda | Operacion | Mediana | P95 | CPU media |
|---|---:|---|---:|---:|---:|
| BCrypt costo 10 | 1 | Crear hash | 81,083 | 94,141 | 78,646 |
| BCrypt costo 10 | 1 | Verificar | 82,696 | 87,405 | 79,688 |
| PBKDF2 SHA-256 600.000 | 1 | Crear hash | 256,026 | 383,630 | 265,104 |
| PBKDF2 SHA-256 600.000 | 1 | Verificar | 266,930 | 412,986 | 287,500 |
| PBKDF2 SHA-256 600.000 | 2 | Crear hash | 238,368 | 351,950 | 241,667 |
| PBKDF2 SHA-256 600.000 | 2 | Verificar | 344,323 | 472,537 | 318,750 |
| BCrypt costo 10 | 2 | Crear hash | 94,672 | 111,389 | 89,063 |
| BCrypt costo 10 | 2 | Verificar | 103,665 | 120,618 | 96,875 |

Promediando las medianas de ambas rondas, PBKDF2 tarda aproximadamente 2,81 veces
mas al crear el hash y 3,28 veces mas al verificarlo. La CPU media tambien fue
mayor: aproximadamente 3,02 y 3,43 veces, respectivamente.

## Conclusion y limites

En este equipo, cambiar a esta configuracion de PBKDF2 no reduce recursos.
Esta primera comparacion descarto PBKDF2 como mejora de rendimiento. La prueba
posterior con Argon2id, documentada abajo, si justifico cambiar el algoritmo.

Esta es una microprueba secuencial local, no un ensayo del servidor de produccion.
No mide memoria por algoritmo, concurrencia, red, base de datos ni tiempos de la
carga masiva completa. La variacion entre rondas muestra que la carga del equipo
influye; no se deben trasladar estos tiempos exactos a otro servidor.

## Repetir la prueba

Desde la raiz del repositorio, en PowerShell y con las dependencias Maven del
proyecto ya descargadas:

```powershell
$taskCp = "$env:USERPROFILE/.m2/repository/org/springframework/security/spring-security-crypto/7.1.1/spring-security-crypto-7.1.1.jar;$env:USERPROFILE/.m2/repository/commons-logging/commons-logging/1.3.6/commons-logging-1.3.6.jar;$env:USERPROFILE/.m2/repository/org/springframework/spring-core/7.0.9/spring-core-7.0.9.jar"
java -Xms64m -Xmx256m -cp $taskCp tools/PasswordHashBenchmark.java
```

El programa imprime CSV y termina con error si una verificacion no coincide.
No forma parte de las pruebas automaticas de rendimiento, para evitar resultados
inestables en CI. No requiere levantar Spring ni conectarse a Supabase.

## Segunda comparacion: Argon2id y cambio aplicado

Se repitio la metodologia con Argon2id usando Spring Security y Bouncy Castle 1.83:
salt de 16 bytes, hash de 32 bytes, memoria de 19.456 KiB (19 MiB), dos iteraciones
y paralelismo 1. Es la configuracion minima indicada por OWASP, sin rebajar sus parametros.

| Algoritmo | Ronda | Operacion | Mediana ms | P95 ms | CPU media ms |
|---|---:|---|---:|---:|---:|
| BCrypt costo 10 | 1 | Crear hash | 95,026 | 102,527 | 93,229 |
| BCrypt costo 10 | 1 | Verificar | 94,944 | 101,092 | 90,104 |
| Argon2id 19 MiB / t2 / p1 | 1 | Crear hash | 63,070 | 79,084 | 55,208 |
| Argon2id 19 MiB / t2 / p1 | 1 | Verificar | 56,620 | 64,158 | 50,000 |
| Argon2id 19 MiB / t2 / p1 | 2 | Crear hash | 65,042 | 72,268 | 57,292 |
| Argon2id 19 MiB / t2 / p1 | 2 | Verificar | 66,521 | 76,058 | 61,979 |
| BCrypt costo 10 | 2 | Crear hash | 96,920 | 98,672 | 92,708 |
| BCrypt costo 10 | 2 | Verificar | 91,482 | 120,863 | 89,063 |

Promediando las medianas de esta segunda comparacion, el tiempo de crear un hash
bajo de 95,973 a 64,056 ms: reduccion aproximada de 33,3 %. La CPU media bajo de
92,969 a 56,250 ms (39,5 %). Esto mide solamente hashing, no el lote completo.
Por ejemplo, 100 hashes secuenciales equivaldrian aproximadamente a 9,6 frente
a 6,4 segundos; es una extrapolacion, no una medicion de 100 altas en la BD.

Argon2id requiere aproximadamente 19 MiB de memoria de trabajo por operacion,
ademas del resto de objetos de la implementacion. Esa cifra es el parametro del
algoritmo, no una medicion de RAM del proceso. No se paralelizo la carga masiva:
se evita multiplicar esta memoria por cientos de usuarios simultaneos.

Para repetir, agregar el JAR de Bouncy Castle al classpath anterior:

```powershell
$taskCp += ";$env:USERPROFILE/.m2/repository/org/bouncycastle/bcprov-jdk18on/1.83/bcprov-jdk18on-1.83.jar"
java -Xms64m -Xmx256m -cp $taskCp tools/PasswordHashBenchmark.java argon2
```

### Comportamiento del sistema

- `PasswordEncoderConfig` centraliza el encoder compartido por registro masivo,
  registro individual, registro de personal y cambios de contrasena.
- Los hashes nuevos tienen el prefijo `{argon2id}` y parametros autocontenidos.
- Se aceptan hashes BCrypt anteriores, con o sin prefijo `{bcrypt}`.
- Despues de un login correcto, un hash BCrypt se reemplaza por Argon2id usando
  la contrasena que acaba de verificarse. No se modifica el CI ni la clave.
- Un login incorrecto o una cuenta inactiva no migran el hash.
- La migracion agrega un hash nuevo al primer login antiguo; no ocurre en cada login.
- No se reutilizan hashes entre personas, ni se guardan claves en texto plano.
- No se ejecutaron altas ni actualizaciones sobre Supabase durante la prueba.

La columna `usuario.contraseniausuario` debe admitir el formato completo (aprox.
107 caracteres, cabe en VARCHAR(255) o TEXT). El mapeo JPA no fija un limite de
60; si un entorno externo lo restringio a 60, debe ampliarlo antes de desplegar.

Este cambio requiere actualizar el backend con su nueva dependencia Maven.
No cambia los formularios ni necesita cambios de frontend.

### Validacion del cambio

Se ejecutaron `PasswordEncoderConfigTest`, `PasswordHashMigrationTest`,
`AuthServiceTest`, `RegistroUsuarioServiceTest`, `QaRegistroTest` y
`CargaMasivaAcademicaTest`: 36 casos, 35 aprobados, uno omitido por la suite,
sin fallos ni errores. Cubren hashes distintos para la misma clave, rechazo de
claves incorrectas/texto plano, compatibilidad con BCrypt, migracion al entrar,
cuentas inactivas y validaciones del registro masivo.

Dos pruebas antiguas de login tenian desactualizado el mock de
`UsuarioBloqueoService`; se actualizaron para comprobar el servicio que ya
registra los intentos fallidos en su propia transaccion.
