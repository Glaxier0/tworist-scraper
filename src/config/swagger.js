const swaggerAutogen = require('swagger-autogen')();
const outputFile = "../swagger_output.json";
const endpointsFiles = ['../routers/auth.js', '../routers/hotel.js', '../routers/feedback.js'];

const doc = {
    swagger: "2.0.0",
    info: {
        title: "2rist API Doc",
        description: "API documentation for 2rist app.",
        version: "1.0.0",
    },
    host: "localhost:3000",
    basePath: "/",
    schemes: ["http, https"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
        { name: "Hotels", description: "Endpoints related to hotels" },
        { name: "Auth", description: "Endpoints related to authentication" },
        { name: "Feedbacks", description: "Endpoints related to user feedback" },
    ],
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
});