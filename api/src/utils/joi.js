const joi = require("@hapi/joi");

const validationOptions = { abortEarly: false, presence: "required" };

module.exports = { validationOptions };
