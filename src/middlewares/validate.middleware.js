const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    if (schema.body) {
      for (const [key, rules] of Object.entries(schema.body)) {
        const val = req.body[key];
        if (rules.required && (val === undefined || val === null || val === '')) {
          errors.push(`${key} is required.`);
        }
        if (rules.type && val !== undefined && typeof val !== rules.type) {
          errors.push(`${key} must be of type ${rules.type}.`);
        }
        if (rules.min && typeof val === 'string' && val.length < rules.min) {
          errors.push(`${key} must be at least ${rules.min} characters.`);
        }
        if (rules.email && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errors.push(`${key} must be a valid email address.`);
        }
      }
    }

    if (errors.length > 0) {
      return ApiResponse.error(res, 'Validation error', 400, errors);
    }

    next();
  };
};

module.exports = { validate };
