package com.gemini.system.repository;

import com.gemini.system.dto.projection.ProductSummary;
import com.gemini.system.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Best-practice Data Access Object for Product entities.
 * Prioritizes performance via projections, pagination, and bulk updates.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    // --- 1. Standard Indexed Queries ---
    
    /**
     * Standard Optional lookup by business key.
     */
    Optional<Product> findBySku(String sku);

    // --- 2. Record Projections & Pagination ---

    /**
     * Best Practice Read: Fetches only required fields directly into a Record.
     * Enforces pagination to prevent memory overflow.
     *
     * @param keyword The name substring to search for.
     * @param pageable Contains page number, size, and sorting directives.
     * @return A paginated list of lightweight ProductSummary records.
     */
    Page<ProductSummary> findByNameContainingIgnoreCase(String keyword, Pageable pageable);

    // --- 3. Optimized Bulk Operations ---

    /**
     * Best Practice Update: Bypasses the Hibernate First-Level Cache (Persistence Context).
     * Executes a single UPDATE statement directly against MySQL.
     *
     * @param sku The product SKU to update.
     * @param newPrice The new price to set.
     * @return The number of rows affected.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Product p SET p.price = :newPrice WHERE p.sku = :sku")
    int updatePriceBySku(@Param("sku") String sku, @Param("newPrice") BigDecimal newPrice);
}