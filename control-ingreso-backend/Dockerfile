# Etapa de compilación
FROM maven:3.9.6-eclipse-temurin-21 AS build
COPY . /app
WORKDIR /app
RUN mvn clean package -DskipTests -Plocal

# Etapa de ejecución
FROM eclipse-temurin:21-jre
COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8080
# Aquí ya incluimos los límites de memoria RAM que usamos en Railway
ENTRYPOINT ["java", "-Xmx256m", "-Xss512k", "-jar", "/app/app.jar"]