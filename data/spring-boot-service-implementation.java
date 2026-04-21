package com.gemini.system.service.impl;

import com.gemini.system.dto.ProductCreateRequest;
import com.gemini.system.dto.ProductResponse;
import com.gemini.system.entity.Product;
import com.gemini.system.repository.ProductRepository;
import com.gemini.system.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Default implementation of the ProductService.
 */
@Service
public class DefaultProductService implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(DefaultProductService.class);
    
    private final ProductRepository productRepository;

    // Constructor injection guarantees the repository is never null
    public DefaultProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductCreateRequest request) {
        log.info("Attempting to create product with SKU: {}", request.sku());

        // In a real system, you would check for SKU uniqueness here 
        // before attempting the save to avoid database constraint exceptions.
        
        Product product = new Product(request.sku(), request.name(), request.price());
        Product savedProduct = productRepository.save(product);
        
        log.debug("Successfully created product ID: {}", savedProduct.getId());
        
        return mapToResponse(savedProduct);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProductResponse> getProductBySku(String sku) {
        log.debug("Fetching product by SKU: {}", sku);
        
        return productRepository.findBySku(sku)
                .map(this::mapToResponse);
    }

    /**
     * Maps an internal Entity to an external DTO.
     */
    private ProductResponse mapToResponse(Product product) {
        return new ProductResponse(
                product.getSku(),
                product.getName(),
                product.getPrice()
        );
    }
}