package com.gemini.system.controller;

import com.gemini.system.dto.ProductCreateRequest;
import com.gemini.system.dto.ProductResponse;
import com.gemini.system.service.ProductService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * REST Controller for managing Product resources.
 */
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService productService;

    // Constructor injection
    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * Endpoint to create a new product.
     *
     * @param request Validated JSON payload mapped to a record.
     * @return 201 Created with the location header and the created resource.
     */
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductCreateRequest request) {
        log.info("Received request to create product: {}", request.sku());
        
        ProductResponse response = productService.createProduct(request);

        // Best practice: Return HTTP 201 Created with a Location header pointing to the new resource
        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{sku}")
                .buildAndExpand(response.sku())
                .toUri();

        return ResponseEntity.created(location).body(response);
    }

    /**
     * Endpoint to retrieve a product by SKU.
     *
     * @param sku The product SKU from the path variable.
     * @return 200 OK with the product, or 404 Not Found.
     */
    @GetMapping("/{sku}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable String sku) {
        log.info("Received request to fetch product: {}", sku);
        
        return productService.getProductBySku(sku)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    log.warn("Product with SKU {} not found", sku);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
                });
    }
}