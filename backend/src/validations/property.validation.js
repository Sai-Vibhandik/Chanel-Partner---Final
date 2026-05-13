import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validation.middleware.js';

/**
 * Property Validation Schemas
 */

// Common validation for property details
const propertyDetailsValidation = [
  body('details.bedrooms')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('Bedrooms must be between 0 and 50'),

  body('details.bathrooms')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('Bathrooms must be between 0 and 50'),

  body('details.balconies')
    .optional()
    .isInt({ min: 0, max: 20 }).withMessage('Balconies must be between 0 and 20'),

  body('details.superBuiltUpArea')
    .optional()
    .isFloat({ min: 0 }).withMessage('Super built-up area must be a positive number'),

  body('details.builtUpArea')
    .optional()
    .isFloat({ min: 0 }).withMessage('Built-up area must be a positive number'),

  body('details.carpetArea')
    .optional()
    .isFloat({ min: 0 }).withMessage('Carpet area must be a positive number'),

  body('details.plotArea')
    .optional()
    .isFloat({ min: 0 }).withMessage('Plot area must be a positive number'),

  body('details.areaUnit')
    .optional()
    .isIn(['sqft', 'sqm']).withMessage('Area unit must be sqft or sqm'),

  body('details.totalFloors')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Total floors must be between 1 and 200'),

  body('details.floorNumber')
    .optional()
    .isInt({ min: 0, max: 200 }).withMessage('Floor number must be between 0 and 200'),

  body('details.furnishing')
    .optional()
    .isIn(['unfurnished', 'semifurnished', 'fullyfurnished'])
    .withMessage('Furnishing must be unfurnished, semifurnished, or fullyfurnished'),

  body('details.parking.covered')
    .optional()
    .isInt({ min: 0 }).withMessage('Covered parking must be a non-negative integer'),

  body('details.parking.open')
    .optional()
    .isInt({ min: 0 }).withMessage('Open parking must be a non-negative integer'),

  body('details.facing')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Facing cannot exceed 50 characters'),

  body('details.ageOfProperty')
    .optional()
    .isInt({ min: 0, max: 200 }).withMessage('Age of property must be between 0 and 200 years'),

  body('details.customAmenities')
    .optional()
    .isArray().withMessage('Custom amenities must be an array')
];

// Create Property Validation
export const validateCreateProperty = [
  // Basic Info
  body('name')
    .trim()
    .notEmpty().withMessage('Property name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Property name must be between 2 and 100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),

  body('type')
    .notEmpty().withMessage('Property type is required')
    .isIn(['apartment', 'villa', 'plot', 'commercial', 'office', 'retail', 'warehouse', 'land'])
    .withMessage('Invalid property type'),

  body('region')
    .notEmpty().withMessage('Region is required')
    .isIn(['india', 'dubai']).withMessage('Region must be india or dubai'),

  // Location
  body('location.address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),

  body('location.city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  body('location.state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),

  body('location.emirate')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Emirate cannot exceed 100 characters'),

  body('location.country')
    .trim()
    .notEmpty().withMessage('Country is required')
    .isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters'),

  body('location.zipCode')
    .optional()
    .trim()
    .matches(/^[0-9A-Z]{4,10}$/i).withMessage('Please enter a valid zip code'),

  body('location.landmark')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Landmark cannot exceed 200 characters'),

  body('location.mapUrl')
    .optional()
    .trim()
    .isURL().withMessage('Map URL must be a valid URL'),

  // Pricing
  body('pricing.basePrice')
    .notEmpty().withMessage('Base price is required')
    .isFloat({ min: 0 }).withMessage('Base price must be a positive number'),

  body('pricing.pricePerSqFt')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price per sq ft must be a positive number'),

  body('pricing.pricePerSqM')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price per sq m must be a positive number'),

  body('pricing.currency')
    .notEmpty().withMessage('Currency is required')
    .isIn(['INR', 'AED']).withMessage('Currency must be INR or AED'),

  body('pricing.priceOnRequest')
    .optional()
    .isBoolean().withMessage('Price on request must be a boolean'),

  body('pricing.bookingAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Booking amount must be a positive number'),

  body('pricing.maintenanceCharges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maintenance charges must be a positive number'),

  body('pricing.otherCharges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Other charges must be a positive number'),

  // Property Details
  ...propertyDetailsValidation,

  // India-specific details
  body('indiaDetails.reraNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('RERA number cannot exceed 50 characters'),

  body('indiaDetails.reraProjectName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('RERA project name cannot exceed 200 characters'),

  body('indiaDetails.reraWebsite')
    .optional()
    .isURL().withMessage('RERA website must be a valid URL'),

  body('indiaDetails.gstNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid GST number'),

  body('indiaDetails.ownershipType')
    .optional()
    .isIn(['freehold', 'leasehold', 'cooperative', 'powerofattorney'])
    .withMessage('Invalid ownership type'),

  body('indiaDetails.transactionType')
    .optional()
    .isIn(['newbooking', 'resale', 'rent'])
    .withMessage('Invalid transaction type'),

  body('indiaDetails.possessionStatus')
    .optional()
    .isIn(['underconstruction', 'readytomove', 'ocreceived'])
    .withMessage('Invalid possession status'),

  body('indiaDetails.possessionDate')
    .optional()
    .isISO8601().withMessage('Possession date must be a valid date'),

  body('indiaDetails.builderName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Builder name cannot exceed 200 characters'),

  // Dubai-specific details
  body('dubaiDetails.dldPermitNumber')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('DLD permit number cannot exceed 50 characters'),

  body('dubaiDetails.dldPropertyId')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('DLD property ID cannot exceed 50 characters'),

  body('dubaiDetails.developerName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Developer name cannot exceed 200 characters'),

  body('dubaiDetails.projectName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Project name cannot exceed 200 characters'),

  body('dubaiDetails.propertyStatus')
    .optional()
    .isIn(['offplan', 'ready', 'secondary'])
    .withMessage('Invalid property status'),

  body('dubaiDetails.completionDate')
    .optional()
    .isISO8601().withMessage('Completion date must be a valid date'),

  body('dubaiDetails.titleDeedNumber')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title deed number cannot exceed 100 characters'),

  body('dubaiDetails.serviceCharges')
    .optional()
    .isFloat({ min: 0 }).withMessage('Service charges must be a positive number'),

  body('dubaiDetails.ownershipType')
    .optional()
    .isIn(['freehold', 'leasehold'])
    .withMessage('Invalid ownership type'),

  // Commission
  body('commission.basePercentage')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Commission percentage must be between 0 and 100'),

  body('commission.isFixed')
    .optional()
    .isBoolean().withMessage('isFixed must be a boolean'),

  body('commission.fixedAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Fixed commission must be a positive number'),

  // Visibility
  body('visibility.type')
    .optional()
    .isIn(['all', 'selected', 'hidden'])
    .withMessage('Visibility type must be all, selected, or hidden'),

  body('visibility.showPrice')
    .optional()
    .isBoolean().withMessage('Show price must be a boolean'),

  body('visibility.showContact')
    .optional()
    .isBoolean().withMessage('Show contact must be a boolean'),

  body('visibility.partnerIds')
    .optional()
    .isArray().withMessage('Partner IDs must be an array')
    .custom((value) => {
      if (value && value.length > 0) {
        for (const id of value) {
          if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            throw new Error('Invalid partner ID format');
          }
        }
      }
      return true;
    }),

  handleValidationErrors
];

// Update Property Validation
export const validateUpdateProperty = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  // All fields are optional for update
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Property name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),

  body('type')
    .optional()
    .isIn(['apartment', 'villa', 'plot', 'commercial', 'office', 'retail', 'warehouse', 'land'])
    .withMessage('Invalid property type'),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid property status'),

  body('region')
    .optional()
    .isIn(['india', 'dubai']).withMessage('Region must be india or dubai'),

  // Pricing updates
  body('pricing.basePrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Base price must be a positive number'),

  body('pricing.currency')
    .optional()
    .isIn(['INR', 'AED']).withMessage('Currency must be INR or AED'),

  // Property details (same as create but all optional)
  ...propertyDetailsValidation.map(v => v.optional()),

  handleValidationErrors
];

// Get Property Validation
export const validateGetProperty = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  handleValidationErrors
];

// List Properties Validation
export const validateListProperties = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid status'),

  query('type')
    .optional()
    .isIn(['apartment', 'villa', 'plot', 'commercial', 'office', 'retail', 'warehouse', 'land'])
    .withMessage('Invalid property type'),

  query('region')
    .optional()
    .isIn(['india', 'dubai']).withMessage('Invalid region'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search query cannot exceed 200 characters'),

  handleValidationErrors
];

// Upload Property Image Validation
export const validateUploadPropertyImage = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  handleValidationErrors
];

// Update Property Status Validation
export const validateUpdatePropertyStatus = [
  param('id')
    .notEmpty().withMessage('Property ID is required')
    .isMongoId().withMessage('Invalid property ID'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['draft', 'active', 'sold_out', 'off_market'])
    .withMessage('Invalid status'),

  handleValidationErrors
];

export default {
  validateCreateProperty,
  validateUpdateProperty,
  validateGetProperty,
  validateListProperties,
  validateUploadPropertyImage,
  validateUpdatePropertyStatus
};