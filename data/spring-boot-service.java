package com.gemini.system.service;

import com.gemini.system.dto.ProductCreateRequest;
import com.gemini.system.dto.ProductResponse;

import java.util.Optional;

/**
 * Defines the business operations for Products.
 */
public interface ProductService {
    
    /**
     * Creates a new product.
     *
     * @param request The validated product creation payload.
     * @return The persisted product as a response record.
     */
    ProductResponse createProduct(ProductCreateRequest request);

    /**
     * Retrieves a product by its SKU.
     *
     * @param sku The business identifier.
     * @return An Optional containing the product response if found.
     */
    Optional<ProductResponse> getProductBySku(String sku);
}