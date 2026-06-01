package com.nilsson;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

public class ArchUnitTest {

    @Test
    public void testLayeringCheck() {
        JavaClasses importedClasses = new ClassFileImporter()
                .withImportOption(new ImportOption.DoNotIncludeTests())
                .importPackages("com.nilsson");

        ArchRule layeringCheck = layeredArchitecture()
                .consideringOnlyDependenciesInAnyPackage(
                        "com.nilsson.controller..",
                        "com.nilsson.service..",
                        "com.nilsson.repository..",
                        "com.nilsson.model.."
                )
                .layer("Controller").definedBy("com.nilsson.controller..")
                .layer("Service").definedBy("com.nilsson.service..")
                .layer("Repository").definedBy("com.nilsson.repository..")
                .layer("Model").definedBy("com.nilsson.model..")
                
                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller", "Service")
                .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");

        layeringCheck.check(importedClasses);
    }
}
