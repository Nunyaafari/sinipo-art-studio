interface RequiredField {
  label: string;
  value: unknown;
}

interface CheckoutCustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

interface ProductVariantValidationShape {
  size: string;
  color: string;
  stockQuantity: string;
}

interface ProductGallerySelection {
  url: string;
}

interface ProductFormValidationShape {
  productType: "artwork" | "fashion";
  title: string;
  artist: string;
  price: string;
  category: string;
  style: string;
  size: string;
  dimensions: string;
  clothingSize: string;
  frameColor: string;
  description: string;
  gallery: ProductGallerySelection[];
  variants: ProductVariantValidationShape[];
}

interface BlogFormValidationShape {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
}

const hasValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
};

const validateRequiredFields = (fields: RequiredField[]): string | null => {
  const missingField = fields.find((field) => !hasValue(field.value));
  return missingField ? `${missingField.label} is required` : null;
};

export const validateEmailAddress = (value: string, label = "Email"): string | null => {
  const normalizedValue = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalizedValue) {
    return `${label} is required`;
  }

  if (!emailPattern.test(normalizedValue)) {
    return `${label} must be a valid email address`;
  }

  return null;
};

export const validateCheckoutPayload = (
  customerInfo: CheckoutCustomerInfo,
  itemCount: number
): string | null => {
  if (itemCount <= 0) {
    return "Add at least one item before checking out.";
  }

  const requiredFieldError = validateRequiredFields([
    { label: "First name", value: customerInfo.firstName },
    { label: "Last name", value: customerInfo.lastName },
    { label: "Phone number", value: customerInfo.phone },
    { label: "Address", value: customerInfo.address },
    { label: "City", value: customerInfo.city },
    { label: "Country", value: customerInfo.country },
  ]);

  if (requiredFieldError) {
    return requiredFieldError;
  }

  return validateEmailAddress(customerInfo.email);
};

export const validateAdminProductPayload = (
  formData: ProductFormValidationShape
): string | null => {
  const requiredFieldError = validateRequiredFields([
    { label: "Title", value: formData.title },
    { label: "Artist/brand", value: formData.artist },
    { label: "Price", value: formData.price },
    { label: "Category", value: formData.category },
    { label: "Style", value: formData.style },
    { label: "Description", value: formData.description },
  ]);

  if (requiredFieldError) {
    return requiredFieldError;
  }

  const parsedPrice = Number.parseFloat(formData.price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return "Price must be a valid amount greater than 0.";
  }

  const galleryCount = formData.gallery.filter((selection) => selection.url.trim()).length;
  if (galleryCount === 0) {
    return "Add at least one product image before saving.";
  }

  if (formData.productType === "artwork") {
    return validateRequiredFields([
      { label: "Size", value: formData.size },
      { label: "Dimensions", value: formData.dimensions },
      { label: "Frame color", value: formData.frameColor },
    ]);
  }

  if (!formData.variants.length) {
    return "Add at least one fashion variant before saving.";
  }

  const invalidVariant = formData.variants.find((variant) => {
    const parsedStock = Number.parseInt(variant.stockQuantity || "0", 10);
    return (
      !variant.size.trim() ||
      !variant.color.trim() ||
      Number.isNaN(parsedStock) ||
      parsedStock < 0
    );
  });

  if (invalidVariant) {
    return "Each fashion variant needs a size, color, and valid stock quantity.";
  }

  if (!formData.clothingSize.trim()) {
    return "Default clothing size is required.";
  }

  return null;
};

export const validateBlogPostPayload = (
  formData: BlogFormValidationShape
): string | null => {
  const requiredFieldError = validateRequiredFields([
    { label: "Title", value: formData.title },
    { label: "Excerpt", value: formData.excerpt },
    { label: "Content", value: formData.content },
    { label: "Author", value: formData.author },
    { label: "Category", value: formData.category },
  ]);

  if (requiredFieldError) {
    return requiredFieldError;
  }

  if (formData.title.trim().length < 3) {
    return "Title must be at least 3 characters long.";
  }

  if (formData.excerpt.trim().length < 10) {
    return "Excerpt should be at least 10 characters long.";
  }

  if (formData.content.trim().length < 30) {
    return "Content should be at least 30 characters long.";
  }

  return null;
};
