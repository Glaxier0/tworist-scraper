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
    host: "localhost:3000", // Update with your server's host and port
    basePath: "/",
    schemes: ["http, https"], // Add the schemes your server supports (http, https, etc.)
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
        // Add tags if needed
        { name: "Hotel", description: "Endpoints related to hotels" },
        { name: "Auth", description: "Endpoints related to authentication" },
        { name: "Feedback", description: "Endpoints related to feedback" },
    ],
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
});