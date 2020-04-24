import joi from "@hapi/joi";
import { validationOptions } from "../../utils/joi";

const create = joi.object({
  name: joi.string().required(),
  email: joi
    .string()
    .email()
    .required(),
  password: joi
    .string()
    .min(8)
    .required(),
  repeat_password: joi
    .string()
    .min(8)
    .required()
});

const auth = joi.object({
  email: joi
    .string()
    .email()
    .required(),
  password: joi.string().required()
});

const update = joi
  .object({
    id: joi.string().required(),
    name: joi.string().optional(),
    email: joi.string().email().optional(),
    password: joi.string().min(8).optional()
  })
  .or("name", "email", "password");

const remove = joi.object({
  id: joi.string().required()
});

const get = joi.object({
  id: joi.string().required()
});

export default {
  create: value => create.validateAsync(value, validationOptions),
  update: value => update.validateAsync(value, validationOptions),
  delete: value => remove.validateAsync(value, validationOptions),
  auth: value => auth.validateAsync(value, validationOptions),
  get: value => get.validateAsync(value, validationOptions)
};
