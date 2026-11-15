# Etapa de compilación
FROM maven:3.9.6-eclipse-temurin-21 AS build
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests -Plocal

# Etapa de ejecución
FROM eclipse-temurin:21-jre

# --- INSTALACIÓN DE PG_DUMP Y PSQL ---
RUN apt-get update && apt-get install -y curl ca-certificates lsb-release \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y postgresql-client-17 \
 && rm -rf /var/lib/apt/lists/*
# -------------------------------------

COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8080
# Aquí ya incluimos los límites de memoria RAM que usamos en Railway
ENTRYPOINT ["java", "-Xmx256m", "-Xss512k", "-jar", "/app/app.jar"]