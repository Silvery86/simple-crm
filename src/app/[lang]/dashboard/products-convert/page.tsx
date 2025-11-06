'use client';

import { useState } from 'react';
import { useLang } from '@/lib/hooks/useLang';
import { useGlobalLoader } from '@/components/ui/global-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImportModal } from '@/components/products/import-modal';
import { ExportModal } from '@/components/products/export-modal';
import { 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Package,
  Image as ImageIcon,
  DollarSign,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  sku?: string;
  image?: string;
  images?: Array<{ id: number; src: string; variant_ids: number[] }>;
  body_html?: string;
  variants?: any[];
  tags?: string[];
  vendor?: string;
}

/**
 * Purpose: Products converter page with data table, import/export functionality.
 * Params: N/A
 * Returns:
 *   - React.ReactNode — Products converter UI with table and modals.
 */
export default function ProductsConvertPage() {
  const { t } = useLang();
  const { showLoader, hideLoader } = useGlobalLoader();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  /**
   * Purpose: Handle product import from JSON file.
   * Params:
   *   - data: any[] — Raw product data from JSON file.
   * Returns:
   *   - Promise<void> — Resolves when products are loaded into table.
   */
  const handleImport = async (data: any[]) => {
    showLoader(t('page.productsConvert.loading.importing') || 'Importing products...');
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Transform Shopify JSON to internal format
      const transformedProducts: Product[] = data.map((item, index) => ({
        id: item.id?.toString() || `prod-${index + 1}`,
        title: item.title || item.name || 'Untitled Product',
        price: parseFloat(item.price || item.variants?.[0]?.price || '0'),
        sku: item.sku || item.variants?.[0]?.sku || '',
        image: item.image?.src || item.images?.[0]?.src || '',
        variants: item.variants || [],
        tags: item.tags || [],
        vendor: item.vendor || '',
      }));
      
      setProducts(transformedProducts);
    } finally {
      hideLoader();
    }
  };

  /**
   * Purpose: Escape CSV value properly.
   * Params:
   *   - value: any — Value to escape.
   * Returns:
   *   - string — Escaped CSV value.
   */
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  /**
   * Purpose: Convert HTML to plain text.
   * Params:
   *   - html: string — HTML content.
   * Returns:
   *   - string — Plain text.
   */
  const htmlToText = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\\u003C/g, '<')
      .replace(/\\u003E/g, '>')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Purpose: Find image for variant from product images array.
   * Params:
   *   - product: any — Product object.
   *   - variantId: number — Variant ID.
   * Returns:
   *   - string — Image URL.
   */
  const getVariantImage = (product: any, variantId: number): string => {
    // First, check if variant has featured_image
    const variant = product.variants?.find((v: any) => v.id === variantId);
    if (variant?.featured_image?.src) return variant.featured_image.src;
    
    // Second, find image with variant_ids containing this variant
    if (product.images && Array.isArray(product.images)) {
      const variantImage = product.images.find((img: any) => 
        img.variant_ids && img.variant_ids.includes(variantId)
      );
      if (variantImage) return variantImage.src;
    }
    
    // Third, use first product image
    if (product.images && product.images.length > 0) {
      return product.images[0].src;
    }
    
    // Finally, fallback to product.image
    return product.image || '';
  };

  /**
   * Purpose: Get all product images as comma-separated string.
   * Params:
   *   - product: any — Product object.
   * Returns:
   *   - string — Comma-separated image URLs.
   */
  const getAllProductImages = (product: any): string => {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map((img: any) => img.src).join(', ');
    }
    return product.image || '';
  };

  /**
   * Purpose: Handle product export to CSV format.
   * Params:
   *   - format: 'woocommerce-csv' | 'shopify-csv' — Export format.
   * Returns:
   *   - Promise<void> — Resolves when file is downloaded.
   */
  const handleExport = async (format: 'woocommerce-csv' | 'shopify-csv') => {
    showLoader(t('page.productsConvert.loading.exporting') || 'Exporting products...');
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let csvContent = '';
      
      if (format === 'woocommerce-csv') {
        // WooCommerce Product CSV Export Format (48 columns)
        const headers = [
          'ID', 'Type', 'SKU', 'GTIN, UPC, EAN, or ISBN', 'Name', 'Published',
          'Is featured?', 'Visibility in catalog', 'Short description', 'Description',
          'Date sale price starts', 'Date sale price ends', 'Tax status', 'Tax class',
          'In stock?', 'Stock', 'Low stock amount', 'Backorders allowed?', 'Sold individually?',
          'Weight (lbs)', 'Length (in)', 'Width (in)', 'Height (in)', 'Allow customer reviews?',
          'Purchase note', 'Sale price', 'Regular price', 'Categories', 'Tags', 'Shipping class',
          'Images', 'Download limit', 'Download expiry days', 'Parent', 'Grouped products',
          'Upsells', 'Cross-sells', 'External URL', 'Button text', 'Position',
          'WCPA Forms', 'Woo Variation Gallery Images', 'Swatches Attributes', 'Brands',
          'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global'
        ];
        
        csvContent = headers.map(h => escapeCsvValue(h)).join(',') + '\n';
        
        filteredProducts.forEach((product) => {
          const hasVariants = product.variants && product.variants.length > 0;
          const productType = hasVariants ? 'variable' : 'simple';
          
          // Collect all unique attribute values from variants
          let attributeValues = 'S, M, L, XL, 2XL, 3XL'; // default
          if (hasVariants && product.variants) {
            const uniqueValues = [...new Set(product.variants.map((v: any) => 
              v.option1 || v.title || ''
            ).filter(Boolean))];
            if (uniqueValues.length > 0) {
              attributeValues = uniqueValues.join(', ');
            }
          }

          // Parent product (variable or simple)
          const parentRow = [
            product.id,                                     // ID
            productType,                                    // Type
            hasVariants ? '' : (product.sku || ''),        // SKU (empty for variable products)
            '',                                             // GTIN
            product.title,                                  // Name
            '1',                                            // Published
            '0',                                            // Is featured
            'visible',                                      // Visibility
            '',                                             // Short description
            htmlToText(product.body_html || ''),           // Description (convert HTML to text)
            '',                                             // Date sale price starts
            '',                                             // Date sale price ends
            'taxable',                                      // Tax status
            '',                                             // Tax class
            '1',                                            // In stock
            '',                                             // Stock
            '',                                             // Low stock amount
            '0',                                            // Backorders allowed
            '0',                                            // Sold individually
            '',                                             // Weight
            '',                                             // Length
            '',                                             // Width
            '',                                             // Height
            '1',                                            // Allow reviews
            '',                                             // Purchase note
            '',                                             // Sale price
            hasVariants ? '' : product.price,               // Regular price (empty for variable)
            'Uncategorized',                                // Categories
            product.tags?.join(', ') || '',                 // Tags
            '',                                             // Shipping class
            getAllProductImages(product),                   // Images (all product images)
            '',                                             // Download limit
            '',                                             // Download expiry days
            '',                                             // Parent (empty for parent product)
            '',                                             // Grouped products
            '',                                             // Upsells
            '',                                             // Cross-sells
            '',                                             // External URL
            '',                                             // Button text
            '0',                                            // Position
            '',                                             // WCPA Forms
            '',                                             // Woo Variation Gallery Images
            '',                                             // Swatches Attributes
            '',                                             // Brands
            hasVariants ? 'Size' : '',                      // Attribute 1 name
            hasVariants ? attributeValues : '',             // Attribute 1 value(s) - all values from variants
            hasVariants ? '1' : '',                         // Attribute 1 visible
            hasVariants ? '1' : ''                          // Attribute 1 global (changed to 1 = used for variations)
          ];
          csvContent += parentRow.map(v => escapeCsvValue(v)).join(',') + '\n';
          
          // Variations (if product has variants)
          if (hasVariants && product.variants) {
            product.variants.forEach((variant: any, index: number) => {
              const variantTitle = variant.title || variant.option1 || 'Variant';
              // Generate truly unique SKU using variant ID to avoid duplicates
              // Shopify variants can have same SKU across different products
              const variantSku = variant.sku 
                ? `${variant.sku}-${variant.id}` 
                : `SKU-${variant.id}`;
              
              const variantRow = [
                variant.id || `${product.id}-${index + 1}`,  // ID
                'variation',                                   // Type
                variantSku,                                   // SKU (must be unique!)
                '',                                           // GTIN
                `${product.title} - ${variantTitle}`,        // Name
                '1',                                          // Published
                '0',                                          // Is featured
                'visible',                                    // Visibility
                '',                                           // Short description
                '',                                           // Description
                '',                                           // Date sale price starts
                '',                                           // Date sale price ends
                'taxable',                                    // Tax status
                'parent',                                     // Tax class
                '1',                                          // In stock
                '',                                           // Stock
                '',                                           // Low stock amount
                '0',                                          // Backorders allowed
                '0',                                          // Sold individually
                '',                                           // Weight
                '',                                           // Length
                '',                                           // Width
                '',                                           // Height
                '0',                                          // Allow reviews
                '',                                           // Purchase note
                '',                                           // Sale price
                variant.price || product.price,               // Regular price
                '',                                           // Categories
                '',                                           // Tags
                '',                                           // Shipping class
                getVariantImage(product, variant.id),        // Images (specific to variant or fallback)
                '',                                           // Download limit
                '',                                           // Download expiry days
                product.id,                                   // Parent (ID of parent product)
                '',                                           // Grouped products
                '',                                           // Upsells
                '',                                           // Cross-sells
                '',                                           // External URL
                '',                                           // Button text
                String(index + 1),                            // Position
                '',                                           // WCPA Forms
                '',                                           // Woo Variation Gallery Images
                '',                                           // Swatches Attributes
                '',                                           // Brands
                'Size',                                       // Attribute 1 name
                variant.option1 || variant.title || '',       // Attribute 1 value(s)
                '',                                           // Attribute 1 visible
                '',                                           // Attribute 1 global
              ];
              csvContent += variantRow.map(v => escapeCsvValue(v)).join(',') + '\n';
            });
          }
        });
      } else {
        // Shopify CSV format
        csvContent = 'Handle,Title,Vendor,Tags,Variant SKU,Variant Price,Image Src\n';
        
        filteredProducts.forEach((product) => {
          const handle = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const row = [
            handle,
            product.title,
            product.vendor || '',
            product.tags?.join(', ') || '',
            product.sku || '',
            product.price,
            product.image || ''
          ];
          csvContent += row.map(v => escapeCsvValue(v)).join(',') + '\n';
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${format}-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      hideLoader();
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search or items per page changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            {t('page.productsConvert.title') || 'Products Converter'}
          </h1>
          <p className="text-muted-foreground">
            {t('page.productsConvert.subtitle') || 'Import and export products between platforms'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('page.productsConvert.import.button') || 'Import'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowExportModal(true)}
            disabled={products.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('page.productsConvert.export.button') || 'Export'}
          </Button>
        </div>
      </div>

      {products.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('page.productsConvert.stats.totalProducts') || 'Total Products'}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('page.productsConvert.stats.withImages') || 'With Images'}
              </CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.image).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('page.productsConvert.stats.avgPrice') || 'Avg. Price'}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('page.productsConvert.stats.withTags') || 'With Tags'}
              </CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.tags && p.tags.length > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {products.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('page.productsConvert.search.placeholder') || 'Search products...'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t('page.productsConvert.table.itemsPerPage') || 'Show'}:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      )}

      {products.length > 0 ? (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium w-20">
                        {t('page.productsConvert.table.image') || 'Image'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('page.productsConvert.table.title') || 'Title'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium w-32">
                        {t('page.productsConvert.table.sku') || 'SKU'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium w-28">
                        {t('page.productsConvert.table.price') || 'Price'}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        {t('page.productsConvert.table.tags') || 'Tags'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="h-14 w-14 object-cover rounded border"
                            />
                          ) : (
                            <div className="h-14 w-14 bg-muted rounded flex items-center justify-center border">
                              <ImageIcon className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground line-clamp-2">{product.title}</p>
                          {product.vendor && (
                            <p className="text-sm text-muted-foreground mt-1">{product.vendor}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {product.sku || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {product.tags && product.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.tags.slice(0, 3).map((tag, idx) => (
                                <span 
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                              {product.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground font-medium">
                                  +{product.tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('page.productsConvert.table.showing') || 'Showing'}{' '}
                <span className="font-medium text-foreground">{startIndex + 1}</span>
                {' '}{t('page.productsConvert.table.to') || 'to'}{' '}
                <span className="font-medium text-foreground">{Math.min(endIndex, filteredProducts.length)}</span>
                {' '}{t('page.productsConvert.table.of') || 'of'}{' '}
                <span className="font-medium text-foreground">{filteredProducts.length}</span>
                {' '}{t('page.productsConvert.table.results') || 'results'}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('page.productsConvert.table.previous') || 'Previous'}
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  {t('page.productsConvert.table.next') || 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('page.productsConvert.empty.title') || 'No Products Yet'}
            </h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              {t('page.productsConvert.empty.description') || 'Import a Shopify JSON file to get started with product conversion'}
            </p>
            <Button onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('page.productsConvert.import.button') || 'Import Products'}
            </Button>
          </CardContent>
        </Card>
      )}

      <ImportModal 
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
      
      <ExportModal 
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        productsCount={filteredProducts.length}
      />
    </div>
  );
}
