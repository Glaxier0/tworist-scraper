const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});
const outputFile = "../swagger_output.json";
const endpointsFiles = ['../routers/auth.js', '../routers/hotel.js', '../routers/feedback.js'];

const doc = {
    info: {
        title: "2rist API Doc",
        description: "API documentation for 2rist app.",
        version: "1.0.0",
    },
    host: "localhost:3000",
    basePath: "/",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
        { name: "Hotels", description: "Endpoints related to hotels" },
        { name: "Auth", description: "Endpoints related to authentication" },
        { name: "Feedbacks", description: "Endpoints related to user feedback" },
    ],
    securityDefinitions: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
        }
    },
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
});