# Build stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies (cache layer)
RUN mvn dependency:go-offline
COPY src ./src
# Build the jar
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/backend-*.jar app.jar
EXPOSE 8080
# Render sets the PORT env var, but Micronaut defaults to 8080. 
# We map it to Micronaut's port using JVM args
ENTRYPOINT ["java", "-Dmicronaut.server.port=${PORT:8080}", "-jar", "app.jar"]
