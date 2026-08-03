export function validateSchema(schema) {
  return function (req, res, next) {
    schema
      .validate(req.body, { abortEarly: false, stripUnknown: true })
      .then((data) => {
        req.body = data;
        next();
      })
      .catch((error) =>
        res.status(400).json({
          message: "Datos inválidos",
          errors: error.errors || [error.message],
        }),
      );
  };
}
