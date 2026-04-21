gemini-inventory-system/
├── pom.xml                                   # Maven dependencies and build plugins
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/gemini/system/
│   │   │       ├── InventoryApplication.java # Spring Boot startup class (@SpringBootApplication)
│   │   │       │
│   │   │       ├── config/                   # Global configuration classes
│   │   │       │   ├── OpenApiConfig.java    # Swagger/OpenAPI setup
│   │   │       │   ├── SecurityConfig.java   # Spring Security / JWT filters
│   │   │       │   └── ThreadPoolConfig.java # Virtual Threads & Async configurations
│   │   │       │
│   │   │       ├── controller/               # Presentation layer (REST Endpoints)
│   │   │       │   ├── ProductController.java
│   │   │       │   └── advice/               # Global REST exception handling
│   │   │       │       └── GlobalExceptionHandler.java (@ControllerAdvice)
│   │   │       │
│   │   │       ├── dto/                      # Data Transfer Objects (Java 21 Records)
│   │   │       │   ├── ProductCreateRequest.java
│   │   │       │   ├── ProductResponse.java
│   │   │       │   └── projection/           # DB Projections to avoid fetching full entities
│   │   │       │       └── ProductSummary.java
│   │   │       │
│   │   │       ├── entity/                   # Domain Model / JPA Entities (No DTOs here)
│   │   │       │   └── Product.java
│   │   │       │
│   │   │       ├── exception/                # Custom Business Exceptions
│   │   │       │   ├── ResourceNotFoundException.java
│   │   │       │   └── InvalidStateTransitionException.java
│   │   │       │
│   │   │       ├── repository/               # Data Access Layer (Spring Data JPA)
│   │   │       │   └── ProductRepository.java
│   │   │       │
│   │   │       ├── service/                  # Business Logic Interfaces
│   │   │       │   ├── ProductService.java
│   │   │       │   └── impl/                 # Implementation of business logic
│   │   │       │       └── DefaultProductService.java
│   │   │       │
│   │   │       └── util/                     # Pure, stateless utility functions
│   │   │           ├── CurrencyFormatter.java
│   │   │           └── SkuGenerator.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml               # Main configuration file
│   │       ├── application-dev.yml           # Environment-specific overrides
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/                # Liquibase or Flyway SQL scripts
│   │               ├── V1__init_schema.sql
│   │               └── V2__add_indexes.sql
│   │
│   └── test/                                 # Rigorous Testing Directory
│       ├── java/
│       │   └── com/gemini/system/
│       │       ├── controller/               # @WebMvcTest for API boundaries
│       │       ├── service/                  # @ExtendWith(MockitoExtension.class) for unit tests
│       │       └── integration/              # @SpringBootTest with Testcontainers
│       │           └── ProductIntegrationTest.java
│       │
│       └── resources/
│           └── application-test.yml          # Test-specific properties