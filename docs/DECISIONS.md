# Product Decisions Required

This document tracks decisions that need Product Owner input before implementation.

---

## ⚠️ Inventory Management - When to Decrement Stock

**Status:** Pending PO Decision  
**Feature:** Cart / Checkout  
**Date Added:** Feb 4, 2026

### Question

**When should product inventory (`quantity_in_stock`) be decremented?**

### Current Implementation

The cart currently **validates** stock availability but does **NOT decrement** the product's `quantity_in_stock` when items are added to cart. Stock is only checked, not reserved.

---

### Option 1: Decrement at Checkout Only (Recommended)

**How it works:**
- Adding to cart: Validates stock, but doesn't change inventory
- Removing from cart: No inventory change needed
- At checkout: Decrement inventory when order is placed/paid

**Pros:**
- Simple implementation
- No issues with abandoned carts holding inventory
- Stock isn't "locked" by users who never complete purchase
- Industry standard (Amazon, Shopify, etc.)

**Cons:**
- Two users could add the last item to cart, but only one can checkout
- Requires stock re-validation at checkout time

---

### Option 2: Decrement on Add to Cart (Reserve Stock)

**How it works:**
- Adding to cart: Decrement `quantity_in_stock` immediately
- Removing from cart: Restore `quantity_in_stock`
- Cart expiration: Need background job to restore stock from abandoned carts

**Pros:**
- Guarantees stock for users who add to cart
- No surprises at checkout

**Cons:**
- Complex implementation (need cart expiration logic)
- Abandoned carts hold inventory hostage
- Need background jobs to clean up expired carts
- Can frustrate other users who see "out of stock" when items are just in carts

---

### Recommendation

**Option 1 (Decrement at Checkout)** is recommended for most e-commerce apps. Reserve stock only during the checkout process with a short timeout (e.g., 10-15 minutes).

---

### Decision

**Selected Option:** _________________

**Decided By:** _________________

**Date:** _________________

**Notes:**


